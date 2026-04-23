const Quiz = require('../../models/Quiz');
const QuizSession = require('../../models/QuizSession');
const axios = require('axios');
const { SESSION_STATUS } = require('../../utils/sessionStateMachine');

const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:5001';

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
        quiz = await Quiz.findById(liveSession.quizId).lean();
    } else if (normalizedCode) {
        quiz = await Quiz.findOne({ roomCode: normalizedCode }).lean();
    }

    if (!quiz) return { quiz: null, liveSession: null, effectiveRoomCode: roomCode };

    if (!liveSession) {
        liveSession = await QuizSession.findOne({ 
            quizId: quiz._id, 
            status: { $in: [SESSION_STATUS.SCHEDULED, SESSION_STATUS.WAITING, SESSION_STATUS.LIVE] } 
        }).sort({ startedAt: -1 }).lean();
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
            return { error: 'Session not found for this quiz', statusCode: 404 };
        }

        return { quiz, liveSession, roomCode: liveSession?.sessionCode || sessionCode || quiz.roomCode };
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
    try {
        const response = await axios.get(`${PAYMENT_SERVICE_URL}/payment/status/${quizId}`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 5000,
        });
        return Boolean(response.data?.data?.paid);
    } catch (err) {
        return false;
    }
};

module.exports = {
    buildQuizAccessQuery,
    buildhostScopeQuery,
    findQuizAndActiveSession,
    resolveQuizActionContext,
    ensureParticipantHasPaidAccess
};
