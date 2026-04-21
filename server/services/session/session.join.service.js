const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const sessionStore = require('./session.service');
const Quiz = require('../../models/Quiz');
const QuizSession = require('../../models/QuizSession');
const Subscription = require('../../models/Subscription');
const { SESSION_STATUS } = require('../../utils/sessionStateMachine');
const { getPlanConfig } = require('../../config/plans');
const { findQuizAndActiveSession, ensureParticipantHasPaidAccess } = require('../quiz/quiz.utils.service');
const { acquireJoinLock } = require('./session.service');
const { addSequenceNumber } = require('./session.realtime.service');

const mergeParticipantMaps = (primary = {}, secondary = {}) => ({
    ...secondary,
    ...primary,
});

const buildRoomState = (session, roomCode) => {
    const participants = Object.values(session.participants || {});
    const leaderboard = Object.values(session.leaderboard || {})
        .sort((a, b) => b.score - a.score || a.time - b.time)
        .slice(0, 10);

    const isLive = session.status === SESSION_STATUS.LIVE;
    const questionIndex = session.currentQuestionIndex ?? 0;
    const questions = session.questions || [];
    const question = isLive ? questions[questionIndex] : null;
    
    // Lazy resolve to avoid circular deps at top level
    const { formatQuestion, serializeQuestionStats } = require('../gameplay/question.service');

    const currentQuestion = question
        ? formatQuestion(question, questionIndex, questions.length, session.questionExpiry)
        : null;

    logger.debug('[JOIN] Building room state', { 
        roomCode, 
        isLive, 
        questions: questions.length,
        hasCurrent: !!currentQuestion
    });

    return {
        roomCode,
        participants,
        leaderboard,
        currentQuestion,
        totalQuestions: questions.length,
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

    const codeToSearch = (roomCode || '').toUpperCase();
    const { quiz, liveSession, effectiveRoomCode } = await findQuizAndActiveSession(codeToSearch, sessionId);
    
    if (!quiz) return { error: 'Quiz not found' };

    const isHost = String(quiz.hostId) === String(user._id) || user.role === 'admin';

    if (!liveSession) {
        if (!isHost && [SESSION_STATUS.SCHEDULED, SESSION_STATUS.WAITING, SESSION_STATUS.LIVE].includes(quiz.status)) {
            return { error: 'Cannot join waiting without session' };
        }
    }

    const token = socket.data.token;
    const socketRoom = String(liveSession?.sessionCode || effectiveRoomCode || '').toUpperCase();

    // 1. Initial basic checks (Payment)
    if (quiz?.isPaid && !['host', 'admin'].includes(user.role)) {
        let hasPaidAccess = false;
        try {
            hasPaidAccess = await ensureParticipantHasPaidAccess(token, quiz._id);
        } catch (paymentError) {
            logger.warn('Join room payment check failed', { error: paymentError.message });
        }
        if (!hasPaidAccess) return { error: 'Payment required to join this quiz.' };
    }

    // 2. Fetch real-time session from Redis
    let session = await sessionStore.getSession(socketRoom);
    
    // 3. Robust Access Control Check (RBAC + SaaS Limits)
    const sessionAccessControl = require('./sessionAccessControl');
    const accessCheck = await sessionAccessControl.canJoinSession(user, quiz, session || liveSession);
    
    if (!accessCheck.allowed) return { error: accessCheck.reason };

    socket.join(socketRoom);
    socket.data.roomCode = socketRoom;

    let reconnectionData = null;

    if (!session) {
        session = {
            status: liveSession?.status || quiz?.status || SESSION_STATUS.DRAFT,
            participants: {},
            leaderboard: {},
            currentQuestionIndex: null,
            lastActivity: Date.now(),
            participantLimit: 50, // Default, will be resolved below
        };
    } else {
        const dbStatus = liveSession?.status || quiz?.status;
        if (dbStatus && session.status !== dbStatus) session.status = dbStatus;

        // Terminal statuses guard
        const terminalStatuses = [SESSION_STATUS.COMPLETED, SESSION_STATUS.ABORTED, 'completed', 'aborted', 'finished'];
        if (terminalStatuses.includes(session.status)) {
            logger.warn('[JOIN] Rejected — session already ended', { userId: user._id, roomCode: socketRoom, status: session.status });
            return { error: 'This quiz has already ended' };
        }

        if (session.status !== SESSION_STATUS.LIVE) session.currentQuestionIndex = null;

        if (session.status === SESSION_STATUS.LIVE || session.status === SESSION_STATUS.WAITING) {
            const sessionRecovery = require('./sessionRecovery');
            reconnectionData = await sessionRecovery.handleParticipantReconnection(socket, socketRoom, user);
        }
    }

    if (quiz?.roomCode && socketRoom !== quiz.roomCode) {
        const waitingSession = await sessionStore.getSession(quiz.roomCode);
        if (waitingSession?.participants) {
            session.participants = mergeParticipantMaps(session.participants, waitingSession.participants);
        }
    }

    const userId = String(user._id);
    if (!session.participants) session.participants = {};

    // 4. Idempotency guard
    if (session.participants[userId]) {
        logger.info('[JOIN] Participant already in session — idempotent return', { userId, roomCode: socketRoom });
        const state = buildRoomState(session, socketRoom);
        const updatedQuiz = await Quiz.findById(quiz._id).lean();
        state.quiz = updatedQuiz;
        return { roomCode: socketRoom, quiz, liveSession, session, state, reconnected: reconnectionData?.reconnected || false };
    }

    // 5. Atomic join lock
    const lockAcquired = await acquireJoinLock(socketRoom, userId);
    if (!lockAcquired) {
        const freshSession = await sessionStore.getSession(socketRoom);
        if (freshSession?.participants?.[userId]) {
            logger.debug('[JOIN] Lock contention: already joined after re-read', { userId, roomCode: socketRoom });
            const state = buildRoomState(freshSession, socketRoom);
            const updatedQuiz = await Quiz.findById(quiz._id).lean();
            state.quiz = updatedQuiz;
            return { roomCode: socketRoom, quiz, liveSession, session: freshSession, state, reconnected: false };
        }
    } else {
        const freshSession = await sessionStore.getSession(socketRoom);
        if (freshSession?.participants?.[userId]) {
            logger.debug('[JOIN] Double-check: participant found after lock acquired', { userId, roomCode: socketRoom });
            const state = buildRoomState(freshSession, socketRoom);
            const updatedQuiz = await Quiz.findById(quiz._id).lean();
            state.quiz = updatedQuiz;
            return { roomCode: socketRoom, quiz, liveSession, session: freshSession, state, reconnected: false };
        }
        if (freshSession) session = freshSession;
    }

    // 6. Final write
    session.participants[userId] = {
        _id: user._id,
        name: user.name,
        role: user.role,
        avatar: user.avatar || null,
        joinedAt: new Date().toISOString(),
    };

    session.lastActivity = Date.now();
    session.quizId = session.quizId || quiz._id?.toString?.() || quiz._id;
    session.sessionId = session.sessionId || liveSession?._id?.toString?.() || null;
    
    // ── Metrics Tracking: Peak Participants ──────────────────────────────
    const currentCount = Object.keys(session.participants || {}).length;
    session.peakParticipants = Math.max(session.peakParticipants || 0, currentCount);

    session.questions = session.questions
        || liveSession?.templateSnapshot?.questions
        || quiz.questions
        || [];

    await sessionStore.setSession(socketRoom, session);

    const updatedQuiz = await Quiz.findById(quiz._id).lean();
    const state = buildRoomState(session, socketRoom);
    state.quiz = updatedQuiz;
    
    if (reconnectionData?.reconnected) {
        const rejoinPayload = await addSequenceNumber(socketRoom, {
            currentQuestion: reconnectionData.currentQuestion,
            userStats: reconnectionData.userStats,
            submissionHistory: reconnectionData.submissionHistory,
            sessionStatus: reconnectionData.sessionStatus,
            isPaused: reconnectionData.isPaused,
        });
        socket.emit('participant_reconnected', rejoinPayload);
    }

    return {
        roomCode: socketRoom,
        quiz,
        liveSession,
        session,
        state,
        reconnected: reconnectionData?.reconnected || false
    };
};

const leaveRoom = async ({ io, socket }) => {
    const user = socket.data.user;
    const roomCode = socket.data.roomCode;
    if (!user || !roomCode) return;

    const session = await sessionStore.getSession(roomCode);
    if (!session || !session.participants) return;

    const userId = String(user._id);
    if (session.participants[userId]) {
        delete session.participants[userId];
        await sessionStore.setSession(roomCode, session);

        const participantsArray = Object.values(session.participants);
        const participantPayload = await addSequenceNumber(roomCode, { 
            participants: participantsArray, 
            count: participantsArray.length 
        });

        // Spec event
        io.to(roomCode).emit('participants:update', participantPayload);
        // Legacy events
        io.to(roomCode).emit('participants_update', participantsArray);
        io.to(roomCode).emit('session:updateParticipants', participantPayload);
        io.to(roomCode).emit('waiting_room_update', participantPayload);

        logger.debug('leaveRoom: participant removed', { userId, roomCode, remaining: participantsArray.length });
    }
};

module.exports = {
    mergeParticipantMaps,
    joinRoom,
    leaveRoom,
};
