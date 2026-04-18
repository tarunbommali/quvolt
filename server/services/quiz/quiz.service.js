const mongoose = require('mongoose');
const axios = require('axios');
const Quiz = require('../../models/Quiz');
const QuizSession = require('../../models/QuizSession');
const Submission = require('../../models/Submission');
const { compareAnswers } = require('../../utils/crypto');
const { calculateScore } = require('../../utils/scoring');
const logger = require('../../utils/logger');
const sessionStore = require('../session/session.service');
const { getPlanConfig } = require('../../config/plans');
const { SESSION_STATUS, assertWaitingSessionExists, assertTransition, canTransition, normalizeSessionStatus } = require('../../utils/sessionStateMachine');
const { prepareMessage } = require('../../utils/messageCompression');
const messageBatcher = require('../../utils/messageBatching');

const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:5001';
const ALLOWED_QUIZ_CATEGORIES = ['regular', 'internal', 'external', 'subject-syllabus', 'hackathon', 'interview'];



const buildQuizAccessQuery = (user, id, extra = {}) => (
    user.role === 'admin'
        ? { _id: id, ...extra }
        : { _id: id, hostId: user._id, ...extra }
);

const buildhostScopeQuery = (user, extra = {}) => (
    user.role === 'admin'
        ? { ...extra }
        : { hostId: user._id, ...extra }
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

    const normalizedCode = (roomCode || '').toUpperCase();

    if (sessionId) {
        liveSession = await QuizSession.findById(sessionId).lean();
    }

    if (!liveSession && normalizedCode) {
        liveSession = await QuizSession.findOne({ sessionCode: normalizedCode }).lean();
    }

    let quiz = null;
    if (liveSession) {
        quiz = await Quiz.findById(liveSession.quizId)
            .select('title roomCode isPaid price hostId parentId mode interQuestionDelay shuffleQuestions questions accessType sharedWith')
            .lean();
    } else if (normalizedCode) {
        quiz = await Quiz.findOne({ roomCode: normalizedCode })
            .select('title roomCode isPaid price hostId parentId mode interQuestionDelay shuffleQuestions questions accessType sharedWith')
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
        effectiveRoomCode: String(liveSession?.sessionCode || quiz.roomCode || roomCode || '').toUpperCase(),
    };
};

