const Quiz = require('../../models/Quiz');
const QuizSession = require('../../models/QuizSession');
const logger = require('../../utils/logger');
const sessionStore = require('./session.service');
const { SESSION_STATUS, assertWaitingSessionExists, assertTransition, normalizeSessionStatus } = require('../../utils/sessionStateMachine');
const { clearTimers, scheduleNextAction, emitTimerTick } = require('./session.timer.service');
const { addSequenceNumber } = require('./session.realtime.service');
const { broadcastQuestionEnhanced } = require('../gameplay/question.service');
const { resolveQuizActionContext, findQuizAndActiveSession } = require('../quiz/quiz.utils.service');
const messageBatcher = require('../../utils/messageBatching');

const startQuizSession = async ({ io, quizId, roomCode, sessionId, user }) => {
    const context = quizId
        ? await resolveQuizActionContext({ user, quizId, sessionCode: roomCode, sessionId })
        : await findQuizAndActiveSession(String(roomCode || '').toUpperCase(), sessionId);

    if (context.error) return context;

    const quiz = context.quiz;
    const liveSession = context.liveSession;
    if (!quiz) return { error: 'Quiz not found' };

    const quizStatus = normalizeSessionStatus(quiz.status);

    const session = liveSession ? await QuizSession.findById(liveSession._id) : null;
    try {
        assertWaitingSessionExists(session);
        assertTransition(session.status, SESSION_STATUS.LIVE, 'session');
        assertTransition(quizStatus, SESSION_STATUS.LIVE, 'quiz');
    } catch (error) {
        return { error: error.message, statusCode: 409 };
    }

    const statePersistence = require('./statePersistence');
    try {
        await statePersistence.executeInTransaction(async (dbSession) => {
            await QuizSession.findByIdAndUpdate(session._id, { status: SESSION_STATUS.LIVE }, { session: dbSession });
            await Quiz.findByIdAndUpdate(quiz._id, { status: SESSION_STATUS.LIVE, lastSessionCode: session.sessionCode }, { session: dbSession });
            return { session, quiz };
        }, { operation: 'startQuizSession', sessionCode: session.sessionCode, quizId: quiz._id });
    } catch (error) {
        logger.error('Failed to persist session start', { error: error.message });
        return { error: 'Failed to start session', statusCode: 500 };
    }

    // Emit session:start outside the transaction for better performance and reliability
    io.to(session.sessionCode).emit('session:start', { roomCode: session.sessionCode, status: 'live' });

    const socketRoom = session.sessionCode;
    const existingState = await sessionStore.getSession(socketRoom);
    const sessionState = {
        status: SESSION_STATUS.LIVE,
        mode: (quiz.mode === 'teaching' || quiz.mode === 'tutor') ? 'tutor' : 'auto',
        isPaused: false,
        currentQuestionIndex: 0,
        participants: existingState?.participants || {},
        leaderboard: existingState?.leaderboard || {},
        quizId: quiz._id.toString(),
        sessionId: session._id.toString(),
        questions: (session.templateSnapshot?.questions || quiz.questions || []).map(q => q.toObject?.() ?? q),
        lastActivity: Date.now(),
        participantLimit: existingState?.participantLimit || 50,
        interQuestionDelay: (quiz.interQuestionDelay ?? 1.5) * 1000,
        sequenceNumber: 0,
    };

    // ── Snapshot template config (always read from snapshot, never live) ────
    let templateConfig = null;
    try {
        const { getDefaultTemplate } = require('../quiz/template.service');
        templateConfig = await getDefaultTemplate(quiz.hostId || user._id);
    } catch (err) {
        logger.warn('[SessionStart] Could not load template config — using defaults', { error: err.message });
    }

    await sessionStore.setSession(socketRoom, sessionState);

    // Persist template snapshot into the session so scoring engine can read it
    if (templateConfig) {
        const updatedSession = await sessionStore.getSession(socketRoom);
        if (updatedSession) {
            updatedSession.templateConfig = {
                scoring:     templateConfig.scoring,
                timer:       templateConfig.timer,
                leaderboard: templateConfig.leaderboard,
                flow:        templateConfig.flow,
                access:      templateConfig.access,
                advanced:    templateConfig.advanced,
                _templateId: templateConfig._id?.toString?.(),
                _templateName: templateConfig.name,
            };
            await sessionStore.setSession(socketRoom, updatedSession);
        }
    }

    if (quiz.roomCode && socketRoom !== quiz.roomCode) {
        io.to(quiz.roomCode).emit('session_redirect', { roomCode: socketRoom, sessionId: session._id.toString() });
    }

    setTimeout(() => {
        broadcastQuestionEnhanced(io, socketRoom).catch(err => {
            logger.error('Initial broadcast failed', { error: err.message });
        });
    }, 500);

    return { roomCode: socketRoom, sessionId: session._id.toString(), quiz, session: sessionState };
};

