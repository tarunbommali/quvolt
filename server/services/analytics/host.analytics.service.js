const Submission = require('../../models/Submission');
const Quiz = require('../../models/Quiz');
const { toObjectId } = require('./analytics.utils');

const gethostAnalyticsSummary = async (hostId) => {
    const hostObjectId = toObjectId(hostId);
    if (!hostObjectId) throw new Error('Invalid hostId');

    const quizzes = await Quiz.find({ hostId: hostObjectId, type: { $ne: 'subject' } })
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
    gethostAnalyticsSummary,
};
