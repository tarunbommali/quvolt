const mongoose = require('mongoose');
const Submission = require('../models/Submission');
const Quiz = require('../models/Quiz');
const Analytics = require('../models/Analytics');

const toObjectId = (id) => {
    if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
    return new mongoose.Types.ObjectId(id);
};

const getPearsonCorrelation = (pairs) => {
    if (!Array.isArray(pairs) || pairs.length < 2) return 0;

    const n = pairs.length;
    const sumX = pairs.reduce((acc, p) => acc + p.x, 0);
    const sumY = pairs.reduce((acc, p) => acc + p.y, 0);
    const sumXY = pairs.reduce((acc, p) => acc + (p.x * p.y), 0);
    const sumX2 = pairs.reduce((acc, p) => acc + (p.x * p.x), 0);
    const sumY2 = pairs.reduce((acc, p) => acc + (p.y * p.y), 0);

    const numerator = (n * sumXY) - (sumX * sumY);
    const denominator = Math.sqrt(((n * sumX2) - (sumX ** 2)) * ((n * sumY2) - (sumY ** 2)));

    if (!Number.isFinite(denominator) || denominator === 0) return 0;
    return Number((numerator / denominator).toFixed(4));
};

const snapshotAnalytics = async ({ type, quizId = null, userId = null, payload }) => {
    await Analytics.findOneAndUpdate(
        { type, quizId, userId },
        { payload, generatedAt: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true },
    );
};

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

const getOrganizerAnalyticsSummary = async (organizerId) => {
    const organizerObjectId = toObjectId(organizerId);
    if (!organizerObjectId) throw new Error('Invalid organizerId');

    const quizzes = await Quiz.find({ organizerId: organizerObjectId, type: { $ne: 'subject' } })
        .select('_id title status joinedParticipants')
        .lean();

    const quizIds = quizzes.map((quiz) => quiz._id);

    if (!quizIds.length) {
        return {
            totals: {
                totalQuizzesCreated: 0,
                totalParticipantsInvited: 0,
                activeQuizzes: 0,
                completedQuizzes: 0,
            },
            performance: {
                totalAttempts: 0,
                averageScore: 0,
                accuracyPercent: 0,
            },
            participants: {
                invitedUsers: 0,
                joinedUsers: 0,
                notJoinedUsers: 0,
                completionRate: 0,
            },
            topQuizzes: [],
        };
    }

    const submissionsSummary = await Submission.aggregate([
        { $match: { quizId: { $in: quizIds } } },
        {
            $group: {
                _id: '$quizId',
                totalAnswers: { $sum: 1 },
                correctAnswers: { $sum: { $cond: ['$isCorrect', 1, 0] } },
                averageScore: { $avg: '$score' },
                participants: { $addToSet: '$userId' },
            },
        },
    ]);

    const summaryByQuiz = new Map(
        submissionsSummary.map((row) => [
            row._id.toString(),
            {
                totalAnswers: row.totalAnswers || 0,
                correctAnswers: row.correctAnswers || 0,
                averageScore: Number((row.averageScore || 0).toFixed(2)),
                participantCount: Array.isArray(row.participants) ? row.participants.length : 0,
            },
        ]),
    );

    const invitedUsersSet = new Set(
        quizzes.flatMap((quiz) => (quiz.joinedParticipants || []).map((entry) => String(entry.userId))),
    );

    const totalAnswers = submissionsSummary.reduce((sum, row) => sum + (row.totalAnswers || 0), 0);
    const totalCorrect = submissionsSummary.reduce((sum, row) => sum + (row.correctAnswers || 0), 0);
    const weightedScore = submissionsSummary.reduce(
        (sum, row) => sum + ((row.averageScore || 0) * (row.totalAnswers || 0)),
        0,
    );

    const topQuizzes = quizzes
        .map((quiz) => {
            const stat = summaryByQuiz.get(quiz._id.toString()) || {
                totalAnswers: 0,
                correctAnswers: 0,
                averageScore: 0,
                participantCount: 0,
            };
            const accuracyPercent = stat.totalAnswers
                ? Number(((stat.correctAnswers / stat.totalAnswers) * 100).toFixed(2))
                : 0;
            return {
                quizId: quiz._id.toString(),
                title: quiz.title,
                totalAnswers: stat.totalAnswers,
                averageScore: stat.averageScore,
                participantCount: stat.participantCount,
                accuracyPercent,
            };
        })
        .sort((a, b) => b.accuracyPercent - a.accuracyPercent || b.averageScore - a.averageScore)
        .slice(0, 10);

    const joinedUsers = new Set(
        submissionsSummary.flatMap((row) => (row.participants || []).map((id) => String(id))),
    ).size;

    const invitedUsers = invitedUsersSet.size;
    const notJoinedUsers = Math.max(invitedUsers - joinedUsers, 0);

    return {
        totals: {
            totalQuizzesCreated: quizzes.length,
            totalParticipantsInvited: invitedUsers,
            activeQuizzes: quizzes.filter((quiz) => ['live', 'waiting', 'scheduled', 'ongoing'].includes(String(quiz.status || '').toLowerCase())).length,
            completedQuizzes: quizzes.filter((quiz) => String(quiz.status || '').toLowerCase() === 'completed').length,
        },
        performance: {
            totalAttempts: totalAnswers,
            averageScore: totalAnswers ? Number((weightedScore / totalAnswers).toFixed(2)) : 0,
            accuracyPercent: totalAnswers ? Number(((totalCorrect / totalAnswers) * 100).toFixed(2)) : 0,
        },
        participants: {
            invitedUsers,
            joinedUsers,
            notJoinedUsers,
            completionRate: invitedUsers ? Number(((joinedUsers / invitedUsers) * 100).toFixed(2)) : 0,
        },
        topQuizzes,
    };
};

module.exports = {
    getQuizAnalytics,
    getUserAnalytics,
    getOrganizerAnalyticsSummary,
};