const pauseQuizSession = async ({ io, quizId, sessionCode, user }) => {
    const context = await resolveQuizActionContext({ user, quizId, sessionCode });
    if (context.error) return context;

    const { quiz, roomCode } = context;
    const session = await sessionStore.getSession(roomCode);
    if (!session || session.isPaused) return { error: 'Session not found or already paused', statusCode: 409 };

    session.isPaused = true;
    session.pausedAt = Date.now();
    session.timeLeftOnPause = (session.questionExpiry || 0) - Date.now();
    await clearTimers(roomCode);
    await sessionStore.setSession(roomCode, session);

    await QuizSession.findOneAndUpdate({ sessionCode: roomCode, quizId: quiz._id }, { isPaused: true });
    
    const pausePayload = await addSequenceNumber(roomCode, { message: 'Host paused the quiz', isPaused: true });
    io.to(roomCode).emit('quiz_paused', pausePayload);
    return { roomCode, message: 'Quiz paused' };
};

const resumeQuizSession = async ({ io, quizId, sessionCode, user }) => {
    const context = await resolveQuizActionContext({ user, quizId, sessionCode });
    if (context.error) return context;

    const { quiz, roomCode } = context;
    const session = await sessionStore.getSession(roomCode);
    if (!session || !session.isPaused) return { error: 'Session not found or not paused', statusCode: 409 };

    session.isPaused = false;
    if (session.timeLeftOnPause > 0) {
        session.questionExpiry = Date.now() + session.timeLeftOnPause;
    }

    await sessionStore.setSession(roomCode, session);
    if (session.questionExpiry && typeof emitTimerTick === 'function') {
        await emitTimerTick(io, roomCode);
    }

    if (session.mode === 'auto' && session.status === SESSION_STATUS.LIVE) {
        const remaining = Math.max(0, session.timeLeftOnPause || 0);
        await sessionStore.registerDistributedTimer(`${roomCode}:advance`, Date.now() + remaining);
    }

    await QuizSession.findOneAndUpdate({ sessionCode: roomCode, quizId: quiz._id }, { isPaused: false });
    
    const resumePayload = await addSequenceNumber(roomCode, { expiry: session?.questionExpiry || null, isPaused: false });
    io.to(roomCode).emit('quiz_resumed', resumePayload);
    return { roomCode, message: 'Quiz resumed' };
};

const endQuizSession = async ({ io, quizId, sessionCode, user }) => {
    const context = await resolveQuizActionContext({ user, quizId, sessionCode });
    if (context.error) return context;

    const { quiz, roomCode } = context;
    const session = await sessionStore.getSession(roomCode);

    if (session) {
        session.status = SESSION_STATUS.COMPLETED;
        session.questionState = 'waiting';
        await clearTimers(roomCode);
        await sessionStore.setSession(roomCode, session);
    }

    const topWinners = Object.values(session?.leaderboard || {})
        .sort((a, b) => b.score - a.score || a.time - b.time)
        .slice(0, 10)
        .map((p, index) => ({ name: p.name, score: p.score, time: p.time, rank: index + 1 }));

    const endedAt = new Date();
    const startedAt = session?.startedAt ? new Date(session.startedAt) : quiz.updatedAt;
    const sessionDuration = Math.floor((endedAt - startedAt) / 1000);

    const metrics = {
        peakParticipants: session?.peakParticipants || 0,
        totalSubmissions: session?.totalSubmissions || 0,
        sessionDuration: Math.max(0, sessionDuration),
        participantCount: Object.keys(session?.participants || {}).length
    };

    const statePersistence = require('./statePersistence');
    try {
        await statePersistence.executeInTransaction(async (dbSession) => {
            await QuizSession.findOneAndUpdate(
                { sessionCode: roomCode }, 
                { 
                    status: SESSION_STATUS.COMPLETED, 
                    endedAt, 
                    topWinners, 
                    ...metrics 
                }, 
                { session: dbSession }
            );
            await Quiz.findByIdAndUpdate(quiz._id, { status: SESSION_STATUS.COMPLETED, lastSessionCode: roomCode, lastSessionStatus: SESSION_STATUS.COMPLETED, lastSessionEndedAt: endedAt }, { session: dbSession });
            return { roomCode };
        }, { operation: 'endQuizSession', roomCode, quizId: quiz._id });
    } catch (error) {
        logger.error('Failed to persist quiz end', { error: error.message });
        return { error: 'Failed to end session', statusCode: 500 };
    }

    io.to(roomCode).emit('quiz_ended_by_host', { message: 'Host ended the quiz', topWinners, metrics });
    return { roomCode, message: 'Quiz ended', topWinners, metrics };
};

