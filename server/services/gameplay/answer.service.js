const logger = require('../../utils/logger');
const sessionStore = require('../session/session.service');
const { SESSION_STATUS } = require('../../utils/sessionStateMachine');
const { compareAnswers } = require('../../utils/crypto');
const { calculateScore } = require('./scoring.engine');
const { scheduleNextAction } = require('../session/session.timer.service');
const { createQuestionStats, serializeQuestionStats } = require('./question.service');
const { 
    publishAnswerStats, 
    publishFastestUser, 
    publishStreakUpdate, 
    publishLeaderboardUpdate, 
} = require('./gameplay.publisher');

const calculateAnswerStats = async (roomCode, questionIndex) => {
    const session = await sessionStore.getSession(roomCode);
    if (!session) return null;

    const stats = session.currentQuestionStats;
    if (!stats) return null;

    const totalAnswers = stats.totalAnswers || 0;
    const correctCount = Object.values(stats.optionCounts || {}).reduce((sum, count) => {
        return sum + count;
    }, 0);

    return {
        questionIndex,
        questionId: stats.questionId,
        totalAnswers,
        correctCount,
        wrongCount: totalAnswers - correctCount,
        accuracy: totalAnswers > 0 ? ((correctCount / totalAnswers) * 100).toFixed(1) : 0,
        optionCounts: stats.optionCounts,
        fastestUser: stats.fastestUser ? { ...stats.fastestUser } : null,
    };
};

const submitAnswer = async ({ io, socket, roomCode, sessionId, questionId, selectedOption }) => {
    const user = socket.data.user;
    if (!user) return { error: 'Authentication required' };

    const socketRoom = roomCode || sessionId;
    if (!socketRoom) return { error: 'Session not found' };

    const session = await sessionStore.getSession(socketRoom);
    if (!session) return { error: 'Session not found', statusCode: 404 };

    if (session.status !== SESSION_STATUS.LIVE) {
        return { error: `Cannot submit answer in ${session.status} state`, statusCode: 409 };
    }

    if (session.isPaused) {
        return { error: 'Cannot submit answer while session is paused', statusCode: 409 };
    }

    const windowClosed = Date.now() > session.questionExpiry;
    const currentQuestionIndex = session.currentQuestionIndex;
    let question = session.questions?.[currentQuestionIndex];

    if (!question) {
        if (windowClosed) return { error: 'Answer window has closed' };
        return { error: 'Question not found' };
    }

    if (questionId && questionId.toString() !== question._id.toString()) {
        if (windowClosed) return { error: 'Answer window has closed' };
        return { error: 'Question mismatch' };
    }

    const questionLockKey = question._id?.toString?.() || String(currentQuestionIndex);
    const lockAcquired = await sessionStore.acquireAnswerLock(socketRoom, questionLockKey, user._id);
    if (!lockAcquired) return { ignored: true, reason: 'duplicate_submission' };

    if (windowClosed) return { error: 'Answer window has closed' };

    const rawTimeTaken = (Date.now() - session.questionStartTime) / 1000;
    const timeTaken = Math.min(Math.max(rawTimeTaken, 0), question.timeLimit);
    const isCorrect = compareAnswers(selectedOption, question.hashedCorrectAnswer);

    // Use template config snapshot if available, else fall back to defaults
    const scoringConfig = session.templateConfig?.scoring || null;
    const score = calculateScore({ isCorrect, timeTaken, maxTime: question.timeLimit, config: scoringConfig });

    const userStats = session.leaderboard[user._id] || {
        userId: user._id.toString(),
        name: user.name,
        score: 0,
        time: 0,
        streak: 0,
        bestStreak: 0,
    };
    userStats.score += score;
    userStats.time += timeTaken;
    userStats.streak = isCorrect ? (userStats.streak || 0) + 1 : 0;
    userStats.bestStreak = Math.max(userStats.bestStreak || 0, userStats.streak);
    session.leaderboard[user._id] = userStats;
    session.lastActivity = Date.now();

    const currentStats = session.currentQuestionStats || createQuestionStats(question);
    currentStats.questionId = question._id?.toString?.() || currentStats.questionId;
    const selectedKey = String(selectedOption);
    if (!Object.prototype.hasOwnProperty.call(currentStats.optionCounts, selectedKey)) {
        currentStats.optionCounts[selectedKey] = 0;
    }
    currentStats.optionCounts[selectedKey] += 1;
    currentStats.totalAnswers = (currentStats.totalAnswers || 0) + 1;

    if (!currentStats.fastestUser || timeTaken < currentStats.fastestUser.timeTaken) {
        currentStats.fastestUser = {
            userId: user._id.toString(),
            name: user.name,
            timeTaken,
            answer: selectedOption,
            score,
            isCorrect,
        };
    }

    session.currentQuestionStats = currentStats;
    session.totalSubmissions = (session.totalSubmissions || 0) + 1;
    await sessionStore.setSession(socketRoom, session);

    // 🔥 Background Persistence
    const statePersistence = require('../session/statePersistence');
    statePersistence.persistSubmission({
        userId: user._id,
        quizId: session.quizId,
        sessionId: session.sessionId || sessionId || null,
        roomCode: socketRoom,
        questionId: question._id,
        selectedOption,
        isCorrect,
        timeTaken,
        score,
    }).catch((err) => logger.error('Submission persistence failed', { error: err.message }));

    const leaderboard = Object.values(session.leaderboard)
        .sort((a, b) => b.score - a.score || a.time - b.time)
        .slice(0, 10);

    // 🔥 Use Publisher for all gameplay events
    publishAnswerStats(socketRoom, serializeQuestionStats(currentStats));
    publishFastestUser(socketRoom, currentStats.fastestUser);
    publishStreakUpdate(socketRoom, {
        userId: user._id.toString(),
        name: user.name,
        streak: userStats.streak,
        isCorrect,
        questionId: question._id?.toString()
    });
    
    // 🔥 Fire O(1) Analytics Update asynchronously
    const { handleAnswerIncrementalUpdate } = require('../analytics/realtime.analytics.service');
    handleAnswerIncrementalUpdate({
        sessionId: session.sessionId || sessionId || socketRoom,
        questionId: question._id,
        questionText: question.text,
        selectedOption: String(selectedOption),
        isCorrect,
        correctOption: question.options?.[question.correctOption] || null,
        explanation: question.explanation || '',
        responseTime: timeTaken
    }).catch(err => logger.error('Incremental Analytics failed', { error: err.message }));
    
    publishLeaderboardUpdate(socketRoom, leaderboard);

    // NOTE: answer:result is emitted by the calling socket handler (question.handler.js
    // or quiz.socket.js), NOT here. Emitting here too caused a double-emit race condition
    // where the client saw two answer:result events with different field shapes.

    const participantsCount = Object.keys(session.participants || {}).length;
    if (currentStats.totalAnswers >= participantsCount && session.mode === 'auto') {
        io.to(socketRoom).emit('question:end');
        scheduleNextAction(socketRoom, 'advance', 1000); 
    }

    return {
        room: socketRoom,
        isCorrect,
        correctAnswer: question.options?.[question.correctOption] ?? null,
        timeTaken,
        score,
        totalScore: userStats.score,
        streak: userStats.streak,
        bestStreak: userStats.bestStreak,
        leaderboard,
    };
};

module.exports = {
    calculateAnswerStats,
    submitAnswer,
};
