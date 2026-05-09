const Quiz = require('../models/Quiz');
const QuizSession = require('../models/QuizSession');
const User = require('../models/User');
const sessionStore = require('../services/session/session.service');
const { generateCode } = require('../utils/codeGenerator');
const logger = require('../utils/logger');
const quizService = require('../services/quiz/quiz.service');
const { SESSION_STATUS, assertTransition, canTransition, normalizeSessionStatus } = require('../utils/sessionStateMachine');
const { resolveHostSubscriptionEntitlements } = require('../utils/subscriptionEntitlements');
const templateService = require('../services/quiz/template.service');
const { 
    sendSuccess, 
    sendError, 
    resolveTemplateIdParam, 
    normalizeSessionMode, 
    buildTemplateSnapshot,
    getManagedQuizOrError,
} = require('../utils/controllerHelpers');

const startQuizSession = async (req, res) => {
    try {
        const templateId = resolveTemplateIdParam(req.params);
        const { accessType, allowedEmails, sharedWith } = req.body || {}; 
        const quizResult = await getManagedQuizOrError(req, templateId);
        if (quizResult.error) return sendError(res, quizResult.error, quizResult.statusCode || 400);
        const { quiz } = quizResult;
        const currentStatus = normalizeSessionStatus(quiz.status);

        if (quiz.status !== currentStatus) {
            quiz.status = currentStatus;
            await quiz.save();
        }

        if (!canTransition(currentStatus, SESSION_STATUS.WAITING) && currentStatus !== SESSION_STATUS.WAITING) {
            return sendError(res, `Invalid quiz state transition: ${currentStatus} -> ${SESSION_STATUS.WAITING}`, 409);
        }

        let entitlements = { plan: 'FREE', maxConcurrentSessions: 1, maxParticipantsPerSession: 200, commissionPercent: 25 };
        try {
            entitlements = await resolveHostSubscriptionEntitlements(req.user?._id);
            const activeSessionCount = await QuizSession.countDocuments({
                hostId: req.user?._id,
                status: { $in: [SESSION_STATUS.WAITING, SESSION_STATUS.LIVE, 'ongoing'] }
            });

            if (activeSessionCount >= entitlements.maxConcurrentSessions) {
                return sendError(res, `Plan Limit Reached: Your ${entitlements.plan} plan allows ${entitlements.maxConcurrentSessions} concurrent session. Please end active sessions or upgrade to start more.`, 403);
            }
        } catch (err) {
            logger.warn('Subscription check failed in startQuizSession, defaulting to FREE limits', { error: err.message });
        }

        const existingSession = await QuizSession.findOne({ quizId: quiz._id, status: { $in: [SESSION_STATUS.SCHEDULED, SESSION_STATUS.WAITING, SESSION_STATUS.LIVE, 'ongoing'] } });
        if (existingSession) {
            const existingStatus = normalizeSessionStatus(existingSession.status);
            if (existingSession.status !== existingStatus) {
                existingSession.status = existingStatus;
                await existingSession.save();
            }
            await Quiz.findByIdAndUpdate(quiz._id, { status: existingStatus });
            return sendSuccess(res, {
                ...quiz.toObject(),
                sessionCode: existingSession.sessionCode,
                sessionId: existingSession._id,
                activeSessionId: existingSession._id,
                status: existingStatus,
            }, 'Existing session reused');
        }

        const hostConfig = await templateService.getDefaultTemplate(req.user._id);
        const snapshot = buildTemplateSnapshot(quiz, hostConfig);

        let session;
        let attempts = 0;
        while (!session && attempts < 5) {
            attempts++;
            const sessionCode = generateCode();
            try {
                const sessionData = {
                    hostId: req.user?._id,
                    templateId: quiz._id,
                    quizId: quiz._id,
                    templateSnapshot: snapshot,
                    sessionCode,
                    status: SESSION_STATUS.WAITING,
                    mode: normalizeSessionMode(quiz.mode),
                    startedAt: new Date(),
                    participantLimit: entitlements?.maxParticipantsPerSession || 200,
                    commissionPercent: entitlements?.commissionPercent || 25,
                    disableDetailedAnalytics: Array.isArray(snapshot) && snapshot.length > 100,
                };

                if (accessType !== undefined) sessionData.accessType = accessType;
                if (allowedEmails !== undefined) sessionData.allowedEmails = allowedEmails;
                if (sharedWith !== undefined) sessionData.sharedWith = sharedWith;

                session = await QuizSession.create(sessionData);
            } catch (err) {
                if (err?.code === 11000) continue; 
                throw err;
            }
        }
        if (!session) {
            return sendError(res, 'Unable to allocate unique session code', 409);
        }

        assertTransition(currentStatus, SESSION_STATUS.WAITING, 'quiz');
        await sessionStore.deleteSession(session.sessionCode);
        await Quiz.findByIdAndUpdate(quiz._id, { status: SESSION_STATUS.WAITING });

        return sendSuccess(res, {
            ...quiz.toObject(),
            sessionCode: session.sessionCode,
            sessionId: session._id,
            activeSessionId: session._id,
            status: SESSION_STATUS.WAITING,
        }, 'Session started');
    } catch (error) {
        logger.error('[SessionController] startQuizSession', { message: error.message, stack: error.stack });
        return sendError(res, error.message || 'Server Error', 500);
    }
};



