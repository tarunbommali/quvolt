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

const buildTemplateSnapshot = (quiz, config = {}) => ({
    title: quiz?.title || '',
    mode: config.mode || normalizeSessionMode(quiz?.mode),
    accessType: quiz?.accessType || 'public',
    shuffleQuestions: config.flow?.shuffleQuestions ?? Boolean(quiz?.shuffleQuestions),
    
    // --- Engine Configuration (from QuizTemplate) ---
    timer: {
        questionTime: config.timer?.questionTime ?? 15,
        autoNext: config.timer?.autoNext ?? true,
        interQuestionDelay: config.timer?.interQuestionDelay ?? 3,
    },
    scoring: {
        basePoints: config.scoring?.basePoints ?? 100,
        speedBonus: config.scoring?.speedBonus ?? true,
        speedBonusMax: config.scoring?.speedBonusMax ?? 50,
        negativeMarking: {
            enabled: config.scoring?.negativeMarking?.enabled ?? false,
            penalty: config.scoring?.negativeMarking?.penalty ?? 25,
        },
    },
    leaderboard: {
        enabled: config.leaderboard?.enabled ?? true,
        showLive: config.leaderboard?.showLive ?? true,
        showAfterEachQuestion: config.leaderboard?.showAfterEachQuestion ?? true,
    },
    flow: {
        shuffleQuestions: config.flow?.shuffleQuestions ?? false,
        shuffleOptions: config.flow?.shuffleOptions ?? false,
    },
    access: {
        allowLateJoin: config.access?.allowLateJoin ?? true,
        maxParticipants: config.access?.maxParticipants ?? 200,
    },
    advanced: {
        antiCheat: config.advanced?.antiCheat ?? false,
        tabSwitchDetection: config.advanced?.tabSwitchDetection ?? false,
        requireCamera: config.advanced?.requireCamera ?? false,
    },

    // --- Content (from Quiz Blueprint) ---
    questions: (quiz?.questions || []).map((question) => ({
        _id: question?._id,
        text: question?.text || '',
        options: Array.isArray(question?.options) ? [...question.options] : [],
        correctOption: Number.isInteger(question?.correctOption) ? question.correctOption : 0,
        hashedCorrectAnswer: question?.hashedCorrectAnswer || '',
        timeLimit: Number(question?.timeLimit) || (config.timer?.questionTime ?? 15),
        shuffleOptions: Boolean(question?.shuffleOptions) || (config.flow?.shuffleOptions ?? false),
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

const applyPagination = async (model, query, options = {}) => {
    const page = parseInt(options.page) || 1;
    const limit = Math.min(parseInt(options.limit) || 10, 50);
    const sortBy = options.sortBy || 'createdAt';
    const order = options.order === 'asc' ? 1 : -1;
    const search = options.search;

    const finalQuery = { ...query };

    if (search && Array.isArray(options.searchFields)) {
        finalQuery.$or = options.searchFields.map((field) => ({
            [field]: { $regex: search, $options: 'i' },
        }));
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
        model.find(finalQuery)
            .sort({ [sortBy]: order })
            .skip(skip)
            .limit(limit)
            .lean(),
        model.countDocuments(finalQuery),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
        data,
        pagination: {
            total,
            page,
            limit,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    };
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
    applyPagination,
};
