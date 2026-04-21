const Submission = require('../../models/Submission');
const Quiz = require('../../models/Quiz');
const { toObjectId, getPearsonCorrelation } = require('./analytics.utils');
const { snapshotAnalytics } = require('./analytics.snapshot.service');

const getQuizAnalytics = async (quizId) => {
    const quizObjectId = toObjectId(quizId);
    if (!quizObjectId) throw new Error('Invalid quizId');

    const quiz = await Quiz.findById(quizObjectId)
        .select('title questions')
        .lean();

    if (!quiz) throw new Error('Quiz not found');

    const questionMap = new Map(
        (quiz.questions || []).map((question, index) => [
            question._id.toString(),
            {
                questionId: question._id.toString(),
                index: index + 1,
                text: question.text,
            },
        ]),
    );

    const [overall, perQuestionAgg, performanceOverTime, scatterPointsRaw, uniqueQuestionAttempts] = await Promise.all([
        Submission.aggregate([
            { $match: { quizId: quizObjectId } },
            {
                $group: {
                    _id: null,
                    totalAnswers: { $sum: 1 },
                    correctAnswers: { $sum: { $cond: ['$isCorrect', 1, 0] } },
                    avgTime: { $avg: '$timeTaken' },
                    avgScore: { $avg: '$score' },
                    participants: { $addToSet: '$userId' },
                },
            },
            {
                $project: {
                    _id: 0,
                    totalAnswers: 1,
                    correctAnswers: 1,
                    avgTime: 1,
                    avgScore: 1,
                    participantCount: { $size: '$participants' },
                },
            },
        ]),
        Submission.aggregate([
            { $match: { quizId: quizObjectId } },
            {
                $group: {
                    _id: '$questionId',
                    total: { $sum: 1 },
                    correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
                    avgTime: { $avg: '$timeTaken' },
                    avgScore: { $avg: '$score' },
                },
            },
            { $sort: { _id: 1 } },
        ]),
        Submission.aggregate([
            { $match: { quizId: quizObjectId } },
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
                    total: 1,
                },
            },
            { $sort: { label: 1 } },
        ]),
        Submission.find({ quizId: quizObjectId })
            .select('timeTaken score isCorrect createdAt')
            .sort({ createdAt: 1 })
            .limit(300)
            .lean(),
        Submission.aggregate([
            { $match: { quizId: quizObjectId } },
            {
                $group: {
                    _id: {
                        userId: '$userId',
                        questionId: '$questionId',
                    },
                    firstAttemptAt: { $min: '$createdAt' },
                },
            },
        ]),
    ]);

    const summary = overall[0] || {
        totalAnswers: 0,
        correctAnswers: 0,
        avgTime: 0,
        avgScore: 0,
        participantCount: 0,
    };

    const questionStats = perQuestionAgg.map((row) => {
        const questionId = row._id.toString();
        const meta = questionMap.get(questionId) || {
            questionId,
            index: 0,
            text: `Question ${questionId.slice(-5)}`,
        };

        const successRate = row.total ? (row.correct / row.total) * 100 : 0;
        return {
            ...meta,
            total: row.total,
            correct: row.correct,
            wrong: row.total - row.correct,
            successRate: Number(successRate.toFixed(2)),
            difficulty: Number((100 - successRate).toFixed(2)),
            avgTime: Number((row.avgTime || 0).toFixed(2)),
            avgScore: Number((row.avgScore || 0).toFixed(2)),
        };
    }).sort((a, b) => a.index - b.index);

    const hardestQuestions = [...questionStats]
        .sort((a, b) => a.successRate - b.successRate)
        .slice(0, 5);

    const dropoffCounts = new Map();
    uniqueQuestionAttempts.forEach((entry) => {
        const questionId = entry._id.questionId.toString();
        const meta = questionMap.get(questionId);
        if (!meta) return;

        const current = dropoffCounts.get(meta.index) || 0;
        dropoffCounts.set(meta.index, current + 1);
    });

    const sortedSteps = [...dropoffCounts.entries()].sort((a, b) => a[0] - b[0]);
    const initialCount = sortedSteps.length ? sortedSteps[0][1] : 0;
    const dropoff = sortedSteps.map(([step, activeUsers]) => ({
        step,
        activeUsers,
        dropPercent: initialCount > 0 ? Number((((initialCount - activeUsers) / initialCount) * 100).toFixed(2)) : 0,
    }));

    const scatterPoints = scatterPointsRaw.map((item) => ({
        timeTaken: Number((item.timeTaken || 0).toFixed(2)),
        score: Number((item.score || 0).toFixed(2)),
        isCorrect: Boolean(item.isCorrect),
        createdAt: item.createdAt,
    }));

    const correlation = getPearsonCorrelation(scatterPoints.map((p) => ({ x: p.timeTaken, y: p.score })));

    const payload = {
        quiz: {
            quizId: quizObjectId.toString(),
            title: quiz.title,
            questionCount: (quiz.questions || []).length,
        },
        summary: {
            totalAnswers: summary.totalAnswers,
            correctAnswers: summary.correctAnswers,
            accuracyPercent: summary.totalAnswers ? Number(((summary.correctAnswers / summary.totalAnswers) * 100).toFixed(2)) : 0,
            avgTime: Number((summary.avgTime || 0).toFixed(2)),
            avgScore: Number((summary.avgScore || 0).toFixed(2)),
            participantCount: summary.participantCount,
        },
        questionStats,
        hardestQuestions,
        performanceOverTime: performanceOverTime.map((row) => ({
            ...row,
            accuracy: Number((row.accuracy || 0).toFixed(2)),
            avgTime: Number((row.avgTime || 0).toFixed(2)),
            avgScore: Number((row.avgScore || 0).toFixed(2)),
        })),
        timeVsScore: {
            correlation,
            points: scatterPoints,
        },
        dropoff,
    };

    await snapshotAnalytics({
        type: 'quiz',
        quizId: quizObjectId,
        payload,
    });

    return payload;
};

module.exports = {
    getQuizAnalytics,
};