const abortSession = async (req, res) => {
    try {
        const { id } = req.params;
        const { sessionCode } = req.body;
        const io = req.app.get('io');
        const result = await quizService.abortQuizSession({
            io,
            quizId: id,
            sessionCode,
            user: req.user,
            message: 'Admin aborted the quiz.',
        });

        if (result.error) {
            const statusCode = result.statusCode || (result.error === 'Quiz not found' ? 404 : 409);
            return sendError(res, result.error, statusCode);
        }

        logger.audit('quiz.session.aborted', {
            requestId: req.requestId,
            userId: req.user?._id,
            quizId: id,
            sessionCode: result.sessionCode || sessionCode || null,
        });

        return sendSuccess(res, {
            quizId: id,
            sessionCode: result.sessionCode || sessionCode || null,
            status: SESSION_STATUS.ABORTED,
        }, 'Session aborted');
    } catch (error) {
        logger.error('[SessionController] abortSession', { message: error.message, stack: error.stack });
        return sendError(res, 'Server Error', 500);
    }
};



const nextQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { sessionCode } = req.body;

        const result = await quizService.advanceQuizQuestion({ io: req.app.get('io'), quizId: id, sessionCode, user: req.user });
        if (result.error) return sendError(res, result.error, result.error === 'Quiz not found' ? 404 : 400);

        return sendSuccess(res, null, 'Advanced to next question');
    } catch (error) {
        logger.error('[SessionController] nextQuestion', { message: error.message, stack: error.stack });
        return sendError(res, 'Server Error', 500);
    }
};

const revealAnswer = async (req, res) => {
    try {
        const { sessionCode } = req.body;
        const io = req.app.get('io');

        const result = await quizService.revealAnswer({ io, roomCode: sessionCode, user: req.user });
        if (result.error) return sendError(res, result.error, 400);

        return sendSuccess(res, result, 'Answer revealed');
    } catch (error) {
        logger.error('[SessionController] revealAnswer', { message: error.message, stack: error.stack });
        return sendError(res, 'Server Error', 500);
    }
};



const getAnswerStats = async (req, res) => {
    try {
        const { sessionCode } = req.params;
        const session = await sessionStore.getSession(sessionCode);
        if (!session) return sendError(res, 'Session not found', 404);

        const stats = await quizService.calculateAnswerStats(sessionCode, session.currentQuestionIndex);
        if (!stats) return sendError(res, 'No stats available for current question', 400);

        return sendSuccess(res, stats);
    } catch (error) {
        logger.error('[SessionController] getAnswerStats', { message: error.message, stack: error.stack });
        return sendError(res, 'Server Error', 500);
    }
};