const abortQuizSession = async ({ io, quizId, sessionCode, user, message = 'Admin aborted the quiz.' }) => {
    const context = quizId
        ? await resolveQuizActionContext({ user, quizId, sessionCode })
        : await findQuizAndActiveSession(sessionCode);

    if (context.error) return context;

    const { quiz, liveSession, roomCode: targetSessionCode } = context;
    const endedAt = new Date();

    const statePersistence = require('./statePersistence');
    try {
        await statePersistence.executeInTransaction(async (dbSession) => {
            if (liveSession?._id) await QuizSession.findByIdAndUpdate(liveSession._id, { status: 'aborted', endedAt }, { session: dbSession });
            if (quiz?._id) await Quiz.findByIdAndUpdate(quiz._id, { status: SESSION_STATUS.ABORTED, lastSessionCode: targetSessionCode || quiz.roomCode, lastSessionStatus: 'aborted', lastSessionEndedAt: endedAt, lastSessionMessage: message }, { session: dbSession });
            return { liveSession, quiz };
        }, { operation: 'abortQuizSession', sessionCode: targetSessionCode, quizId: quiz?._id });
    } catch (error) {
        logger.error('Failed to persist session abort', { error: error.message });
        return { error: 'Failed to abort session', statusCode: 500 };
    }

    const rooms = [targetSessionCode, quiz?.roomCode].filter(Boolean);
    for (const room of rooms) {
        io.to(room).emit('quiz_aborted', { message, roomCode: room, quizId: quiz?._id || null, endedAt: endedAt.toISOString() });
        await sessionStore.deleteSession(room);
        messageBatcher.clear(room);
    }

    setTimeout(() => rooms.forEach(room => io.in(room).socketsLeave(room)), 100);
    return { quiz, liveSession, sessionCode: targetSessionCode };
};

const rebootQuizzes = async (io) => {
    try {
        const sessionRecovery = require('./sessionRecovery');
        await sessionRecovery.restoreActiveSessions(io);
        
        const ongoingSessions = await QuizSession.find({ status: { $in: [SESSION_STATUS.WAITING, SESSION_STATUS.LIVE] } });
        for (const quizSession of ongoingSessions) {
            const session = await sessionStore.getSession(quizSession.sessionCode);
            if (session?.status === SESSION_STATUS.LIVE && session.mode === 'auto' && !session.isPaused) {
                const timeLeft = session.questionExpiry - Date.now();
                scheduleNextAction(quizSession.sessionCode, 'advance', Math.max(0, timeLeft));
            }
        }
    } catch (error) {
        logger.error('Quiz session reboot failed', { error: error.message });
    }
};

const revealAnswer = async ({ io, roomCode, user }) => {
    if (user?.role !== 'host' && user?.role !== 'admin') return { error: 'Unauthorized' };

    const session = await sessionStore.getSession(roomCode);
    if (!session || session.questionState !== 'review') return { error: 'Question review phase not active' };

    const question = session.questions?.[session.currentQuestionIndex];
    if (!question) return { error: 'Question not found' };

    io.to(roomCode).emit('show_correct_answer', {
        correctAnswer: question.correctAnswer || question.options[0],
        explanation: question.explanation || 'Check the correct answer above',
        questionId: question._id || null,
    });

    return { roomCode, message: 'Answer revealed' };
};

module.exports = {
    startQuizSession,
    pauseQuizSession,
    resumeQuizSession,
    endQuizSession,
    abortQuizSession,
    rebootQuizzes,
    revealAnswer,
};
