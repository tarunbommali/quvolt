const Submission = require('../../models/Submission');
const { toObjectId } = require('./analytics.utils');
const { snapshotAnalytics } = require('./analytics.snapshot.service');

const getUserAnalytics = async (userId) => {
    const userObjectId = toObjectId(userId);
    if (!userObjectId) throw new Error('Invalid userId');

    const [overall, quizBreakdown, performanceOverTime, recentSubmissions] = await Promise.all([
        Submission.aggregate([
            { $match: { userId: userObjectId } },
            {
                $group: {
                    _id: null,
                    totalAnswers: { $sum: 1 },
                    correctAnswers: { $sum: { $cond: ['$isCorrect', 1, 0] } },
                    avgTime: { $avg: '$timeTaken' },
                    avgScore: { $avg: '$score' },
                    quizzesPlayed: { $addToSet: '$quizId' },
                },
            },
            {
                $project: {
                    _id: 0,
                    totalAnswers: 1,
                    correctAnswers: 1,
                    avgTime: 1,
                    avgScore: 1,
                    quizzesPlayed: { $size: '$quizzesPlayed' },
                },
            },
        ]),
        Submission.aggregate([
            { $match: { userId: userObjectId } },
            {
                $group: {
                    _id: '$quizId',
                    total: { $sum: 1 },
                    correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
                    avgTime: { $avg: '$timeTaken' },
                    avgScore: { $avg: '$score' },
                },
            },
            {
                $lookup: {
                    from: 'quizzes',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'quiz',
                },
            },
            { $unwind: { path: '$quiz', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    quizId: '$_id',
                    title: '$quiz.title',
                    total: 1,
                    correct: 1,
                    avgTime: 1,
                    avgScore: 1,
                    accuracy: {
                        $multiply: [
                            {
                                $cond: [
                                    { $eq: ['$total', 0] },
                                    0,
                                    { $divide: ['$correct', '$total'] },
                                ],
                            },
                            100,
                        ],
                    },
                },
            },
            { $sort: { accuracy: -1 } },
        ]),
        Submission.aggregate([
            { $match: { userId: userObjectId } },
            {
                $group: {
                    _id: {
                        day: {
                            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                        },
                    },
                    total: { $sum: 1 },
                    correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
                    avgTime: { $avg: '$timeTaken' },
                    avgScore: { $avg: '$score' },
                },
            },
            {
                $project: {
                    _id: 0,
                    label: '$_id.day',
                    total: 1,
                    accuracy: {
                        $multiply: [
                            {
                                $cond: [
                                    { $eq: ['$total', 0] },
                                    0,
                                    { $divide: ['$correct', '$total'] },
                                ],
                            },
                            100,
                        ],
                    },
                    avgTime: 1,
                    avgScore: 1,
                },
            },
            { $sort: { label: 1 } },
        ]),
        Submission.find({ userId: userObjectId })
            .select('quizId questionId isCorrect score timeTaken createdAt')
            .sort({ createdAt: -1 })
            .limit(50)
            .lean(),
    ]);

    const summary = overall[0] || {
        totalAnswers: 0,
        correctAnswers: 0,
        avgTime: 0,
        avgScore: 0,
        quizzesPlayed: 0,
    };

    const payload = {
        summary: {
            totalAnswers: summary.totalAnswers,
            correctAnswers: summary.correctAnswers,
            wrongAnswers: Math.max(summary.totalAnswers - summary.correctAnswers, 0),
            accuracyPercent: summary.totalAnswers ? Number(((summary.correctAnswers / summary.totalAnswers) * 100).toFixed(2)) : 0,
            avgTime: Number((summary.avgTime || 0).toFixed(2)),
            avgScore: Number((summary.avgScore || 0).toFixed(2)),
            quizzesPlayed: summary.quizzesPlayed,
        },
        quizBreakdown: quizBreakdown.map((row) => ({
            ...row,
            quizId: row.quizId?.toString?.() || String(row.quizId),
            title: row.title || 'Untitled Quiz',
            accuracy: Number((row.accuracy || 0).toFixed(2)),
            avgTime: Number((row.avgTime || 0).toFixed(2)),
            avgScore: Number((row.avgScore || 0).toFixed(2)),
        })),
        performanceOverTime: performanceOverTime.map((row) => ({
            ...row,
            accuracy: Number((row.accuracy || 0).toFixed(2)),
            avgTime: Number((row.avgTime || 0).toFixed(2)),
            avgScore: Number((row.avgScore || 0).toFixed(2)),
        })),
        recentSubmissions,
    };

    await snapshotAnalytics({
        type: 'user',
        userId: userObjectId,
        payload,
    });

    return payload;
};

module.exports = {
    getUserAnalytics,
};