const getSessionState = async (req, res) => {
    try {
        const { code, sessionCode } = req.params;
        const targetCode = code || sessionCode;
        const normalizedCode = String(targetCode || '').trim().toUpperCase();
        
        const session = await sessionStore.getSession(normalizedCode);
        if (!session) return sendError(res, 'Session not found', 404);

        const currentQuestionIndex = session.currentQuestionIndex ?? 0;
        const question = session.questions?.[currentQuestionIndex];
        
        const currentQuestion = question ? {
            _id: question._id,
            text: question.text,
            options: question.options,
            timeLimit: question.timeLimit,
            mediaUrl: question.mediaUrl,
            questionType: question.questionType,
            index: currentQuestionIndex,
            total: session.questions.length,
            expiry: session.questionExpiry,
        } : null;

        const leaderboard = Object.values(session.leaderboard || {})
            .sort((a, b) => b.score - a.score || a.time - b.time)
            .slice(0, 10);

        const participants = Object.values(session.participants || {});

        return sendSuccess(res, {
            sessionCode: normalizedCode,
            status: session.status,
            mode: session.mode,
            isPaused: session.isPaused || false,
            currentQuestionIndex,
            currentQuestion,
            questionState: session.questionState || 'waiting',
            leaderboard,
            participants,
            participantCount: participants.length,
            sequenceNumber: session.sequenceNumber || 0,
            timestamp: Date.now(),
            answerStats: session.currentQuestionStats ? {
                questionId: session.currentQuestionStats.questionId,
                optionCounts: session.currentQuestionStats.optionCounts || {},
                totalAnswers: session.currentQuestionStats.totalAnswers || 0,
                fastestUser: session.currentQuestionStats.fastestUser || null,
            } : null,
        });
    } catch (error) {
        logger.error('[SessionController] getSessionState', { code: req.params.code, message: error.message, stack: error.stack });
        return sendError(res, 'Server Error', 500);
    }
};

const scheduleQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        const { scheduledAt, accessType, allowedEmails, sharedWith } = req.body;

        if (!scheduledAt) return sendError(res, 'scheduledAt date-time is required', 400);
        const scheduled = new Date(scheduledAt);
        if (isNaN(scheduled.getTime()) || scheduled <= new Date()) {
            return sendError(res, 'scheduledAt must be a valid future date-time', 400);
        }

        const quizResult = await getManagedQuizOrError(req, id);
        if (quizResult.error) return sendError(res, quizResult.error, quizResult.statusCode || 400);
        const { quiz } = quizResult;
        const currentStatus = normalizeSessionStatus(quiz.status);

        if (quiz.status !== currentStatus) {
            quiz.status = currentStatus;
            await quiz.save();
        }

        if (!canTransition(currentStatus, SESSION_STATUS.SCHEDULED) && currentStatus !== SESSION_STATUS.SCHEDULED) {
            return sendError(res, `Invalid quiz state transition: ${currentStatus} -> ${SESSION_STATUS.SCHEDULED}`, 409);
        }

        quiz.scheduledAt = scheduled;
        quiz.status = SESSION_STATUS.SCHEDULED;
        quiz.lastSessionStatus = null;
        quiz.lastSessionEndedAt = null;
        quiz.lastSessionMessage = '';
        await quiz.save();

        let scheduledSession = await QuizSession.findOne({ quizId: quiz._id, status: { $in: [SESSION_STATUS.SCHEDULED, SESSION_STATUS.WAITING] } })
            .sort({ startedAt: -1 });
        if (!scheduledSession) {
            let attempts = 0;
            while (!scheduledSession && attempts < 5) {
                attempts += 1;
                try {
                    const hostConfig = await templateService.getDefaultTemplate(req.user._id);
                    const sessionData = {
                        templateId: quiz._id,
                        quizId: quiz._id,
                        templateSnapshot: buildTemplateSnapshot(quiz, hostConfig),
                        sessionCode: generateCode(),
                        status: SESSION_STATUS.SCHEDULED,
                        mode: normalizeSessionMode(quiz.mode),
                        startedAt: scheduled,
                        disableDetailedAnalytics: quiz.questions && quiz.questions.length > 100,
                    };
                    if (accessType !== undefined) sessionData.accessType = accessType;
                    if (allowedEmails !== undefined) sessionData.allowedEmails = allowedEmails;
                    if (sharedWith !== undefined) sessionData.sharedWith = sharedWith;
                    scheduledSession = await QuizSession.create(sessionData);
                } catch (err) {
                    if (err?.code === 11000) continue;
                    throw err;
                }
            }
        } else if (scheduledSession.status !== SESSION_STATUS.SCHEDULED) {
            if (!canTransition(scheduledSession.status, SESSION_STATUS.SCHEDULED)) {
                return sendError(res, `Invalid session state transition: ${scheduledSession.status} -> ${SESSION_STATUS.SCHEDULED}`, 409);
            }
            scheduledSession.status = SESSION_STATUS.SCHEDULED;
            await scheduledSession.save();
        }

        return sendSuccess(res, {
            ...quiz.toObject(),
            sessionCode: scheduledSession?.sessionCode || null,
            sessionId: scheduledSession?._id || null,
            status: SESSION_STATUS.SCHEDULED,
        }, 'Quiz scheduled');
    } catch (error) {
        logger.error('[SessionController] scheduleQuiz', { message: error.message, stack: error.stack });
        return sendError(res, 'Server Error', 500);
    }
};

