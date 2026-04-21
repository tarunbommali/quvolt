const mongoose = require('mongoose');
const Quiz = require('../models/Quiz');
const QuizSession = require('../models/QuizSession');
const Submission = require('../models/Submission');
const logger = require('../utils/logger');
const { 
    getQuizAnalytics: getQuizAnalyticsService,
    getUserAnalytics: getUserAnalyticsService,
    gethostAnalyticsSummary: gethostAnalyticsSummaryService,
} = require('../services/analytics/analytics.service');
const { 
    buildhostScopeQuery,
    findSessionByIdentifier,
    buildTemplateSnapshot,
} = require('../utils/controllerHelpers');
const { sendSuccess, sendError } = require('../utils/responseHelper');

const getSessionResults = async (req, res) => {
    try {
        const { sessionId, sessionCode } = req.params;
        const session = await findSessionByIdentifier({ sessionId, sessionCode });
        if (!session) return res.status(404).json({ message: 'Session not found' });

        const template = await Quiz.findById(session.templateId || session.quizId).select('hostId title questions mode accessType shuffleQuestions').lean();
        if (!template) return res.status(404).json({ message: 'Template not found' });

        const snapshot = session.templateSnapshot || buildTemplateSnapshot(template);

        if (req.user.role !== 'admin' && template.hostId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to view this session\'s results' });
        }

        const submissions = await Submission.find({
            $or: [
                { sessionId: session._id },
                { roomCode: session.sessionCode },
            ],
        });
        const totalParticipants = new Set(submissions.map(s => s.userId.toString())).size;

        const questionStats = (snapshot.questions || []).map((q, index) => {
            const snapshotQuestionId = q._id ? String(q._id) : null;
            const qSubs = submissions.filter((s) => {
                if (!snapshotQuestionId) return false;
                return String(s.questionId) === snapshotQuestionId;
            });
            const optionCounts = {};
            (q.options || []).forEach((opt) => {
                optionCounts[opt] = 0;
            });
            qSubs.forEach((s) => {
                if (optionCounts[s.selectedOption] !== undefined) {
                    optionCounts[s.selectedOption]++;
                }
            });
            const correctOption = (q.options || [])[q.correctOption];
            const optionStats = (q.options || []).map((opt, idx) => ({
                option: opt,
                count: optionCounts[opt] || 0,
                percentage: qSubs.length > 0
                    ? Math.round(((optionCounts[opt] || 0) / qSubs.length) * 100)
                    : 0,
                isCorrect: idx === q.correctOption,
            }));

            return {
                questionId: q._id || `snapshot-${index}`,
                text: q.text,
                totalAnswered: qSubs.length,
                correctOption,
                options: optionStats,
                correctPercentage: qSubs.length > 0
                    ? Math.round(((optionCounts[correctOption] || 0) / qSubs.length) * 100)
                    : 0,
            };
        });

        res.json({
            session,
            quizTitle: snapshot.title || template.title,
            totalParticipants,
            topWinners: session.topWinners,
            questionStats,
        });
    } catch (error) {
        logger.error('[AnalyticsController] getSessionResults', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

const getSessionParticipants = async (req, res) => {
    try {
        const { sessionId, sessionCode } = req.params;
        const session = await findSessionByIdentifier({ sessionId, sessionCode });
        if (!session) return res.status(404).json({ message: 'Session not found' });

        const template = await Quiz.findById(session.templateId || session.quizId).select('title hostId').lean();
        if (!template) return res.status(404).json({ message: 'Template not found' });

        if (req.user.role !== 'admin' && template.hostId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to view this session' });
        }

        const participants = await Submission.aggregate([
            {
                $match: {
                    quizId: session.templateId || session.quizId,
                    $or: [
                        { sessionId: session._id },
                        { roomCode: session.sessionCode }
                    ]
                }
            },
            {
                $group: {
                    _id: '$userId',
                    totalScore: { $sum: '$score' },
                    totalTime: { $sum: '$timeTaken' },
                    answersCount: { $sum: 1 },
                    firstSubmittedAt: { $min: '$createdAt' },
                    lastSubmittedAt: { $max: '$createdAt' }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $project: {
                    _id: 0,
                    userId: '$_id',
                    name: { $ifNull: [{ $arrayElemAt: ['$user.name', 0] }, 'Unknown User'] },
                    email: { $ifNull: [{ $arrayElemAt: ['$user.email', 0] }, ''] },
                    score: '$totalScore',
                    time: '$totalTime',
                    answersCount: 1,
                    firstSubmittedAt: 1,
                    lastSubmittedAt: 1
                }
            },
            { $sort: { score: -1, time: 1, lastSubmittedAt: 1 } }
        ]);

        const rankedParticipants = participants.map((p, index) => ({
            ...p,
            rank: index + 1,
        }));

        res.json({
            quizTitle: template.title,
            sessionCode: session.sessionCode,
            participantCount: rankedParticipants.length,
            participants: rankedParticipants,
        });
    } catch (error) {
        logger.error('[AnalyticsController] getSessionParticipants', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

const escapeCsvValue = (value) => {
    if (value === null || value === undefined) return '';
    const normalized = String(value).replace(/\r?\n|\r/g, ' ');
    return /[",]/.test(normalized) ? `"${normalized.replace(/"/g, '""')}"` : normalized;
};

const exportSessionParticipants = async (req, res) => {
    try {
        const { sessionId, sessionCode } = req.params;
        const session = await findSessionByIdentifier({ sessionId, sessionCode });
        if (!session) return res.status(404).json({ message: 'Session not found' });

        const template = await Quiz.findById(session.templateId || session.quizId).select('title hostId').lean();
        if (!template) return res.status(404).json({ message: 'Template not found' });

        if (req.user.role !== 'admin' && template.hostId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to export this session' });
        }

        const participants = await Submission.aggregate([
            {
                $match: {
                    quizId: session.templateId || session.quizId,
                    $or: [
                        { sessionId: session._id },
                        { roomCode: session.sessionCode }
                    ]
                }
            },
            {
                $group: {
                    _id: '$userId',
                    totalScore: { $sum: '$score' },
                    totalTime: { $sum: '$timeTaken' },
                    answersCount: { $sum: 1 },
                    firstSubmittedAt: { $min: '$createdAt' },
                    lastSubmittedAt: { $max: '$createdAt' }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $project: {
                    _id: 0,
                    name: { $ifNull: [{ $arrayElemAt: ['$user.name', 0] }, 'Unknown User'] },
                    email: { $ifNull: [{ $arrayElemAt: ['$user.email', 0] }, ''] },
                    score: '$totalScore',
                    time: '$totalTime',
                    answersCount: 1,
                    firstSubmittedAt: 1,
                    lastSubmittedAt: 1
                }
            },
            { $sort: { score: -1, time: 1, lastSubmittedAt: 1 } }
        ]);

        const rows = participants.map((entry, index) => [
            index + 1,
            entry.name,
            entry.email,
            entry.score,
            Number(entry.time.toFixed(2)),
            entry.answersCount,
            entry.firstSubmittedAt ? new Date(entry.firstSubmittedAt).toISOString() : '',
            entry.lastSubmittedAt ? new Date(entry.lastSubmittedAt).toISOString() : '',
        ]);

        const header = ['Rank', 'Name', 'Email', 'Score', 'TimeSeconds', 'AnswersSubmitted', 'FirstSubmittedAt', 'LastSubmittedAt'];
        const csv = [header, ...rows].map((row) => row.map(escapeCsvValue).join(',')).join('\n');

        const safeTitle = template.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `${safeTitle || 'quiz'}_${session.sessionCode}_participants.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(200).send(csv);
    } catch (error) {
        logger.error('[AnalyticsController] exportSessionParticipants', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

const getQuizLeaderboard = async (req, res) => {
    try {
        const { id } = req.params;
        const leaderboard = await Submission.aggregate([
            { $match: { quizId: new mongoose.Types.ObjectId(id) } },
            {
                $group: {
                    _id: "$userId",
                    totalScore: { $sum: "$score" },
                    totalTime: { $sum: "$timeTaken" }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: "$user" },
            {
                $project: {
                    name: "$user.name",
                    score: "$totalScore",
                    time: "$totalTime"
                }
            },
            { $sort: { score: -1, time: 1 } },
            { $limit: 10 }
        ]);
        res.json(leaderboard);
    } catch (error) {
        logger.error('[AnalyticsController] getQuizLeaderboard', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

const getSubjectLeaderboard = async (req, res) => {
    try {
        const { subjectId } = req.params;
        const quizzes = await Quiz.find({ parentId: subjectId });
        const quizIds = quizzes.map(q => q._id);

        const leaderboard = await Submission.aggregate([
            { $match: { quizId: { $in: quizIds } } },
            {
                $group: {
                    _id: "$userId",
                    totalScore: { $sum: "$score" },
                    totalTime: { $sum: "$timeTaken" },
                    quizzesTaken: { $addToSet: "$quizId" }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: "$user" },
            {
                $project: {
                    name: "$user.name",
                    score: "$totalScore",
                    time: "$totalTime",
                    count: { $size: "$quizzesTaken" }
                }
            },
            { $sort: { score: -1, time: 1 } },
            { $limit: 10 }
        ]);

        res.json(leaderboard);
    } catch (error) {
        logger.error('[AnalyticsController] getSubjectLeaderboard', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

const gethostStats = async (req, res) => {
    try {
        const quizzes = await Quiz.find(buildhostScopeQuery(req));
        const quizIds = quizzes.map(q => q._id);
        const sessions = await Submission.aggregate([
            { $match: { quizId: { $in: quizIds } } },
            {
                $group: {
                    _id: "$roomCode",
                    quizId: { $first: "$quizId" },
                    participantCount: { $addToSet: "$userId" },
                    totalAnswers: { $count: {} },
                    firstSubmission: { $min: "$createdAt" }
                }
            },
            {
                $lookup: {
                    from: 'quizzes',
                    localField: 'quizId',
                    foreignField: '_id',
                    as: 'quiz'
                }
            },
            { $unwind: "$quiz" },
            { $sort: { firstSubmission: -1 } }
        ]);

        const stats = sessions.map(s => ({
            _id: s._id,
            quizId: s.quizId,
            title: s.quiz.title,
            roomCode: s._id,
            status: 'completed',
            participantCount: s.participantCount.length,
            totalAnswers: s.totalAnswers,
            createdAt: s.firstSubmission
        }));

        res.json(stats);
    } catch (error) {
        logger.error('[AnalyticsController] gethostStats', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

const getUserHistory = async (req, res) => {
    try {
        const submissions = await Submission.find({ userId: req.user._id })
            .populate('quizId', 'title roomCode status questions')
            .populate('sessionId', 'templateSnapshot')
            .sort('-createdAt');

        const history = submissions.reduce((acc, sub) => {
            if (!sub.quizId) return acc;
            const sessionKey = sub.roomCode ? `${sub.quizId._id}_${sub.roomCode}` : sub.quizId._id.toString();
            if (!acc[sessionKey]) {
                acc[sessionKey] = {
                    quizTitle: sub.quizId.title,
                    quizId: sub.quizId._id,
                    roomCode: sub.roomCode,
                    date: sub.createdAt,
                    totalScore: 0,
                    totalTime: 0,
                    answers: []
                };
            }
            const sourceQuestions = sub.sessionId?.templateSnapshot?.questions || sub.quizId.questions || [];
            const question = sourceQuestions.find(q => q._id.toString() === sub.questionId.toString());

            acc[sessionKey].totalScore += sub.score;
            acc[sessionKey].totalTime += sub.timeTaken;
            acc[sessionKey].answers.push({
                questionText: question ? question.text : 'Deleted Question',
                selected: sub.selectedOption,
                score: sub.score,
                isCorrect: sub.isCorrect ?? (sub.score > 0),
                correctAnswer: question ? (question.options?.[question.correctOption] || 'N/A') : 'N/A'
            });
            return acc;
        }, {});

        const abortedJoins = await Quiz.find({
            'joinedParticipants.userId': req.user._id,
            lastSessionStatus: 'aborted',
        }).select('title roomCode lastSessionCode lastSessionEndedAt lastSessionMessage').lean();

        abortedJoins.forEach((quiz) => {
            const room = quiz.lastSessionCode || quiz.roomCode;
            const key = room ? `${quiz._id}_${room}` : quiz._id.toString();
            if (!history[key]) {
                history[key] = {
                    quizTitle: quiz.title,
                    quizId: quiz._id,
                    roomCode: room,
                    date: quiz.lastSessionEndedAt || new Date(),
                    totalScore: 0,
                    totalTime: 0,
                    answers: [],
                    status: 'aborted',
                    message: quiz.lastSessionMessage || 'Admin aborted the quiz.',
                };
            }
        });

        res.json(Object.values(history));
    } catch (error) {
        logger.error('[AnalyticsController] getUserHistory', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

const getQuizAnalytics = async (req, res) => {
    try {
        const { quizId } = req.params;
        const userPlan = req.user.plan || 'FREE';

        if (req.user.role !== 'admin') {
            const ownedQuiz = await Quiz.findOne({ _id: quizId, hostId: req.user._id }).select('_id').lean();
            if (!ownedQuiz) {
                return sendError(res, 'Not authorized to view this quiz analytics', 403);
            }
        }

        const data = await getQuizAnalyticsService(quizId);

        // Plan-based gating (Requirement: Creator SaaS Monetization)
        if (userPlan === 'FREE') {
            // Strip advanced metrics for free plan
            delete data.timeVsScore;
            delete data.dropoff;
            data.isPremiumRestricted = true;
            data.upgradeMessage = 'Upgrade to CREATOR plan to unlock Time vs Score correlation and Drop-off analysis.';
        }

        return sendSuccess(res, data, 'Quiz analytics loaded successfully');
    } catch (error) {
        logger.error('[AnalyticsController] getQuizAnalytics', { message: error.message });
        const statusCode = error.message === 'Quiz not found' ? 404 : 400;
        return sendError(res, error.message || 'Failed to load quiz analytics', statusCode);
    }
};

const getUserAnalytics = async (req, res) => {
    try {
        const userId = req.params.userId || req.user._id;
        
        // Security: non-admins can only see their own analytics
        if (req.user.role !== 'admin' && String(userId) !== String(req.user._id)) {
            return sendError(res, 'Forbidden', 403);
        }

        const data = await getUserAnalyticsService(userId);
        return sendSuccess(res, data, 'User analytics loaded successfully');
    } catch (error) {
        logger.error('[AnalyticsController] getUserAnalytics', { message: error.message });
        return sendError(res, error.message || 'Failed to load user analytics', 400);
    }
};

const gethostAnalyticsSummary = async (req, res) => {
    try {
        const targetUserId = req.user.role === 'admin' && req.query.userId
            ? req.query.userId
            : req.user._id;

        const data = await gethostAnalyticsSummaryService(targetUserId);
        return sendSuccess(res, data, 'Host analytics summary loaded successfully');
    } catch (error) {
        logger.error('[AnalyticsController] gethostAnalyticsSummary', { message: error.message });
        return sendError(res, error.message || 'Failed to load host analytics summary', 400);
    }
};

module.exports = {
    getQuizAnalytics,
    getUserAnalytics,
    gethostAnalyticsSummary,
    getSessionResults,
    getSessionParticipants,
    exportSessionParticipants,
    getQuizLeaderboard,
    getSubjectLeaderboard,
    gethostStats,
    getUserHistory,
};