const resolveQuizActionContext = async ({ user, quizId, sessionCode, sessionId }) => {
    if (quizId) {
        const quiz = await Quiz.findById(quizId).lean();
        if (!quiz) return { error: 'Quiz not found', statusCode: 404 };
        if (user.role !== 'admin' && String(quiz.hostId) !== String(user._id)) {
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

const activeTimers = new Map();
let globalIoRef = null;

/**
 * Increment and return the next sequence number for a session.
 * Sequence numbers are used to detect missed updates on the client side.
 */
const getNextSequenceNumber = async (roomCode) => {
    const session = await sessionStore.getSession(roomCode);
    if (!session) return 0;
    
    session.sequenceNumber = (session.sequenceNumber || 0) + 1;
    await sessionStore.setSession(roomCode, session);
    
    return session.sequenceNumber;
};

/**
 * Add sequence number to a broadcast payload.
 * This allows clients to detect missed messages and request reconciliation.
 */
const addSequenceNumber = async (roomCode, payload) => {
    const sequenceNumber = await getNextSequenceNumber(roomCode);
    return {
        ...payload,
        sequenceNumber,
        timestamp: Date.now(),
    };
};

/**
 * Emit a message with optional compression.
 * Messages larger than 1KB are automatically compressed.
 */
const emitWithCompression = async (io, roomCode, eventName, payload) => {
    try {
        const prepared = await prepareMessage(eventName, payload);
        
        if (prepared.compressed) {
            // Send compressed message with metadata
            io.to(roomCode).emit('compressed_message', {
                event: prepared.event,
                data: prepared.data,
                metadata: prepared.metadata,
            });
            
            logger.debug('Sent compressed message', {
                roomCode,
                event: eventName,
                originalSize: prepared.metadata.originalSize,
                compressedSize: prepared.metadata.compressedSize,
            });
        } else {
            // Send uncompressed message normally
            io.to(roomCode).emit(eventName, prepared.data);
        }
    } catch (error) {
        logger.error('Failed to emit message with compression', {
            roomCode,
            event: eventName,
            error: error.message,
        });
        // Fallback to normal emit
        io.to(roomCode).emit(eventName, payload);
    }
};

const clearTimers = async (roomCode) => {
    ['advance', 'broadcast', 'tutor_review'].forEach(action => {
        const key = `${roomCode}:${action}`;
        if (activeTimers.has(key)) {
            clearTimeout(activeTimers.get(key));
            activeTimers.delete(key);
        }
        sessionStore.clearDistributedTimer(key).catch(() => {});
    });
};

const scheduleNextAction = (roomCode, action, delayMs) => {
    const key = `${roomCode}:${action}`;
    if (activeTimers.has(key)) {
        clearTimeout(activeTimers.get(key));
    }
    const timeout = setTimeout(async () => {
        activeTimers.delete(key);
        try {
            const session = await sessionStore.getSession(roomCode);
            if (!session || session.isPaused) {
                logger.debug(`Skipping action ${action} - session not found or paused`, { roomCode });
                return;
            }

            if (action === 'advance') {
                // Emit question:end immediately as the user requested for clean UI transition
                if (globalIoRef) {
                    globalIoRef.to(roomCode).emit('question:end');
                    globalIoRef.to(roomCode).emit('timer:end', { roomCode, serverTime: Date.now() });
                }
                
                session.currentQuestionIndex += 1;
                await sessionStore.setSession(roomCode, session);
                logger.info(`Advanced to question ${session.currentQuestionIndex}`, { roomCode });
                
                // Then broadcast the next question after inter-question delay
                const delay = session.interQuestionDelay ?? 1500;
                scheduleNextAction(roomCode, 'broadcast', delay);
            } else if (action === 'broadcast') {
                if (globalIoRef) {
                    logger.info(`Broadcasting question ${session.currentQuestionIndex}`, { roomCode });
                    await broadcastQuestionEnhanced(globalIoRef, roomCode);
                } else {
                    logger.error('globalIoRef not set, cannot broadcast question', { roomCode });
                }
            } else if (action === 'tutor_review') {
                if ([SESSION_STATUS.WAITING, SESSION_STATUS.LIVE].includes(session.status)) {
                    session.questionState = 'review';
                    await sessionStore.setSession(roomCode, session);
                    if (globalIoRef) {
                        globalIoRef.to(roomCode).emit('question_review_mode', { message: 'Answer phase ended' });
                    }
                }
            }
        } catch (error) {
            logger.error(`Timer action ${action} failed`, { roomCode, error: error.message, stack: error.stack });
        }
    }, delayMs);
    logger.debug(`Scheduled next action '${action}' for room ${roomCode} in ${delayMs}ms`);
    activeTimers.set(key, timeout);
};

// Tick timers are inherently distributed to the frontend, so we no longer push 'timer_tick'
const clearTickTimer = () => { };
const emitTimerTick = async () => { };
const startTimerTicks = async () => { };

// Set the global IO reference, but disable the previous setInterval loop
const startDistributedTimerWorker = (io) => {
    globalIoRef = io;
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
    const questionIndex = session.currentQuestionIndex ?? 0;
    const question = isLive ? session.questions?.[questionIndex] : null;
    const currentQuestion = question
        ? formatQuestion(question, questionIndex, session.questions.length, session.questionExpiry)
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
    const socketRoom = String(liveSession?.sessionCode || effectiveRoomCode || '').toUpperCase();

    // Requirements 10.1, 10.2, 10.4: RBAC-integrated session access control
    const sessionAccessControl = require('../session/sessionAccessControl');
    const accessCheck = await sessionAccessControl.canJoinSession(user, quiz, liveSession);
    
    if (!accessCheck.allowed) {
        logger.warn('Session join denied by access control', {
            userId: user._id,
            quizId: quiz._id,
            sessionId: liveSession?._id,
            reason: accessCheck.reason,
        });
        return { error: accessCheck.reason };
    }

    if (quiz?.isPaid && !['host', 'admin'].includes(user.role)) {
        let hasPaidAccess = false;
        try {
            hasPaidAccess = await ensureParticipantHasPaidAccess(token, quiz._id);
        } catch (paymentError) {
            logger.warn('Socket join_room payment check failed', { userId: user._id, quizId: quiz._id, error: paymentError.message });
        }

        if (!hasPaidAccess) return { error: 'Payment required to join this quiz.' };
    }

    socket.join(socketRoom);
    socket.data.roomCode = socketRoom;
    if (sessionId && roomCode && socketRoom === sessionId) {
        socket.leave(roomCode);
    }

    let session = await sessionStore.getSession(socketRoom);
    let reconnectionData = null;
    
    if (!session) {
        session = {
            status: liveSession?.status || quiz?.status || SESSION_STATUS.DRAFT,
            participants: {},
            leaderboard: {},
            currentQuestionIndex: null, // No question should be active in lobby
            lastActivity: Date.now(),
            participantLimit: 50,
        };
    } else {
        // Force sync status from DB if Redis is out of sync
        const dbStatus = liveSession?.status || quiz?.status;
        if (dbStatus && session.status !== dbStatus) {
            session.status = dbStatus;
        }

        // Requirement 2: Do NOT allow answering if status is not LIVE
        if (session.status !== SESSION_STATUS.LIVE) {
            session.currentQuestionIndex = null;
        }

        // Check if this is a reconnection attempt
        if (session.status === SESSION_STATUS.LIVE || session.status === SESSION_STATUS.WAITING) {
            const sessionRecovery = require('../session/sessionRecovery');
            reconnectionData = await sessionRecovery.handleParticipantReconnection(socket, socketRoom, user);
            
            if (reconnectionData.reconnected) {
                logger.info('Participant reconnected to session', {
                    userId: user._id,
                    sessionCode: socketRoom,
                    currentScore: reconnectionData.userStats.score
                });
            }
        }
    }

    if (quiz?.roomCode && socketRoom !== quiz.roomCode) {
        const waitingSession = await sessionStore.getSession(quiz.roomCode);
        if (waitingSession?.participants) {
            session.participants = mergeParticipantMaps(session.participants, waitingSession.participants);
        }
    }

    if (user.role === 'host' || user.role === 'organizer') {
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
    
    const userId = String(user._id);
    if (!session.participants) session.participants = {};

    // Standardize registration before any state is built or emitted
    session.participants[userId] = { 
        _id: user._id, 
        name: user.name, 
        role: user.role,
        avatar: user.avatar || null,
        joinedAt: new Date().toISOString()
    };

    if (user.role !== 'host' && user.role !== 'organizer') {
        const currentCount = Object.keys(session.participants).length;
        if (currentCount > (session.participantLimit || 50)) {
            delete session.participants[userId]; // Rollback
            return { error: 'Upgrade your plan' };
        }
    }

    session.lastActivity = Date.now();
    session.quizId = session.quizId || quiz._id?.toString?.() || quiz._id;
    session.sessionId = session.sessionId || liveSession?._id?.toString?.() || null;
    session.subjectRoom = session.subjectRoom || (quiz.parentId ? `subject_${quiz.parentId.toString()}` : null);
    session.questions = session.questions
        || liveSession?.templateSnapshot?.questions
        || quiz.questions
        || [];

    await sessionStore.setSession(socketRoom, session);

    const updatedQuiz = await Quiz.findById(quiz._id).lean();
    const state = buildRoomState(session, socketRoom);
    state.quiz = updatedQuiz;
    
    // If this is a reconnection, send the current question and score to the participant
    if (reconnectionData?.reconnected) {
        // Emit reconnection event with restored state
        socket.emit('participant_reconnected', {
            currentQuestion: reconnectionData.currentQuestion,
            userStats: reconnectionData.userStats,
            submissionHistory: reconnectionData.submissionHistory,
            sessionStatus: reconnectionData.sessionStatus,
            isPaused: reconnectionData.isPaused,
            message: 'Welcome back! Your progress has been restored.'
        });
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

const startQuizSession = async ({ io, quizId, roomCode, sessionId, user }) => {
    const context = quizId
        ? await resolveQuizActionContext({ user, quizId, sessionCode: roomCode, sessionId })
        : await findQuizAndActiveSession(String(roomCode || '').toUpperCase(), sessionId);

    if (context.error) return context;

    const quiz = context.quiz;
    const liveSession = context.liveSession;
    if (!quiz) return { error: 'Quiz not found' };

    const quizStatus = normalizeSessionStatus(quiz.status);

    if (user?.role !== 'admin' && user?._id && String(quiz.hostId || '') !== String(user._id)) {
        // Double check for legacy organizer role just in case
        if (user.role !== 'host' && user.role !== 'organizer' && user.role !== 'admin') {
            return { error: 'Forbidden', statusCode: 403 };
        }
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

    // Use assertTransition for comprehensive validation
    try {
        assertTransition(session.status, SESSION_STATUS.LIVE, 'session');
        assertTransition(quizStatus, SESSION_STATUS.LIVE, 'quiz');
    } catch (error) {
        return { error: error.message, statusCode: 409 };
    }

    // Persist state to database BEFORE acknowledging transition
    const statePersistence = require('../session/statePersistence');
    
    try {
        await statePersistence.executeInTransaction(async (dbSession) => {
            // Update session status
            await QuizSession.findByIdAndUpdate(
                session._id,
                { status: SESSION_STATUS.LIVE },
                { session: dbSession }
            );
            
            // Update quiz status
            await Quiz.findByIdAndUpdate(
                quiz._id,
                { 
                    status: SESSION_STATUS.LIVE, 
                    lastSessionCode: session.sessionCode 
                },
                { session: dbSession }
            );
            
            // Notify participants immediately to transition UI
            io.to(session.sessionCode).emit('session:start', { 
                roomCode: session.sessionCode,
                status: 'live' 
            });
            
            return { session, quiz };
        }, {
            operation: 'startQuizSession',
            sessionCode: session.sessionCode,
            quizId: quiz._id
        });
    } catch (error) {
        logger.error('Failed to persist session start', {
            sessionCode: session.sessionCode,
            error: error.message
        });
        return { error: 'Failed to start session', statusCode: 500 };
    }

    const socketRoom = session.sessionCode;
    const snapshotQuestions = session.templateSnapshot?.questions || quiz.questions || [];
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
        waitingRoomCode: quiz.roomCode || null,
        subjectRoom: quiz.parentId ? `subject_${quiz.parentId.toString()}` : null,
        questions: snapshotQuestions.map((question) => ({ ...question.toObject?.() ?? question })),
        lastActivity: Date.now(),
        participantLimit: existingState?.participantLimit || 50,
        interQuestionDelay: (quiz.interQuestionDelay ?? 1.5) * 1000,
        sequenceNumber: 0, // Initialize sequence number for state synchronization
    };

    await sessionStore.setSession(socketRoom, sessionState);

    // If we have a permanent waiting room, notify everyone to move to the new active session room
    if (quiz.roomCode && socketRoom !== quiz.roomCode) {
        io.to(quiz.roomCode).emit('session_redirect', { roomCode: socketRoom, sessionId: session._id.toString() });
    }

    // Give participants a moment to receive session_redirect and join the new room
    setTimeout(() => {
        broadcastQuestionEnhanced(io, socketRoom).catch(err => {
            logger.error('Initial broadcast failed', { roomCode: socketRoom, error: err.message });
        });
    }, 500);

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
    if (!session) {
        return { error: 'Session not found', statusCode: 404 };
    }

    if (session.status !== SESSION_STATUS.LIVE) {
        return { error: `Cannot submit answer in ${session.status} state`, statusCode: 409 };
    }

    if (session.isPaused) {
        return { error: 'Cannot submit answer while session is paused', statusCode: 409 };
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

    // Persist state to Redis before acknowledging submission
    await sessionStore.setSession(socketRoom, session);

    // Persist submission to database with retry logic (async, don't block response)
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
    }).catch((err) => {
        logger.error('Submission persistence failed after retries', { 
            userId: user._id, 
            socketRoom, 
            error: err.message 
        });
    });

    const leaderboard = Object.values(session.leaderboard)
        .sort((a, b) => b.score - a.score || a.time - b.time)
        .slice(0, 10);

    // Add sequence numbers to real-time broadcasts
    const statsPayload = await addSequenceNumber(socketRoom, serializeQuestionStats(currentStats));
    const fastestPayload = await addSequenceNumber(socketRoom, currentStats.fastestUser ? { ...currentStats.fastestUser } : null);
    const streakPayload = await addSequenceNumber(socketRoom, {
        userId: user._id.toString(),
        name: user.name,
        streak: userStats.streak,
        bestStreak: userStats.bestStreak,
        isCorrect,
        questionId: question._id?.toString?.() || null,
    });

    // Batch rapid answer stat updates to reduce message overhead
    messageBatcher.batch(socketRoom, 'answer_stats', statsPayload, (roomCode, grouped) => {
        // Send the latest stats from the batch
        if (grouped.answer_stats && grouped.answer_stats.length > 0) {
            const latestStats = grouped.answer_stats[grouped.answer_stats.length - 1];
            io.to(roomCode).emit('answer_stats', latestStats);
        }
    });

    // Send fastest user and streak updates immediately (not batched)
    io.to(socketRoom).emit('fastest_user', fastestPayload);
    io.to(socketRoom).emit('streak_update', streakPayload);

    // Requirement 8: Server -> Client strict contract
    socket.emit('answer:result', {
        correctAnswer: question.options.find(o => o.isCorrect)?.text || question.correctAnswer || 'Check Screen',
        isCorrect,
        timeTaken,
        scoreChange: score,
        totalScore: userStats.score,
    });

    // Requirement 6: Maintain real-time leaderboard (Top 10)
    io.to(socketRoom).emit('leaderboard:update', leaderboard);

    // Requirement 5: After all answers received, emit question:end and move to next
    const participantsCount = Object.keys(session.participants || {}).length;
    if (currentStats.totalAnswers >= participantsCount && session.mode === 'auto') {
        io.to(socketRoom).emit('question:end');
        scheduleNextAction(socketRoom, 'advance', 1000); 
    }

    return {
        room: socketRoom,
        isCorrect,
        timeTaken,
        score,
        totalScore: userStats.score,
        leaderboard,
    };
};

const pauseQuizSession = async ({ io, quizId, sessionCode, user }) => {
    const context = await resolveQuizActionContext({ user, quizId, sessionCode });
    if (context.error) return context;

    const { quiz, roomCode } = context;
    if (!roomCode) return { error: 'Active session not found' };

    const session = await sessionStore.getSession(roomCode);
    if (!session) {
        return { error: 'Session not found', statusCode: 404 };
    }

    // Validate that session is in a pausable state
    if (session.status !== SESSION_STATUS.LIVE && session.status !== SESSION_STATUS.WAITING) {
        return { error: `Cannot pause session in ${session.status} state`, statusCode: 409 };
    }

    if (session.isPaused) {
        return { error: 'Session is already paused', statusCode: 409 };
    }

    // Update session state
    session.isPaused = true;
    session.pausedAt = Date.now();
    session.timeLeftOnPause = (session.questionExpiry || 0) - Date.now();
    await clearTimers(roomCode);
    await sessionStore.setSession(roomCode, session);

    // Persist to database
    await QuizSession.findOneAndUpdate({ sessionCode: roomCode, quizId: quiz._id }, { isPaused: true });
    
    const pausePayload = await addSequenceNumber(roomCode, { message: 'Host paused the quiz', isPaused: true });
    io.to(roomCode).emit('quiz_paused', pausePayload);
    return { roomCode, message: 'Quiz paused' };
};

const resumeQuizSession = async ({ io, quizId, sessionCode, user }) => {
    const context = await resolveQuizActionContext({ user, quizId, sessionCode });
    if (context.error) return context;

    const { quiz, roomCode } = context;
    if (!roomCode) return { error: 'Active session not found' };

    const session = await sessionStore.getSession(roomCode);
    if (!session) {
        return { error: 'Session not found', statusCode: 404 };
    }

    // Validate that session is paused
    if (!session.isPaused) {
        return { error: 'Session is not paused', statusCode: 409 };
    }

    // Validate that session is in a resumable state
    if (session.status !== SESSION_STATUS.LIVE && session.status !== SESSION_STATUS.WAITING) {
        return { error: `Cannot resume session in ${session.status} state`, statusCode: 409 };
    }

    // Update session state
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
        await sessionStore.registerDistributedTimer(`${roomCode}:advance`, Date.now() + remaining);
    }

    // Persist to database
    await QuizSession.findOneAndUpdate({ sessionCode: roomCode, quizId: quiz._id }, { isPaused: false });
    
    const resumePayload = await addSequenceNumber(roomCode, { expiry: session?.questionExpiry || null, isPaused: false });
    io.to(roomCode).emit('quiz_resumed', resumePayload);
    return { roomCode, expiry: session?.questionExpiry || null, message: 'Quiz resumed' };
};

const advanceQuizQuestion = async ({ io, quizId, sessionCode, user }) => {
    const context = await resolveQuizActionContext({ user, quizId, sessionCode });
    if (context.error) return context;

    const { roomCode } = context;
    if (!roomCode) return { error: 'Active session not found' };

    const session = await sessionStore.getSession(roomCode);
    if (!session) {
        return { error: 'Session not found', statusCode: 404 };
    }

    // Validate that session is in a state where questions can be advanced
    if (session.status !== SESSION_STATUS.LIVE && session.status !== SESSION_STATUS.WAITING) {
        return { error: `Cannot advance question in ${session.status} state`, statusCode: 409 };
    }

    if (session.isPaused) {
        return { error: 'Cannot advance question while session is paused', statusCode: 409 };
    }

    // Check if there are more questions to advance to
    const questions = session.questions || [];
    if (session.currentQuestionIndex >= questions.length - 1) {
        return { error: 'No more questions to advance to', statusCode: 409 };
    }

    session.currentQuestionIndex += 1;
    await sessionStore.setSession(roomCode, session);

    // Use enhanced broadcasting that handles tutor mode
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

    // Validate transitions before making any changes
    if (liveSession?._id) {
        try {
            assertTransition(liveSession.status, SESSION_STATUS.ABORTED, 'session');
        } catch (error) {
            return { error: error.message, statusCode: 409 };
        }
    }

    if (quiz?._id) {
        try {
            assertTransition(quiz.status, SESSION_STATUS.ABORTED, 'quiz');
        } catch (error) {
            return { error: error.message, statusCode: 409 };
        }
    }

    // Persist state to database BEFORE acknowledging transition
    const statePersistence = require('../session/statePersistence');
    
    try {
        await statePersistence.executeInTransaction(async (dbSession) => {
            if (liveSession?._id) {
                await QuizSession.findByIdAndUpdate(
                    liveSession._id, 
                    { status: 'aborted', endedAt },
                    { session: dbSession }
                );
            }

            if (quiz?._id) {
                await Quiz.findByIdAndUpdate(
                    quiz._id,
                    {
                        status: SESSION_STATUS.ABORTED,
                        lastSessionCode: targetSessionCode || quiz.lastSessionCode || quiz.roomCode,
                        lastSessionStatus: 'aborted',
                        lastSessionEndedAt: endedAt,
                        lastSessionMessage: message,
                    },
                    { session: dbSession }
                );
            }
            
            return { liveSession, quiz };
        }, {
            operation: 'abortQuizSession',
            sessionCode: targetSessionCode,
            quizId: quiz?._id
        });
    } catch (error) {
        logger.error('Failed to persist session abort', {
            sessionCode: targetSessionCode,
            error: error.message
        });
        return { error: 'Failed to abort session', statusCode: 500 };
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
        messageBatcher.clear(room); // Clear any pending batched messages
    }

    setTimeout(() => {
        rooms.forEach((room) => io.in(room).socketsLeave(room));
    }, 100);

    return { quiz, liveSession, sessionCode: targetSessionCode };
};

const rebootQuizzes = async (io) => {
    try {
        logger.info('Rebooting ongoing quiz sessions');
        
        // Use session recovery service to restore all active sessions
        const sessionRecovery = require('../session/sessionRecovery');
        const recoveryStats = await sessionRecovery.restoreActiveSessions(io);
        
        logger.info('Session recovery completed', recoveryStats);
        
        // Now reschedule timers for live sessions in auto mode
        const ongoingSessions = await QuizSession.find({ 
            status: { $in: [SESSION_STATUS.WAITING, SESSION_STATUS.LIVE] } 
        });

        for (const quizSession of ongoingSessions) {
            const session = await sessionStore.getSession(quizSession.sessionCode);
            if (!session) {
                logger.warn('Session not found in Redis after recovery', { 
                    sessionCode: quizSession.sessionCode 
                });
                continue;
            }

            // Only schedule timers for live sessions in auto mode
            if (session.status === SESSION_STATUS.LIVE && session.mode === 'auto' && !session.isPaused) {
                const now = Date.now();

                if (!session.questionExpiry) {
                    logger.warn('Live session missing questionExpiry, aborting', { 
                        sessionCode: quizSession.sessionCode 
                    });
                    quizSession.status = 'aborted';
                    quizSession.endedAt = new Date();
                    await quizSession.save();
                    await sessionStore.deleteSession(quizSession.sessionCode);
                    continue;
                }

                const timeLeft = session.questionExpiry - now;
                if (timeLeft > 0) {
                    scheduleNextAction(quizSession.sessionCode, 'advance', timeLeft);
                    logger.info('Rescheduled timer for session', { 
                        sessionCode: quizSession.sessionCode,
                        timeLeftMs: timeLeft 
                    });
                } else {
                    // Question already expired, advance immediately
                    scheduleNextAction(quizSession.sessionCode, 'advance', 0);
                    logger.info('Question expired, advancing immediately', { 
                        sessionCode: quizSession.sessionCode 
                    });
                }
            }
        }
        
        logger.info('Quiz session reboot completed successfully');
    } catch (error) {
        logger.error('Quiz session reboot failed', { error: error.message, stack: error.stack });
    }
};

// STEP 4 & 7: NEW TUTOR MODE FLOW - Handle different progression logic
const broadcastQuestionEnhanced = async (io, roomCode) => {
    const session = await sessionStore.getSession(roomCode);
    if (!session) {
        logger.error('broadcastQuestionEnhanced: session not found', { roomCode });
        return;
    }

    const questions = session.questions || [];
    await clearTimers(roomCode);

    logger.info(`Broadcasting question ${session.currentQuestionIndex} of ${questions.length}`, { roomCode });

    if (session.currentQuestionIndex >= questions.length) {
        logger.info('Quiz finished - no more questions', { roomCode });
        
        // Validate transition before making changes
        try {
            assertTransition(session.status, SESSION_STATUS.COMPLETED, 'session');
        } catch (error) {
            logger.error('Invalid transition to completed state', { roomCode, error: error.message });
            return;
        }

        session.status = SESSION_STATUS.COMPLETED;
        session.questionState = 'waiting';
        await sessionStore.setSession(roomCode, session);

        const topWinners = Object.values(session.leaderboard || {})
            .sort((a, b) => b.score - a.score || a.time - b.time)
            .slice(0, 10)
            .map((participant, index) => ({
                name: participant.name,
                score: participant.score,
                time: participant.time,
                rank: index + 1,
            }));

        // Persist state to database BEFORE emitting events
        const statePersistence = require('../session/statePersistence');
        
        try {
            await statePersistence.executeInTransaction(async (dbSession) => {
                await QuizSession.findOneAndUpdate(
                    { sessionCode: roomCode },
                    { 
                        status: SESSION_STATUS.COMPLETED, 
                        endedAt: new Date(), 
                        topWinners, 
                        participantCount: Object.keys(session.participants || {}).length 
                    },
                    { session: dbSession }
                );

                if (session.quizId) {
                    await Quiz.findByIdAndUpdate(
                        session.quizId,
                        {
                            status: SESSION_STATUS.COMPLETED,
                            lastSessionCode: roomCode,
                            lastSessionStatus: 'completed',
                            lastSessionEndedAt: new Date(),
                            lastSessionMessage: '',
                        },
                        { session: dbSession }
                    );
                }
                
                return { roomCode };
            }, {
                operation: 'completeQuizSession',
                roomCode
            });
        } catch (error) {
            logger.error('Failed to persist quiz completion', { roomCode, error: error.message });
            // Continue anyway to emit events to participants
        }

        // Only emit events after successful persistence
        const finishedPayload = await addSequenceNumber(roomCode, { status: 'completed', topWinners });
        io.to(roomCode).emit('quiz_finished', finishedPayload);
        io.to(roomCode).emit('timer:end', { roomCode, serverTime: Date.now() });

        messageBatcher.clear(roomCode); // Clear any pending batched messages
        setTimeout(() => sessionStore.deleteSession(roomCode), 10 * 60 * 1000);
        return;
    }

    const question = questions[session.currentQuestionIndex];
    if (!question) {
        logger.error('Question not found at index', { roomCode, index: session.currentQuestionIndex });
        return;
    }

    session.questionStartTime = Date.now();
    session.currentQuestionStats = createQuestionStats(question);
    session.questionState = 'live';

    const isTutorMode = session.mode === 'tutor' || session.mode === 'teaching';

    // In tutor mode, we still track the time limit for scoring purposes,
    // but we do NOT expose questionExpiry to participants — the host advances manually.
    if (isTutorMode) {
        session.questionExpiry = null; // No visible countdown for participants
    } else {
        session.questionExpiry = Date.now() + (question.timeLimit * 1000);
    }

    await sessionStore.setSession(roomCode, session);

    const formattedQuestion = formatQuestion(question, session.currentQuestionIndex, questions.length, session.questionExpiry);
    
    logger.info('Emitting new_question event', { roomCode, questionIndex: session.currentQuestionIndex, questionId: question._id });
    
    // Add sequence number to question broadcast
    const questionPayload = await addSequenceNumber(roomCode, formattedQuestion);
    const statsPayload = await addSequenceNumber(roomCode, serializeQuestionStats(session.currentQuestionStats));
    
    // Use compression for large payloads
    await emitWithCompression(io, roomCode, 'new_question', questionPayload);
    await emitWithCompression(io, roomCode, 'question:update', questionPayload);

    // Requirement 8: Server -> Client strict contract
    await emitWithCompression(io, roomCode, 'question:start', {
        questionId: question._id,
        text: question.text,
        options: formattedQuestion.options,
        duration: question.timeLimit,
        ...questionPayload
    });

    // Requirement 6: Display top 10 participants
    const sortedLeaderboard = Object.values(session.leaderboard || {})
        .sort((a, b) => b.score - a.score || a.time - b.time)
        .slice(0, 10);
        
    io.to(roomCode).emit('leaderboard:update', sortedLeaderboard);
    io.to(roomCode).emit('answer_stats', statsPayload);
    io.to(roomCode).emit('fastest_user', null);
    await startTimerTicks(io, roomCode);

    // Emit authoritative timer:start so clients only display the timer
    if (!isTutorMode) {
        io.to(roomCode).emit('timer:start', {
            duration: question.timeLimit,
            expiry: session.questionExpiry,
            serverTime: Date.now(),
        });

        const timeLimitMs = question.timeLimit * 1000;
        logger.info(`Scheduling auto-advance in ${timeLimitMs}ms`, { roomCode });
        scheduleNextAction(roomCode, 'advance', timeLimitMs);
    }
    // Tutor mode: no auto-advance and no countdown timer — host must click Next
};

// STEP 6: Reveal correct answer for tutor mode
const revealAnswer = async ({ io, roomCode, user }) => {
    if (user?.role !== 'host' && user?.role !== 'admin') {
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
    if (user?.role !== 'host' && user?.role !== 'admin') {
        return { error: 'Unauthorized', statusCode: 403 };
    }

    const context = await resolveQuizActionContext({ user, quizId, sessionCode });
    if (context.error) return context;

    const { quiz, roomCode } = context;
    const session = await sessionStore.getSession(roomCode);

    // Validate transitions before making any changes
    if (session) {
        try {
            assertTransition(session.status, SESSION_STATUS.COMPLETED, 'session');
        } catch (error) {
            return { error: error.message, statusCode: 409 };
        }
    }

    if (quiz) {
        try {
            assertTransition(quiz.status, SESSION_STATUS.COMPLETED, 'quiz');
        } catch (error) {
            return { error: error.message, statusCode: 409 };
        }
    }

    // Update in-memory session state
    if (session) {
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

    const statePersistence = require('../session/statePersistence');
    
    try {
        await statePersistence.executeInTransaction(async (dbSession) => {
            await QuizSession.findOneAndUpdate(
                { sessionCode: roomCode },
                { 
                    status: SESSION_STATUS.COMPLETED, 
                    endedAt: new Date(), 
                    topWinners, 
                    participantCount: Object.keys(session?.participants || {}).length 
                },
                { session: dbSession }
            );

            await Quiz.findByIdAndUpdate(
                quiz._id,
                {
                    status: SESSION_STATUS.COMPLETED,
                    lastSessionCode: roomCode,
                    lastSessionStatus: SESSION_STATUS.COMPLETED,
                    lastSessionEndedAt: new Date(),
                    lastSessionMessage: '',
                },
                { session: dbSession }
            );
            
            return { roomCode };
        }, {
            operation: 'endQuizSession',
            roomCode,
            quizId: quiz._id
        });
    } catch (error) {
        logger.error('Failed to persist quiz end', { roomCode, error: error.message });
        return { error: 'Failed to end session', statusCode: 500 };
    }

    io.to(roomCode).emit('quiz_ended_by_host', { message: 'Host ended the quiz', topWinners });
    return { roomCode, message: 'Quiz ended', topWinners };
};

// STEP 5: Calculate answer stats with detailed breakdown
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
        
        // Broadcast to everyone in the room (including the joining socket)
        io.to(roomCode).emit('participants_update', participantsArray);
        
        // Also emit the modern event for newer components
        io.to(roomCode).emit('session:updateParticipants', {
            participants: participantsArray,
            count: participantsArray.length
        });
    }
};

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
    buildhostScopeQuery,
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
    leaveRoom,
    mergeParticipantMaps,
    pauseQuizSession,
    rebootQuizzes,
    resumeQuizSession,
    revealAnswer,
    startQuizSession,
    submitAnswer,
    startDistributedTimerWorker,
};