const QuestionAnalytics = require('../../models/QuestionAnalytics');
const QuizSession = require('../../models/QuizSession');
const Submission = require('../../models/Submission');
const { toObjectId } = require('./analytics.utils');

/**
 * Get question-level insights for a session (Creator tier).
 * Reads from QuestionAnalytics cache; computes live if not available.
 *
 * @param {string} sessionId
 * @returns {Promise<object>}
 */
const getQuestionInsights = async (sessionId) => {
    const sessionObjectId = toObjectId(sessionId);
    if (!sessionObjectId) throw new Error('Invalid sessionId');

    const session = await QuizSession.findById(sessionObjectId).select('status').lean();
    if (!session) throw new Error('Session not found');

    // If session is completed, use cached analytics to save DB compute.
    if (session.status === 'completed' || session.status === 'aborted') {
        const cached = await QuestionAnalytics.find({ sessionId: sessionObjectId }).lean();
        if (cached && cached.length > 0) {
            return _formatQuestionInsights(sessionObjectId.toString(), cached);
        }
    }

    // Live compute and persist (always fresh for 'live' sessions or if cache is missing)
    return computeAndPersistQuestionInsights(sessionId);
};

/**
 * Compute question analytics from Submissions and persist to QuestionAnalytics collection.
 * Called on SESSION_ENDED. Idempotent — safe to call multiple times.
 *
 * @param {string} sessionId
 * @returns {Promise<object>}
 */
const computeAndPersistQuestionInsights = async (sessionId) => {
    const sessionObjectId = toObjectId(sessionId);
    if (!sessionObjectId) return { sessionId: sessionId, questions: [] };

    try {
        const session = await QuizSession.findById(sessionObjectId)
            .select('templateSnapshot status')
            .lean();
        if (!session) return { sessionId: sessionId, questions: [] };

        // For real-time updates, the data is already incrementally updated by answer.service.js!
        // We just read what is currently in the DB.
        const docs = await QuestionAnalytics.find({ sessionId: sessionObjectId }).lean();

        // One missing thing: Drop-off rate. We compute it here quickly from totalSubmissions.
        const maxParticipants = docs.length ? Math.max(...docs.map(d => d.totalResponses || 0)) : 1;
        
        // Let's dynamically update dropOff if it's drifting, but for speed, we can just compute it locally and format
        const enhancedDocs = docs.map(doc => {
            const dropOffRate = maxParticipants > 0
                ? Number((((maxParticipants - (doc.totalResponses || 0)) / maxParticipants) * 100).toFixed(2))
                : 0;
            return {
                ...doc,
                dropOffRate
            };
        });

        // We only persist the dropOff rate computation back to Mongo if the session is finished.
        // It's a light async update.
        if (session.status === 'completed' || session.status === 'aborted') {
            Promise.all(enhancedDocs.map(doc => 
                QuestionAnalytics.updateOne(
                    { _id: doc._id }, 
                    { $set: { dropOffRate: doc.dropOffRate } }
                )
            )).catch(() => {});
        }

        return _formatQuestionInsights(sessionObjectId.toString(), enhancedDocs);
    } catch (err) {
        const logger = require('../../utils/logger');
        logger.error('[QuestionAnalyticsService] fetchQuestionInsights failed', {
            sessionId, error: err.message,
        });
        return { sessionId: sessionId, questions: [] };
    }
};

const _formatQuestionInsights = (sessionId, docs) => {
    const questions = docs.map((q) => ({
        questionId: String(q.questionId),
        question: q.questionText,
        correctCount: q.correctCount,
        incorrectCount: q.incorrectCount,
        totalResponses: q.totalResponses,
        accuracy: q.totalResponses
            ? Number(((q.correctCount / q.totalResponses) * 100).toFixed(2))
            : 0,
        difficulty: q.difficulty,
        qqsScore: q.qqsScore || 100,
        avgResponseTime: q.avgResponseTime,
        dropOffRate: q.dropOffRate,
        optionDistribution: q.optionDistribution || [],
    }));

    return {
        sessionId,
        questions,
        summary: {
            avgDropOff: questions.length
                ? Number((questions.reduce((s, q) => s + q.dropOffRate, 0) / questions.length).toFixed(2))
                : 0,
            hardestQuestion: questions.sort((a, b) => b.difficulty - a.difficulty)[0]?.question || null,
            totalQuestions: questions.length,
        },
    };
};

module.exports = {
    getQuestionInsights,
    computeAndPersistQuestionInsights,
};
