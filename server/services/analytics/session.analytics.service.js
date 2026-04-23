const SessionAnalytics = require('../../models/SessionAnalytics');
const QuizSession = require('../../models/QuizSession');
const Submission = require('../../models/Submission');
const { toObjectId } = require('./analytics.utils');

/**
 * Retrieve basic session analytics (Free tier).
 * Reads from SessionAnalytics cache; falls back to live aggregation if not yet finalized.
 *
 * @param {string} sessionId
 * @returns {Promise<object>}
 */
const getBasicSessionAnalytics = async (sessionId) => {
    const sessionObjectId = toObjectId(sessionId);
    if (!sessionObjectId) throw new Error('Invalid sessionId');

    // Fast path: return cached document if finalized
    const cached = await SessionAnalytics.findOne({ sessionId: sessionObjectId }).lean();
    if (cached && cached.isFinalized) {
        return _formatBasic(cached);
    }

    // Live aggregation from Submissions
    const session = await QuizSession.findById(sessionObjectId)
        .select('quizId templateId hostId participantCount peakParticipants snapshot topWinners startedAt endedAt')
        .lean();
    if (!session) throw new Error('Session not found');

    const quizObjectId = session.templateId || session.quizId;

    const [overall] = await Submission.aggregate([
        {
            $match: {
                $or: [
                    { sessionId: sessionObjectId },
                    { roomCode: session.sessionCode || '' },
                ],
            },
        },
        {
            $group: {
                _id: null,
                totalResponses: { $sum: 1 },
                correctCount: { $sum: { $cond: ['$isCorrect', 1, 0] } },
                avgScore: { $avg: '$score' },
                uniqueParticipants: { $addToSet: '$userId' },
            },
        },
        {
            $project: {
                _id: 0,
                totalResponses: 1,
                correctCount: 1,
                avgScore: 1,
                uniqueParticipants: { $size: '$uniqueParticipants' },
            },
        },
    ]);

    const stats = overall || { totalResponses: 0, correctCount: 0, avgScore: 0, uniqueParticipants: 0 };
    const totalParticipants = Math.max(session.participantCount || 0, stats.uniqueParticipants);

    return {
        sessionId: sessionObjectId.toString(),
        totalParticipants,
        avgScore: Number((stats.avgScore || 0).toFixed(2)),
        completionRate: totalParticipants
            ? Number(((stats.uniqueParticipants / totalParticipants) * 100).toFixed(2))
            : 0,
        totalResponses: stats.totalResponses,
        accuracyPercent: stats.totalResponses
            ? Number(((stats.correctCount / stats.totalResponses) * 100).toFixed(2))
            : 0,
        topLeaderboard: (session.topWinners || []).slice(0, 10),
        sessionDuration: session.sessionDuration || 0,
    };
};

/**
 * Compute and upsert SessionAnalytics for a completed session.
 * Called by the socket on SESSION_ENDED.
 *
 * @param {string} sessionId
 * @returns {Promise<void>}
 */
const finalizeSessionAnalytics = async (sessionId) => {
    const sessionObjectId = toObjectId(sessionId);
    if (!sessionObjectId) return;

    try {
        const session = await QuizSession.findById(sessionObjectId)
            .select('quizId templateId hostId participantCount peakParticipants topWinners startedAt endedAt sessionDuration')
            .lean();
        if (!session) return;

        const [overall] = await Submission.aggregate([
            { $match: { sessionId: sessionObjectId } },
            {
                $group: {
                    _id: null,
                    avgScore: { $avg: '$score' },
                    uniqueParticipants: { $addToSet: '$userId' },
                    totalResponses: { $sum: 1 },
                    correctCount: { $sum: { $cond: ['$isCorrect', 1, 0] } },
                },
            },
            {
                $project: {
                    _id: 0,
                    avgScore: 1,
                    totalParticipants: { $size: '$uniqueParticipants' },
                    totalResponses: 1,
                    correctCount: 1,
                },
            },
        ]);

        const stats = overall || { avgScore: 0, totalParticipants: 0, totalResponses: 0, correctCount: 0 };
        const totalParticipants = Math.max(
            session.participantCount || 0,
            stats.totalParticipants,
        );

        await SessionAnalytics.findOneAndUpdate(
            { sessionId: sessionObjectId },
            {
                $set: {
                    sessionId: sessionObjectId,
                    quizId: session.templateId || session.quizId,
                    hostId: session.hostId,
                    totalParticipants,
                    totalResponses: stats.totalResponses,
                    correctCount: stats.correctCount,
                    avgScore: Number((stats.avgScore || 0).toFixed(2)),
                    completionRate: totalParticipants
                        ? Number(((stats.totalParticipants / totalParticipants) * 100).toFixed(2))
                        : 0,
                    topLeaderboard: (session.topWinners || []).slice(0, 10),
                    sessionDuration: session.sessionDuration || 0,
                    isFinalized: true,
                },
            },
            { upsert: true, new: true },
        );
    } catch (err) {
        // Non-fatal — analytics finalization should never crash the main flow
        const logger = require('../../utils/logger');
        logger.error('[SessionAnalyticsService] finalizeSessionAnalytics failed', { sessionId, error: err.message });
    }
};

const _formatBasic = (doc) => ({
    sessionId: doc.sessionId.toString(),
    totalParticipants: doc.totalParticipants,
    totalResponses: doc.totalResponses || 0,
    avgScore: doc.avgScore,
    accuracyPercent: doc.totalResponses ? Number(((doc.correctCount / doc.totalResponses) * 100).toFixed(2)) : 0,
    completionRate: doc.completionRate,
    topLeaderboard: doc.topLeaderboard || [],
    sessionDuration: doc.sessionDuration,
});

module.exports = {
    getBasicSessionAnalytics,
    finalizeSessionAnalytics,
};