const joinScheduledSession = async (req, res) => {
    try {
        const { roomCode } = req.params;
        const userId = req.user._id;
        let userName = req.user.name;

        const quiz = await Quiz.findOne({ roomCode });
        if (!quiz) return sendError(res, 'Quiz not found', 404);

        const activeSession = await QuizSession.findOne({
            quizId: quiz._id,
            status: { $in: [SESSION_STATUS.SCHEDULED, SESSION_STATUS.WAITING, SESSION_STATUS.LIVE] },
        }).sort({ startedAt: -1 }).lean();

        if (!activeSession) return sendError(res, 'Cannot join: session is not available.', 400);

        if (!userName) {
            const participant = await User.findById(userId).select('name').lean();
            userName = participant?.name || 'Participant';
        }

        const alreadyJoined = quiz.joinedParticipants.some(p => p.userId.toString() === userId.toString());
        if (!alreadyJoined) {
            quiz.joinedParticipants.push({ userId, name: userName, joinedAt: new Date() });
            await quiz.save();
        }

        return sendSuccess(res, {
            quizId: quiz._id,
            title: quiz.title,
            roomCode: activeSession.sessionCode,
            scheduledAt: quiz.scheduledAt,
            joinedAt: quiz.joinedParticipants.find(p => p.userId.toString() === userId.toString())?.joinedAt,
        });
    } catch (error) {
        logger.error('[SessionController] joinScheduledSession', { message: error.message, stack: error.stack });
        return sendError(res, 'Server Error', 500);
    }
};

const getMyScheduledJoins = async (req, res) => {
    try {
        const userId = req.user._id;
        const quizzes = await Quiz.find(
            { 'joinedParticipants.userId': userId },
            { title: 1, roomCode: 1, scheduledAt: 1, status: 1, hostId: 1, lastSessionStatus: 1, lastSessionEndedAt: 1, lastSessionMessage: 1, lastSessionCode: 1, 'joinedParticipants.$': 1 }
        ).sort({ scheduledAt: 1 });

        const quizIds = quizzes.map((quiz) => quiz._id);
        const sessions = quizIds.length
            ? await QuizSession.find({ quizId: { $in: quizIds } })
                .sort({ startedAt: -1 })
                .select('quizId sessionCode status')
                .lean()
            : [];
        const latestSessionMap = {};
        sessions.forEach((session) => {
            const key = session.quizId.toString();
            if (!latestSessionMap[key]) latestSessionMap[key] = session;
        });

        const result = quizzes.map(q => ({
            quizId: q._id,
            title: q.title,
            roomCode: latestSessionMap[q._id.toString()]?.sessionCode || q.roomCode,
            scheduledAt: q.scheduledAt,
            status: q.status,
            lastSessionEndedAt: q.lastSessionEndedAt || null,
            message: q.lastSessionMessage || '',
            joinedAt: q.joinedParticipants[0]?.joinedAt,
        }));

        return sendSuccess(res, result);
    } catch (error) {
        logger.error('[SessionController] getMyScheduledJoins', { message: error.message, stack: error.stack });
        return sendError(res, 'Server Error', 500);
    }
};

module.exports = {
    startQuizSession,
    abortSession,
    nextQuestion,
    revealAnswer,
    getAnswerStats,
    getSessionState,
    scheduleQuiz,
    joinScheduledSession,
    getMyScheduledJoins,
};
