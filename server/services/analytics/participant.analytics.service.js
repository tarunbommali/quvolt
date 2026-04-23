const Submission = require('../../models/Submission');
const QuestionAnalytics = require('../../models/QuestionAnalytics');
const User = require('../../models/User');
const { toObjectId } = require('./analytics.utils');
const logger = require('../../utils/logger');

async function getParticipantAnalytics({ sessionId, userId }) {
    try {
        const sessionObjectId = toObjectId(sessionId);
        const userObjectId = toObjectId(userId);

        if (!sessionObjectId || !userObjectId) {
            throw new Error('Invalid sessionId or userId');
        }

        // Fetch user basic info
        const user = await User.findById(userObjectId).select('name email').lean();
        const QuizSession = require('../../models/QuizSession');
        const session = await QuizSession.findById(sessionObjectId).select('leaderboard').lean();

        // Query submissions -> O(n_user)
        const submissions = await Submission.find({
            sessionId: sessionObjectId,
            userId: userObjectId
        }).sort({ createdAt: 1 }).lean();

        // Query analytics -> O(n_questions)
        const questionStats = await QuestionAnalytics.find({
            sessionId: sessionObjectId
        }).lean();

        // Merge in memory
        const statsMap = new Map();
        questionStats.forEach(q => {
            statsMap.set(q.questionId.toString(), q);
        });

        let totalTime = 0;
        let correctCount = 0;
        let fasterThanAvgCount = 0;

        const timeline = submissions.map((s, index) => {
            const qStats = statsMap.get(s.questionId.toString());
            
            const accuracy = qStats && qStats.totalResponses > 0
                ? qStats.correctCount / qStats.totalResponses
                : null;
            
            const avgTime = qStats?.avgResponseTime || 0;
            const diffFromAvg = avgTime > 0 ? Number((avgTime - s.timeTaken).toFixed(1)) : 0;
            const fasterThanAvg = s.timeTaken < avgTime;
            const harderThanAvg = accuracy !== null && accuracy < 0.5;

            totalTime += s.timeTaken;
            if (s.isCorrect) correctCount++;
            if (fasterThanAvg) fasterThanAvgCount++;

            return {
                questionId: s.questionId,
                selectedOption: s.selectedOption,
                isCorrect: s.isCorrect,
                responseTime: Number((s.timeTaken || 0).toFixed(1)),
                score: s.score,

                // global comparison
                globalAvgTime: avgTime,
                globalAccuracy: accuracy !== null ? Number((accuracy * 100).toFixed(1)) : null,
                correctOption: qStats?.correctOption || null,
                questionText: qStats?.questionText || `Question ${index + 1}`,
                difficulty: qStats?.difficulty || 0,

                // derived insights
                fasterThanAvg,
                diffFromAvg,
                harderThanAvg
            };
        });

        const totalQuestions = submissions.length;
        const accuracy = totalQuestions > 0 ? (correctCount / totalQuestions) : 0;
        const avgTime = totalQuestions > 0 ? (totalTime / totalQuestions) : 0;

        // Leaderboard Calculation
        const leaderboard = Object.values(session?.leaderboard || {})
            .sort((a, b) => b.score - a.score || a.time - b.time);
        const rankIndex = leaderboard.findIndex(u => u.userId === userId);
        const rank = rankIndex !== -1 ? rankIndex + 1 : leaderboard.length + 1;
        const totalParticipants = Math.max(leaderboard.length, 1);
        const percentile = rankIndex !== -1 ? Math.round(((totalParticipants - rank) / totalParticipants) * 100) : 0;
        const top10 = leaderboard.slice(0, 10);

        return {
            user: {
                id: userId,
                name: user?.name || 'Unknown User',
            },
            summary: {
                totalQuestions,
                correct: correctCount,
                accuracy: Number((accuracy * 100).toFixed(1)),
                avgTime: Number(avgTime.toFixed(1)),
                fasterThanAvgPercent: totalQuestions > 0 ? Number(((fasterThanAvgCount / totalQuestions) * 100).toFixed(1)) : 0,
            },
            ranking: {
                rank,
                totalParticipants,
                percentile,
                top10
            },
            timeline
        };
    } catch (err) {
        logger.error('[ParticipantAnalyticsService] getParticipantAnalytics failed', {
            sessionId, userId, error: err.message
        });
        throw err;
    }
}

module.exports = {
    getParticipantAnalytics
};
