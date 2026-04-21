const Quiz = require('../models/Quiz');
const QuizSession = require('../models/QuizSession');
const Submission = require('../models/Submission');
const { generateCode } = require('../utils/codeGenerator');
const logger = require('../utils/logger');
const { SESSION_STATUS } = require('../utils/sessionStateMachine');
const { resolveHostSubscriptionEntitlements } = require('../utils/subscriptionEntitlements');
const { 
    ALLOWED_QUIZ_CATEGORIES, 
    buildQuizAccessQuery, 
    buildhostScopeQuery,
} = require('../utils/controllerHelpers');

const createQuiz = async (req, res) => {
    try {
        const { title, type, quizCategory, parentId, isPaid, price, mode, accessType, allowedEmails } = req.body;
        const normalizedType = type || 'quiz';
        const normalizedAccessType = accessType || 'public';

        if (!title || !title.trim()) {
            return res.status(400).json({ message: 'Title is required' });
        }

        if (req.user.role !== 'admin') {
            const entitlements = await resolveHostSubscriptionEntitlements(req.user._id);

            if (normalizedType === 'quiz') {
                const quizCount = await Quiz.countDocuments({
                    hostId: req.user._id,
                    type: 'quiz',
                });

                if (quizCount >= entitlements.maxQuizTemplates) {
                    return res.status(403).json({
                        message: `Your ${entitlements.plan} plan allows up to ${entitlements.maxQuizTemplates} quizzes. Upgrade your subscription to create more.`,
                    });
                }
            }

            if (normalizedAccessType === 'private' && !entitlements.canUsePrivateHosting) {
                return res.status(403).json({
                    message: 'Private session hosting is available on Creator and Teams plans. Upgrade your subscription to continue.',
                });
            }

            if (normalizedType === 'quiz' && Boolean(isPaid) && !entitlements.canCreatePaidQuiz) {
                return res.status(403).json({
                    message: 'Paid quiz creation is available on Creator and Teams plans. Upgrade your subscription to continue.',
                });
            }
        }

        let quiz;
        let attempts = 0;

        while (!quiz && attempts < 5) {
            attempts += 1;
            const roomCode = generateCode();

            try {
                quiz = await Quiz.create({
                    title: title.trim(),
                    hostId: req.user._id,
                    roomCode,
                    type: normalizedType,
                    quizCategory: normalizedType === 'quiz'
                        ? (ALLOWED_QUIZ_CATEGORIES.includes(quizCategory) ? quizCategory : 'regular')
                        : null,
                    parentId: parentId || null,
                    mode: mode === 'teaching' ? 'tutor' : (mode || 'auto'),
                    accessType: normalizedAccessType,
                    allowedEmails: Array.isArray(allowedEmails)
                        ? allowedEmails.map((email) => String(email || '').trim().toLowerCase()).filter(Boolean)
                        : [],
                    isPaid: isPaid || false,
                    price: isPaid ? (price || 0) : 0,
                    shuffleQuestions: false,
                    questions: [],
                });
            } catch (err) {
                if (err?.code === 11000 && err?.keyPattern?.roomCode) {
                    continue;
                }
                throw err;
            }
        }

        if (!quiz) {
            return res.status(409).json({ message: 'Unable to allocate unique room code. Please try again.' });
        }

        res.status(201).json(quiz);
    } catch (error) {
        logger.error('[QuizController] createQuiz', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

const getMyQuizzes = async (req, res) => {
    try {
        const { parentId } = req.query;
        const query = buildhostScopeQuery(req);

        if (parentId === 'none') {
            query.parentId = null;
        } else if (parentId) {
            query.parentId = parentId;
        }

        const quizzes = await Quiz.find(query).sort('-createdAt');
        const quizIds = quizzes.map(q => q._id);
        const activeSessions = quizIds.length > 0
            ? await QuizSession.find({ quizId: { $in: quizIds }, status: { $in: [SESSION_STATUS.SCHEDULED, SESSION_STATUS.WAITING, SESSION_STATUS.LIVE] } })
                .sort({ startedAt: -1 })
                .select('quizId sessionCode startedAt')
                .lean()
            : [];
        const activeSessionMap = {};
        activeSessions.forEach((session) => {
            const quizId = session.quizId.toString();
            if (!activeSessionMap[quizId]) activeSessionMap[quizId] = session;
        });

        const sessionCounts = await Submission.aggregate([
            { $match: { quizId: { $in: quizIds } } },
            { $group: { _id: { quizId: '$quizId', roomCode: '$roomCode' } } },
            { $group: { _id: '$_id.quizId', sessionCount: { $sum: 1 } } }
        ]);
        const sessionCountMap = Object.fromEntries(
            sessionCounts.map(s => [s._id.toString(), s.sessionCount])
        );

        const subjectIds = quizzes.filter(q => q.type === 'subject').map(q => q._id);
        const subDirCounts = subjectIds.length > 0
            ? await Quiz.aggregate([
                { $match: { parentId: { $in: subjectIds } } },
                { $group: { _id: '$parentId', count: { $sum: 1 } } }
            ])
            : [];
        const subDirCountMap = Object.fromEntries(
            subDirCounts.map(s => [s._id.toString(), s.count])
        );

        const enriched = quizzes.map(q => ({
            ...q.toObject(),
            sessionCount: sessionCountMap[q._id.toString()] || 0,
            subDirectoryCount: subDirCountMap[q._id.toString()] || 0,
            activeSessionCode: activeSessionMap[q._id.toString()]?.sessionCode || null,
            activeSessionStartedAt: activeSessionMap[q._id.toString()]?.startedAt || null,
            hasActiveSession: Boolean(activeSessionMap[q._id.toString()]),
        }));

        res.json(enriched);
    } catch (error) {
        logger.error('[QuizController] getMyQuizzes', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

const getQuizByCode = async (req, res) => {
    try {
        const { roomCode } = req.params;
        const code = (roomCode || '').toUpperCase();
        const session = await QuizSession.findOne({
            sessionCode: code,
            status: { $in: [SESSION_STATUS.SCHEDULED, SESSION_STATUS.WAITING, SESSION_STATUS.LIVE, 'completed', 'aborted'] }
        });

        let quiz;
        if (session) {
            quiz = await Quiz.findById(session.quizId).select('-questions.hashedCorrectAnswer -questions.correctOption');
        } else {
            quiz = await Quiz.findOne({ roomCode: code }).select('-questions.hashedCorrectAnswer -questions.correctOption');
        }

        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
        
        const quizObj = quiz.toObject();
        if (session) {
            quizObj.sessionId = session._id;
            quizObj.sessionCode = session.sessionCode;
            quizObj.status = session.status;
        }

        res.json(quizObj);
    } catch (error) {
        logger.error('[QuizController] getQuizByCode', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

const updateQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, status, shuffleQuestions, quizCategory, mode, accessType, allowedEmails } = req.body;
        const updateData = {};

        if (accessType === 'private' && req.user.role !== 'admin') {
            const entitlements = await resolveHostSubscriptionEntitlements(req.user._id);
            if (!entitlements.canUsePrivateHosting) {
                return res.status(403).json({
                    message: 'Private session hosting is available on Creator and Teams plans. Upgrade your subscription to continue.',
                });
            }
        }

        if (title !== undefined) updateData.title = title;
        if (status !== undefined) updateData.status = status;
        if (shuffleQuestions !== undefined) updateData.shuffleQuestions = shuffleQuestions;
        if (quizCategory !== undefined && ALLOWED_QUIZ_CATEGORIES.includes(quizCategory)) {
            updateData.quizCategory = quizCategory;
        }
        if (mode !== undefined) {
            updateData.mode = mode === 'teaching' ? 'tutor' : mode;
        }
        if (accessType !== undefined) {
            updateData.accessType = accessType;
        }
        if (allowedEmails !== undefined && Array.isArray(allowedEmails)) {
            updateData.allowedEmails = allowedEmails
                .map((email) => String(email || '').trim().toLowerCase())
                .filter(Boolean);
        }
        const quiz = await Quiz.findOneAndUpdate(
            buildQuizAccessQuery(req, id),
            updateData,
            { returnDocument: 'after', runValidators: true, new: true }
        );
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
        res.json(quiz);
    } catch (error) {
        logger.error('[QuizController] updateQuiz', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

const deleteQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        const quiz = await Quiz.findOne(buildQuizAccessQuery(req, id));
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        if (quiz.sharedWith && quiz.sharedWith.length > 0) {
            logger.info('Revoking all access grants for deleted quiz', {
                quizId: quiz._id,
                sharedWithCount: quiz.sharedWith.length,
                deletedBy: req.user._id,
            });
        }

        // Cascade delete children if it's a subject
        if (quiz.type === 'subject') {
            const childQuizzes = await Quiz.find({ parentId: id });
            const childIds = childQuizzes.map(q => q._id);
            await Submission.deleteMany({ quizId: { $in: childIds } });
            await QuizSession.deleteMany({ quizId: { $in: childIds } });
            await Quiz.deleteMany({ parentId: id });
        } else {
            await Submission.deleteMany({ quizId: id });
            await QuizSession.deleteMany({ quizId: id });
        }

        await Quiz.deleteOne({ _id: id });
        res.json({ message: 'Quiz deleted successfully' });
    } catch (error) {
        logger.error('[QuizController] deleteQuiz', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

const getQuizSessions = async (req, res) => {
    try {
        const { id, templateId } = req.params;
        const targetId = templateId || id;
        const template = await Quiz.findOne(buildQuizAccessQuery(req, targetId));
        if (!template) return res.status(404).json({ message: 'Template not found' });

        const sessions = await QuizSession.find({
            $or: [
                { templateId: targetId },
                { quizId: targetId },
            ],
        }).sort('-startedAt');
        res.json({ templateId: targetId, templateTitle: template.title, sessions });
    } catch (error) {
        logger.error('[QuizController] getQuizSessions', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    createQuiz,
    getMyQuizzes,
    getQuizByCode,
    updateQuiz,
    deleteQuiz,
    getQuizSessions,
};
