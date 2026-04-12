const mongoose = require('mongoose');
const axios = require('axios');
const Quiz = require('../models/Quiz');
const QuizSession = require('../models/QuizSession');
const Submission = require('../models/Submission');
const { compareAnswers } = require('../utils/crypto');
const { calculateScore } = require('../utils/scoring');
const logger = require('../utils/logger');
const sessionStore = require('./session.service');
const { getPlanConfig } = require('../config/plans');
const { SESSION_STATUS, assertWaitingSessionExists, canTransition, normalizeSessionStatus } = require('../utils/sessionStateMachine');

const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:5001';
const ALLOWED_QUIZ_CATEGORIES = ['regular', 'internal', 'external', 'subject-syllabus', 'hackathon', 'interview'];

const activeTimers = new Map();
const activeTickTimers = new Map();

const buildQuizAccessQuery = (user, id, extra = {}) => (
    user.role === 'admin'
        ? { _id: id, ...extra }
        : { _id: id, organizerId: user._id, ...extra }
);

const buildOrganizerScopeQuery = (user, extra = {}) => (
    user.role === 'admin'
        ? { ...extra }
        : { organizerId: user._id, ...extra }
);

const shuffleArray = (items) => {
    const array = [...items];
    for (let i = array.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

const createQuestionStats = (question) => {
    const optionCounts = {};
    for (const option of question?.options || []) {
        optionCounts[String(option)] = 0;
    }

    return {
        questionId: question?._id?.toString?.() || null,
        optionCounts,
        totalAnswers: 0,
        fastestUser: null,
    };
};

const serializeQuestionStats = (stats) => {
    if (!stats) return null;

    return {
        questionId: stats.questionId || null,
        optionCounts: { ...(stats.optionCounts || {}) },
        totalAnswers: stats.totalAnswers || 0,
        fastestUser: stats.fastestUser ? { ...stats.fastestUser } : null,
    };
};

const formatQuestion = (question, index, total, expiry) => {
    const options = question.shuffleOptions
        ? shuffleArray([...question.options])
        : [...question.options];

    return {
        _id: question._id,
        text: question.text,
        options,
        timeLimit: question.timeLimit,
        mediaUrl: question.mediaUrl,
        questionType: question.questionType,
        index,
        total,
        expiry,
    };
};

const getSubjectLeaderboardData = async (subjectId) => {
    const quizzes = await Quiz.find({ parentId: subjectId }).select('_id').lean();
    const quizIds = quizzes.map((quiz) => quiz._id);

    return Submission.aggregate([
        { $match: { quizId: { $in: quizIds } } },
        { $group: { _id: '$userId', totalScore: { $sum: '$score' }, totalTime: { $sum: '$timeTaken' }, quizzesTaken: { $addToSet: '$quizId' } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $project: { name: '$user.name', score: '$totalScore', time: '$totalTime', count: { $size: '$quizzesTaken' } } },
        { $sort: { score: -1, time: 1 } },
        { $limit: 10 },
    ]);
};

const findQuizAndActiveSession = async (roomCode, sessionId) => {
    let liveSession = null;

    if (sessionId) {
        liveSession = await QuizSession.findById(sessionId).lean();
    }

    if (!liveSession && roomCode) {
        liveSession = await QuizSession.findOne({ sessionCode: roomCode }).lean();
    }

    let quiz = null;
    if (liveSession) {
        quiz = await Quiz.findById(liveSession.quizId)
            .select('title roomCode isPaid price organizerId parentId mode interQuestionDelay shuffleQuestions questions')
            .lean();
    } else if (roomCode) {
        quiz = await Quiz.findOne({ roomCode })
            .select('title roomCode isPaid price organizerId parentId mode interQuestionDelay shuffleQuestions questions')
            .lean();
    }

    if (!quiz) {
        return { quiz: null, liveSession: null, effectiveRoomCode: roomCode };
    }

    if (!liveSession) {
        liveSession = await QuizSession.findOne({ quizId: quiz._id, status: { $in: [SESSION_STATUS.SCHEDULED, SESSION_STATUS.WAITING, SESSION_STATUS.LIVE] } })
            .sort({ startedAt: -1 })
            .lean();
    }

    return {
        quiz,
        liveSession,
        effectiveRoomCode: liveSession?.sessionCode || quiz.roomCode || roomCode,
    };
};

const resolveQuizActionContext = async ({ user, quizId, sessionCode, sessionId }) => {
    if (quizId) {
        const quiz = await Quiz.findById(quizId).lean();
        if (!quiz) return { error: 'Quiz not found', statusCode: 404 };
        if (user.role !== 'admin' && String(quiz.organizerId) !== String(user._id)) {
            return { error: 'Forbidden', statusCode: 403 };
        }

        const liveSession = sessionCode
            ? await QuizSession.findOne({ sessionCode, quizId: quiz._id }).lean()
            : await QuizSession.findOne({ quizId: quiz._id, status: { $in: [SESSION_STATUS.SCHEDULED, SESSION_STATUS.WAITING, SESSION_STATUS.LIVE, 'ongoing'] } }).sort({ startedAt: -1 }).lean();

        if (sessionCode && !liveSession) {
            return { error: 'Session not found', statusCode: 404 };
        }

        const roomCode = liveSession?.sessionCode || sessionCode || quiz.lastSessionCode || quiz.roomCode;
        return { quiz, liveSession, roomCode };
    }

    const resolved = await findQuizAndActiveSession(sessionCode, sessionId);
    if (!resolved.quiz) return { error: 'Quiz not found', statusCode: 404 };

    return {
        quiz: resolved.quiz,
        liveSession: resolved.liveSession,
        roomCode: resolved.liveSession?.sessionCode || resolved.effectiveRoomCode,
    };
};

const ensureParticipantHasPaidAccess = async (token, quizId) => {
    if (!token || !quizId) return false;

    const response = await axios.get(`${PAYMENT_SERVICE_URL}/payment/status/${quizId}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
    });

    return Boolean(response.data?.data?.paid);
};

const mergeParticipantMaps = (primary = {}, secondary = {}) => ({
    ...secondary,
    ...primary,
});

const clearTimers = (roomCode) => {
    if (activeTimers.has(roomCode)) {
        clearTimeout(activeTimers.get(roomCode));
        activeTimers.delete(roomCode);
    }

    const delayKey = `${roomCode}:delay`;
    if (activeTimers.has(delayKey)) {
        clearTimeout(activeTimers.get(delayKey));
        activeTimers.delete(delayKey);
    }

    const tickKey = `${roomCode}:tick`;
    if (activeTickTimers.has(tickKey)) {
        clearInterval(activeTickTimers.get(tickKey));
        activeTickTimers.delete(tickKey);
    }
};

const clearTickTimer = (roomCode) => {
    const tickKey = `${roomCode}:tick`;
    if (activeTickTimers.has(tickKey)) {
        clearInterval(activeTickTimers.get(tickKey));
        activeTickTimers.delete(tickKey);
    }
};

const emitTimerTick = async (io, roomCode) => {
    const session = await sessionStore.getSession(roomCode);
    if (!session || !session.questionExpiry) return null;

    const timeLeft = Math.max(0, Math.floor((session.questionExpiry - Date.now()) / 1000));
    io.to(roomCode).emit('timer_tick', timeLeft);
    return timeLeft;
};

const startTimerTicks = async (io, roomCode) => {
    const tickKey = `${roomCode}:tick`;
    if (activeTickTimers.has(tickKey)) {
        clearInterval(activeTickTimers.get(tickKey));
        activeTickTimers.delete(tickKey);
    }

    const pushTick = async () => {
        const timeLeft = await emitTimerTick(io, roomCode);
        if (timeLeft === null || timeLeft <= 0) {
            clearTickTimer(roomCode);
        }
    };

    await pushTick();

    const interval = setInterval(() => {
        pushTick().catch((error) => {
            logger.warn('Timer tick emission failed', { roomCode, error: error.message });
        });
    }, 1000);

    activeTickTimers.set(tickKey, interval);
};

const resolveSessionRoomCode = async (roomCode, sessionId) => {
    if (roomCode) {
        const byRoomCode = await sessionStore.getSession(roomCode);
        if (byRoomCode) return roomCode;
    }

    if (sessionId) {
        const bySessionId = await sessionStore.getSession(sessionId);
        if (bySessionId) return sessionId;

        if (mongoose.Types.ObjectId.isValid(sessionId)) {
            const dbSession = await QuizSession.findById(sessionId).select('sessionCode').lean();
            if (dbSession?.sessionCode) {
                return dbSession.sessionCode;
            }
        }
    }

    return roomCode || sessionId || null;
};

const broadcastQuestion = async (io, roomCode) => {
    // Delegate to enhanced version for consistent behavior across all modes
    return broadcastQuestionEnhanced(io, roomCode);
};

const buildRoomState = (session, roomCode) => {
    const participants = Object.values(session.participants || {});
    const leaderboard = Object.values(session.leaderboard || {})
        .sort((a, b) => b.score - a.score || a.time - b.time)
        .slice(0, 10);

    const isLive = session.status === SESSION_STATUS.LIVE;
    const question = isLive ? session.questions?.[session.currentQuestionIndex] : null;
    const currentQuestion = question
        ? formatQuestion(question, session.currentQuestionIndex, session.questions.length, session.questionExpiry)
        : null;

    return {
        roomCode,
        participants,
        leaderboard,
        currentQuestion,
        answerStats: isLive ? serializeQuestionStats(session.currentQuestionStats) : null,
        fastestUser: isLive && session.currentQuestionStats?.fastestUser ? { ...session.currentQuestionStats.fastestUser } : null,
        participantCount: participants.length,
        timeLeft: isLive && session.questionExpiry ? Math.max(0, Math.floor((session.questionExpiry - Date.now()) / 1000)) : null,
        expiry: isLive ? (session.questionExpiry || null) : null,
        status: session.status || SESSION_STATUS.DRAFT,
    };
};

const joinRoom = async ({ io, socket, roomCode, sessionId }) => {
    const user = socket.data.user;
    if (!user) return { error: 'Authentication required' };
    if (!roomCode && !sessionId) return { error: 'Room code or session id is required' };

    const { quiz, liveSession, effectiveRoomCode } = await findQuizAndActiveSession(roomCode, sessionId);
    if (!quiz) return { error: 'Quiz not found' };

    if (!liveSession && [SESSION_STATUS.SCHEDULED, SESSION_STATUS.WAITING, SESSION_STATUS.LIVE].includes(quiz.status)) {
        return { error: 'Cannot join waiting without session' };
    }

    const token = socket.data.token;
    const socketRoom = liveSession?.sessionCode || effectiveRoomCode;

    if (quiz?.accessType === 'private' && !['organizer', 'admin'].includes(user.role)) {
        const allowedEmails = new Set((quiz.allowedEmails || []).map((email) => String(email || '').trim().toLowerCase()));
        const email = String(user?.email || '').trim().toLowerCase();
        if (!email || !allowedEmails.has(email)) {
            return { error: 'Private quiz: only invited emails can join this room.' };
        }
    }

    if (quiz?.isPaid && !['organizer', 'admin'].includes(user.role)) {
        let hasPaidAccess = false;
        try {
            hasPaidAccess = await ensureParticipantHasPaidAccess(token, quiz._id);
        } catch (paymentError) {
            logger.warn('Socket join_room payment check failed', { userId: user._id, quizId: quiz._id, error: paymentError.message });
        }

        if (!hasPaidAccess) return { error: 'Payment required to join this quiz.' };
    }

    socket.join(socketRoom);
    if (sessionId && roomCode && socketRoom === sessionId) {
        socket.leave(roomCode);
    }

    let session = await sessionStore.getSession(socketRoom);
    if (!session) {
        session = {
            status: SESSION_STATUS.DRAFT,
            participants: {},
            leaderboard: {},
            lastActivity: Date.now(),
            participantLimit: 50,
        };
    }

    if (quiz?.roomCode && socketRoom !== quiz.roomCode) {
        const waitingSession = await sessionStore.getSession(quiz.roomCode);
        if (waitingSession?.participants) {
            session.participants = mergeParticipantMaps(session.participants, waitingSession.participants);
        }
    }

    if (user.role === 'organizer') {
        try {
            const subscription = await mongoose.connection.db.collection('subscriptions').findOne({
                hostId: new mongoose.Types.ObjectId(user._id),
                status: 'active',
            });
            const plan = subscription ? subscription.plan : 'FREE';
            const planConfig = getPlanConfig(plan);
            session.participantLimit = subscription?.participantLimit || planConfig.participants;
        } catch {
            session.participantLimit = getPlanConfig('FREE').participants;
        }
    }

    if (user.role !== 'organizer') {
        const currentCount = Object.keys(session.participants || {}).length;
        if (!session.participants[user._id] && currentCount >= (session.participantLimit || 50)) {
            return { error: 'Upgrade your plan' };
        }

        session.participants[user._id] = { _id: user._id, name: user.name, role: user.role };
    }

    session.lastActivity = Date.now();
    session.quizId = session.quizId || quiz._id?.toString?.() || quiz._id;
    session.sessionId = session.sessionId || liveSession?._id?.toString?.() || null;
    session.subjectRoom = session.subjectRoom || (quiz.parentId ? `subject_${quiz.parentId.toString()}` : null);
    session.questions = session.questions || quiz.questions || [];

    await sessionStore.setSession(socketRoom, session);

    return {
        roomCode: socketRoom,
        quiz,
        liveSession,
        session,
        state: buildRoomState(session, socketRoom),
    };
};

const startQuizSession = async ({ io, quizId, roomCode, sessionId, user }) => {
    const context = quizId
        ? await resolveQuizActionContext({ user, quizId, sessionCode: roomCode, sessionId })
        : await findQuizAndActiveSession(roomCode, sessionId);

    if (context.error) return context;

    const quiz = context.quiz;
    const liveSession = context.liveSession;
    if (!quiz) return { error: 'Quiz not found' };

    const quizStatus = normalizeSessionStatus(quiz.status);

    if (user?.role !== 'admin' && user?._id && quiz.organizerId?.toString?.() !== user._id.toString()) {
        return { error: 'Forbidden', statusCode: 403 };
    }

    const session = liveSession
        ? await QuizSession.findById(liveSession._id)
        : null;

    try {
        assertWaitingSessionExists(session);
    } catch (error) {
        return { error: error.message, statusCode: 409 };
    }

    if (session.status === SESSION_STATUS.COMPLETED || session.status === SESSION_STATUS.ABORTED) {
        return { error: `Session is ${session.status}`, statusCode: 409 };
    }

    if (session.status === SESSION_STATUS.DRAFT) {
        return { error: 'Cannot go from draft to live directly', statusCode: 409 };
    }

    if (!canTransition(session.status, SESSION_STATUS.LIVE)) {
        return { error: `Invalid session state transition: ${session.status} -> ${SESSION_STATUS.LIVE}`, statusCode: 409 };
    }

    if (!canTransition(quizStatus, SESSION_STATUS.LIVE)) {
        return { error: `Invalid quiz state transition: ${quizStatus} -> ${SESSION_STATUS.LIVE}`, statusCode: 409 };
    }

    session.status = SESSION_STATUS.LIVE;
    await session.save();
    await Quiz.findByIdAndUpdate(quiz._id, { status: SESSION_STATUS.LIVE, lastSessionCode: session.sessionCode });

    const socketRoom = session.sessionCode;
    const sessionState = {
        status: SESSION_STATUS.LIVE,
        mode: quiz.mode || 'auto',
        isPaused: false,
        currentQuestionIndex: 0,
        participants: {},
        leaderboard: {},
        quizId: quiz._id.toString(),
        sessionId: session._id.toString(),
        waitingRoomCode: quiz.roomCode || null,
        subjectRoom: quiz.parentId ? `subject_${quiz.parentId.toString()}` : null,
        questions: quiz.questions.map((question) => ({ ...question.toObject?.() ?? question })),
        lastActivity: Date.now(),
        participantLimit: 50,
        interQuestionDelay: (quiz.interQuestionDelay ?? 5) * 1000,
    };

    await sessionStore.setSession(socketRoom, sessionState);

    return {
        roomCode: socketRoom,
        waitingRoomCode: quiz.roomCode || null,
        sessionId: session._id.toString(),
        quiz,
        session: sessionState,
    };
};

const submitAnswer = async ({ io, socket, roomCode, sessionId, questionId, selectedOption }) => {
    const user = socket.data.user;
    if (!user) return { error: 'Authentication required' };

    const socketRoom = await resolveSessionRoomCode(roomCode, sessionId);
    if (!socketRoom) return { error: 'Session not found' };

    const session = await sessionStore.getSession(socketRoom);
    if (!session || session.status !== SESSION_STATUS.LIVE) {
        return { error: 'Quiz not active' };
    }

    // Check if answer window is closed early - provides better error semantics
    // for late submissions that arrive after question has been advanced
    const windowClosed = Date.now() > session.questionExpiry;

    const currentQuestionIndex = session.currentQuestionIndex;
    let question = session.questions?.[currentQuestionIndex];
    
    if (!question) {
      // If current question not found, it could be due to advancement after window close
      if (windowClosed) {
        return { error: 'Answer window has closed' };
      }
      return { error: 'Question not found' };
    }

    // Secondary check: verify question ID match if provided
    if (questionId && questionId.toString() !== question._id.toString()) {
        // This could also indicate a late submission to a previous question
        if (windowClosed) {
          return { error: 'Answer window has closed' };
        }
        return { error: 'Question mismatch' };
    }

    const questionLockKey = question._id?.toString?.() || String(currentQuestionIndex);
    const lockAcquired = await sessionStore.acquireAnswerLock(socketRoom, questionLockKey, user._id);
    if (!lockAcquired) return { ignored: true, reason: 'duplicate_submission' };

    // Final expiry check before processing
    if (windowClosed) return { error: 'Answer window has closed' };

    const rawTimeTaken = (Date.now() - session.questionStartTime) / 1000;
    const timeTaken = Math.min(Math.max(rawTimeTaken, 0), question.timeLimit);
    const isCorrect = compareAnswers(selectedOption, question.hashedCorrectAnswer);
    const score = calculateScore(isCorrect, timeTaken, question.timeLimit);

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

    await sessionStore.setSession(socketRoom, session);

    await Submission.create({
        userId: user._id,
        quizId: session.quizId,
        sessionId: session.sessionId || sessionId || null,
        roomCode: socketRoom,
        questionId: question._id,
        selectedOption,
        isCorrect,
        timeTaken,
        score,
    }).catch((err) => logger.error('Submission DB write failed', { userId: user._id, socketRoom, error: err.message }));

    const leaderboard = Object.values(session.leaderboard)
        .sort((a, b) => b.score - a.score || a.time - b.time)
        .slice(0, 10);

    io.to(socketRoom).emit('answer_stats', serializeQuestionStats(currentStats));
    io.to(socketRoom).emit('fastest_user', currentStats.fastestUser ? { ...currentStats.fastestUser } : null);
    io.to(socketRoom).emit('streak_update', {
        userId: user._id.toString(),
        name: user.name,
        streak: userStats.streak,
        bestStreak: userStats.bestStreak,
        isCorrect,
        questionId: question._id?.toString?.() || null,
    });

    if (session.subjectRoom) {
        const subjectId = session.subjectRoom.replace('subject_', '');
        const subjectLeaderboard = await getSubjectLeaderboardData(subjectId);
        io.to(session.subjectRoom).emit('subject_score_update', subjectLeaderboard);
    }

    return {
        room: socketRoom,
        isCorrect,
        score,
        totalScore: userStats.score,
        streak: userStats.streak,
        bestStreak: userStats.bestStreak,
        leaderboard,
    };
};

const pauseQuizSession = async ({ io, quizId, sessionCode, user }) => {
    const context = await resolveQuizActionContext({ user, quizId, sessionCode });
    if (context.error) return context;

    const { quiz, roomCode } = context;
    if (!roomCode) return { error: 'Active session not found' };

    const session = await sessionStore.getSession(roomCode);
    if (session) {
        session.isPaused = true;
        session.pausedAt = Date.now();
        session.timeLeftOnPause = (session.questionExpiry || 0) - Date.now();
        clearTimers(roomCode);
        await sessionStore.setSession(roomCode, session);
    }

    await QuizSession.findOneAndUpdate({ sessionCode: roomCode, quizId: quiz._id }, { isPaused: true });
    io.to(roomCode).emit('quiz_paused', { message: 'Host paused the quiz' });
    return { roomCode, message: 'Quiz paused' };
};

const resumeQuizSession = async ({ io, quizId, sessionCode, user }) => {
    const context = await resolveQuizActionContext({ user, quizId, sessionCode });
    if (context.error) return context;

    const { quiz, roomCode } = context;
    if (!roomCode) return { error: 'Active session not found' };

    const session = await sessionStore.getSession(roomCode);
    if (session) {
        session.isPaused = false;
        if (session.timeLeftOnPause > 0) {
            session.questionExpiry = Date.now() + session.timeLeftOnPause;
        }

        await sessionStore.setSession(roomCode, session);
        if (session.questionExpiry) {
            await emitTimerTick(io, roomCode);
        }

        if (session.mode === 'auto' && session.status === SESSION_STATUS.LIVE) {
            const remaining = Math.max(0, session.timeLeftOnPause || 0);
            const timeout = setTimeout(async () => {
                const fresh = await sessionStore.getSession(roomCode);
                if (fresh && !fresh.isPaused) {
                    fresh.currentQuestionIndex += 1;
                    await sessionStore.setSession(roomCode, fresh);
                    const delayTimer = setTimeout(() => broadcastQuestion(io, roomCode), fresh.interQuestionDelay || 5000);
                    activeTimers.set(`${roomCode}:delay`, delayTimer);
                }
            }, remaining);
            activeTimers.set(roomCode, timeout);
        }

        if (session.questionExpiry) {
            await startTimerTicks(io, roomCode);
        }
    }

    await QuizSession.findOneAndUpdate({ sessionCode: roomCode, quizId: quiz._id }, { isPaused: false });
    io.to(roomCode).emit('quiz_resumed', { expiry: session?.questionExpiry || null });
    return { roomCode, expiry: session?.questionExpiry || null, message: 'Quiz resumed' };
};

const advanceQuizQuestion = async ({ io, quizId, sessionCode, user }) => {
    const context = await resolveQuizActionContext({ user, quizId, sessionCode });
    if (context.error) return context;

    const { roomCode } = context;
    if (!roomCode) return { error: 'Active session not found' };

    const session = await sessionStore.getSession(roomCode);
    if (!session) return { error: 'Active session not found' };

    session.currentQuestionIndex += 1;
    await sessionStore.setSession(roomCode, session);
    
    // STEP 7: Use enhanced broadcasting that handles tutor mode
    await broadcastQuestionEnhanced(io, roomCode);
    return { roomCode, message: 'Advanced to next question' };
};

const abortQuizSession = async ({ io, quizId, sessionCode, user, message = 'Admin aborted the quiz.' }) => {
    const context = quizId
        ? await resolveQuizActionContext({ user, quizId, sessionCode })
        : await findQuizAndActiveSession(sessionCode);

    if (context.error) return context;

    const { quiz, liveSession, roomCode: targetSessionCode } = context;

    const endedAt = new Date();

    if (liveSession?._id) {
        if (!canTransition(liveSession.status, SESSION_STATUS.ABORTED)) {
            return { error: `Invalid session state transition: ${liveSession.status} -> ${SESSION_STATUS.ABORTED}`, statusCode: 409 };
        }
        await QuizSession.findByIdAndUpdate(liveSession._id, { status: 'aborted', endedAt });
    }

    if (quiz?._id) {
        if (!canTransition(quiz.status, SESSION_STATUS.ABORTED)) {
            return { error: `Invalid quiz state transition: ${quiz.status} -> ${SESSION_STATUS.ABORTED}`, statusCode: 409 };
        }
        await Quiz.findByIdAndUpdate(quiz._id, {
            status: SESSION_STATUS.ABORTED,
            lastSessionCode: targetSessionCode || quiz.lastSessionCode || quiz.roomCode,
            lastSessionStatus: 'aborted',
            lastSessionEndedAt: endedAt,
            lastSessionMessage: message,
        });
    }

    const rooms = [targetSessionCode, quiz?.roomCode].filter(Boolean);
    for (const room of rooms) {
        io.to(room).emit('quiz_aborted', {
            message,
            roomCode: room,
            quizId: quiz?._id?.toString?.() || quizId || null,
            endedAt: endedAt.toISOString(),
        });
        await sessionStore.deleteSession(room);
    }

    setTimeout(() => {
        rooms.forEach((room) => io.in(room).socketsLeave(room));
    }, 100);

    return { quiz, liveSession, sessionCode: targetSessionCode };
};

const rebootQuizzes = async (io) => {
    try {
        logger.info('Rebooting ongoing quiz sessions');
        const ongoingSessions = await QuizSession.find({ status: { $in: [SESSION_STATUS.WAITING, SESSION_STATUS.LIVE] } });

        for (const quizSession of ongoingSessions) {
            const session = await sessionStore.getSession(quizSession.sessionCode);
            if (session && [SESSION_STATUS.WAITING, SESSION_STATUS.LIVE].includes(session.status)) {
                const now = Date.now();

                if (!session.questionExpiry) {
                    quizSession.status = 'aborted';
                    quizSession.endedAt = new Date();
                    await quizSession.save();
                    continue;
                }

                const timeLeft = session.questionExpiry - now;
                if (timeLeft > 0) {
                    const timeout = setTimeout(async () => {
                        const fresh = await sessionStore.getSession(quizSession.sessionCode);
                        if (fresh) {
                            fresh.currentQuestionIndex += 1;
                            await sessionStore.setSession(quizSession.sessionCode, fresh);
                            const delay = fresh.interQuestionDelay ?? 5000;
                            setTimeout(() => broadcastQuestion(io, quizSession.sessionCode), delay);
                        }
                    }, timeLeft);
                    activeTimers.set(quizSession.sessionCode, timeout);
                } else {
                    session.currentQuestionIndex += 1;
                    await sessionStore.setSession(quizSession.sessionCode, session);
                    broadcastQuestion(io, quizSession.sessionCode);
                }
            } else {
                quizSession.status = 'aborted';
                quizSession.endedAt = new Date();
                await quizSession.save();
            }
        }
    } catch (error) {
        logger.error('Quiz session reboot failed', { error: error.message, stack: error.stack });
    }
};

// STEP 4 & 7: NEW TUTOR MODE FLOW - Handle different progression logic
const broadcastQuestionEnhanced = async (io, roomCode) => {
    const session = await sessionStore.getSession(roomCode);
    if (!session) return;

    const questions = session.questions || [];
    clearTimers(roomCode);

    if (session.currentQuestionIndex >= questions.length) {
        session.status = SESSION_STATUS.COMPLETED;
        session.questionState = 'waiting';
        await sessionStore.setSession(roomCode, session);
        io.to(roomCode).emit('quiz_finished');

        const topWinners = Object.values(session.leaderboard || {})
            .sort((a, b) => b.score - a.score || a.time - b.time)
            .slice(0, 10)
            .map((participant, index) => ({
                name: participant.name,
                score: participant.score,
                time: participant.time,
                rank: index + 1,
            }));

        QuizSession.findOneAndUpdate(
            { sessionCode: roomCode },
            { status: SESSION_STATUS.COMPLETED, endedAt: new Date(), topWinners, participantCount: Object.keys(session.participants || {}).length }
        ).catch((err) => logger.error('QuizSession persist failed', { roomCode, error: err.message }));

        if (session.quizId) {
            Quiz.findByIdAndUpdate(session.quizId, {
                status: SESSION_STATUS.COMPLETED,
                lastSessionCode: roomCode,
                lastSessionStatus: 'completed',
                lastSessionEndedAt: new Date(),
                lastSessionMessage: '',
            }).catch((err) => logger.error('Quiz completion persist failed', { roomCode, error: err.message }));
        }

        setTimeout(() => sessionStore.deleteSession(roomCode), 10 * 60 * 1000);
        return;
    }

    const question = questions[session.currentQuestionIndex];
    session.questionStartTime = Date.now();
    session.questionExpiry = Date.now() + (question.timeLimit * 1000);
    session.currentQuestionStats = createQuestionStats(question);
    session.questionState = 'live';  // STEP 1: Set question state to live
    await sessionStore.setSession(roomCode, session);

    io.to(roomCode).emit('new_question', formatQuestion(question, session.currentQuestionIndex, questions.length, session.questionExpiry));
    io.to(roomCode).emit('answer_stats', serializeQuestionStats(session.currentQuestionStats));
    io.to(roomCode).emit('fastest_user', null);
    await startTimerTicks(io, roomCode);

    const delay = session.interQuestionDelay ?? 5000;
    
    // STEP 4: Tutor mode - DO NOT auto-advance
    if (session.mode === 'auto' && !session.isPaused) {
        const timeout = setTimeout(async () => {
            const fresh = await sessionStore.getSession(roomCode);
            if (fresh && !fresh.isPaused && [SESSION_STATUS.WAITING, SESSION_STATUS.LIVE].includes(fresh.status)) {
                fresh.currentQuestionIndex += 1;
                await sessionStore.setSession(roomCode, fresh);
                const delayTimer = setTimeout(() => broadcastQuestionEnhanced(io, roomCode), delay);
                activeTimers.set(`${roomCode}:delay`, delayTimer);
            }
        }, question.timeLimit * 1000);

        activeTimers.set(roomCode, timeout);
    } else if (session.mode === 'tutor' || session.mode === 'teaching') {
        // TUTOR MODE: Set state to review after timer, wait for host action
        const timeout = setTimeout(async () => {
            const fresh = await sessionStore.getSession(roomCode);
            if (fresh && [SESSION_STATUS.WAITING, SESSION_STATUS.LIVE].includes(fresh.status)) {
                fresh.questionState = 'review';  // STEP 4: Set question state to review
                await sessionStore.setSession(roomCode, fresh);
                io.to(roomCode).emit('question_review_mode', { message: 'Answer phase ended, host will decide next step' });
            }
        }, question.timeLimit * 1000);
        activeTimers.set(roomCode, timeout);
    }
};

// STEP 6: Reveal correct answer for tutor mode
const revealAnswer = async ({ io, roomCode, user }) => {
    if (user?.role !== 'organizer' && user?.role !== 'admin') {
        return { error: 'Unauthorized' };
    }

    const session = await sessionStore.getSession(roomCode);
    if (!session || session.questionState !== 'review') {
        return { error: 'Question review phase not active' };
    }

    const question = session.questions?.[session.currentQuestionIndex];
    if (!question) {
        return { error: 'Question not found' };
    }

    io.to(roomCode).emit('show_correct_answer', {
        correctAnswer: question.correctAnswer || question.options[0],  // Assuming this field exists
        explanation: question.explanation || 'Check the correct answer above',
        questionId: question._id?.toString?.() || null,
    });

    return { roomCode, message: 'Answer revealed' };
};

// STEP 8: End quiz session
const endQuizSession = async ({ io, quizId, sessionCode, user }) => {
    if (user?.role !== 'organizer' && user?.role !== 'admin') {
        return { error: 'Unauthorized', statusCode: 403 };
    }

    const context = await resolveQuizActionContext({ user, quizId, sessionCode });
    if (context.error) return context;

    const { quiz, roomCode } = context;
    const session = await sessionStore.getSession(roomCode);
    
    if (session) {
        if (!canTransition(session.status, SESSION_STATUS.COMPLETED)) {
            return { error: `Invalid session state transition: ${session.status} -> ${SESSION_STATUS.COMPLETED}`, statusCode: 409 };
        }
        if (!canTransition(quiz.status, SESSION_STATUS.COMPLETED)) {
            return { error: `Invalid quiz state transition: ${quiz.status} -> ${SESSION_STATUS.COMPLETED}`, statusCode: 409 };
        }
        session.status = SESSION_STATUS.COMPLETED;
        session.questionState = 'waiting';
        clearTimers(roomCode);
        await sessionStore.setSession(roomCode, session);
    }

    const topWinners = Object.values(session?.leaderboard || {})
        .sort((a, b) => b.score - a.score || a.time - b.time)
        .slice(0, 10)
        .map((participant, index) => ({
            name: participant.name,
            score: participant.score,
            time: participant.time,
            rank: index + 1,
        }));

    await QuizSession.findOneAndUpdate(
        { sessionCode: roomCode },
        { status: SESSION_STATUS.COMPLETED, endedAt: new Date(), topWinners, participantCount: Object.keys(session?.participants || {}).length }
    ).catch((err) => logger.error('QuizSession end persist failed', { roomCode, error: err.message }));

    await Quiz.findByIdAndUpdate(quiz._id, {
        status: SESSION_STATUS.COMPLETED,
        lastSessionCode: roomCode,
        lastSessionStatus: SESSION_STATUS.COMPLETED,
        lastSessionEndedAt: new Date(),
        lastSessionMessage: '',
    }).catch((err) => logger.error('Quiz end persist failed', { roomCode, error: err.message }));

    io.to(roomCode).emit('quiz_ended_by_host', { message: 'Host ended the quiz', topWinners });
    return { roomCode, message: 'Quiz ended', topWinners };
};

// STEP 5: Calculate answer stats with detailed breakdown
const calculateAnswerStats = async (roomCode, questionIndex) => {
    const session = await sessionStore.getSession(roomCode);
    if (!session) return null;

    const stats = session.currentQuestionStats;
    if (!stats) return null;

    const totalAnswers = stats.totalAnswers || 0;
    const correctCount = Object.values(stats.optionCounts || {}).reduce((sum, count) => {
        // Assuming first option is correct (update this logic based on your actual data structure)
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

module.exports = {
    ALLOWED_QUIZ_CATEGORIES,
    abortQuizSession,
    advanceQuizQuestion,
    buildOrganizerScopeQuery,
    buildQuizAccessQuery,
    broadcastQuestion,
    broadcastQuestionEnhanced,
    calculateAnswerStats,
    endQuizSession,
    ensureParticipantHasPaidAccess,
    findQuizAndActiveSession,
    formatQuestion,
    getSubjectLeaderboardData,
    joinRoom,
    mergeParticipantMaps,
    pauseQuizSession,
    rebootQuizzes,
    resumeQuizSession,
    revealAnswer,
    startQuizSession,
    submitAnswer,
};