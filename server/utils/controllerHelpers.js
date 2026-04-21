const mongoose = require('mongoose');
const Quiz = require('../models/Quiz');
const QuizSession = require('../models/QuizSession');

const ALLOWED_QUIZ_CATEGORIES = ['regular', 'internal', 'external', 'subject-syllabus', 'hackathon', 'interview'];

const buildQuizAccessQuery = (req, id, extra = {}) => (
    req.user.role === 'admin'
        ? { _id: id, ...extra }
        : { _id: id, hostId: req.user._id, ...extra }
);

const buildhostScopeQuery = (req, extra = {}) => (
    req.user.role === 'admin'
        ? { ...extra }
        : { hostId: req.user._id, ...extra }
);

const { sendSuccess, sendError } = require('./responseHelper');

const resolveTemplateIdParam = (params = {}) => params.templateId || params.quizId || params.id;

const normalizeSessionMode = (mode) => {
    if (mode === 'teaching') return 'tutor';
    if (mode === 'tutor' || mode === 'auto') return mode;
    return 'auto';
};

const buildTemplateSnapshot = (quiz) => ({
    title: quiz?.title || '',
    mode: normalizeSessionMode(quiz?.mode),
    accessType: quiz?.accessType || 'public',
    shuffleQuestions: Boolean(quiz?.shuffleQuestions),
    questions: (quiz?.questions || []).map((question) => ({
        _id: question?._id,
        text: question?.text || '',
        options: Array.isArray(question?.options) ? [...question.options] : [],
        correctOption: Number.isInteger(question?.correctOption) ? question.correctOption : 0,
        hashedCorrectAnswer: question?.hashedCorrectAnswer || '',
        timeLimit: Number(question?.timeLimit) || 15,
        shuffleOptions: Boolean(question?.shuffleOptions),
        questionType: question?.questionType || 'multiple-choice',
        mediaUrl: question?.mediaUrl || null,
    })),
});

const findSessionByIdentifier = async ({ sessionId, sessionCode }) => {
    if (sessionId && mongoose.Types.ObjectId.isValid(sessionId)) {
        const byId = await QuizSession.findById(sessionId);
        if (byId) return byId;
    }

    const normalizedCode = String(sessionCode || sessionId || '').trim().toUpperCase();
    if (!normalizedCode) return null;
    return QuizSession.findOne({ sessionCode: normalizedCode });
};

const getManagedQuizOrError = async (req, id) => {
    const quiz = await Quiz.findById(id);
    if (!quiz) return { error: 'Quiz not found', statusCode: 404 };

    if (req.user.role !== 'admin' && quiz.hostId.toString() !== req.user._id.toString()) {
        return { error: 'Forbidden', statusCode: 403 };
    }

    return { quiz };
};

module.exports = {
    ALLOWED_QUIZ_CATEGORIES,
    buildQuizAccessQuery,
    buildhostScopeQuery,
    sendSuccess,
    sendError,
    resolveTemplateIdParam,
    normalizeSessionMode,
    buildTemplateSnapshot,
    findSessionByIdentifier,
    getManagedQuizOrError,
};
