/**
 * full.analytics.service.js
 *
 * Plan-aware unified analytics aggregation.
 * Returns one payload with all data the user's tier is entitled to.
 * Called by GET /api/analytics/full/:sessionId — 1 request instead of 3.
 *
 * Plan enforcement strategy:
 *   FREE    → session summary only
 *   CREATOR → session + questions + audience
 *   TEAMS   → same as CREATOR (org dashboard is separate)
 *
 * This ensures the BACKEND is the authoritative access gate —
 * the frontend tier guard is UX only, not security.
 */

const { getBasicSessionAnalytics } = require('./session.analytics.service');
const { getQuestionInsights }       = require('./question.analytics.service');
const { getAudienceInsights }       = require('./audience.analytics.service');
const Quiz = require('../../models/Quiz');
const QuizSession = require('../../models/QuizSession');
const logger = require('../../utils/logger');

const TIER_RANKS = { FREE: 0, CREATOR: 1, TEAMS: 2 };

/**
 * @param {string} sessionId  - MongoDB QuizSession._id
 * @param {string} plan       - 'FREE' | 'CREATOR' | 'TEAMS'
 */
const getFullSessionAnalytics = async (sessionId, plan = 'FREE') => {
    const start = Date.now();
    const rank = TIER_RANKS[(plan || 'FREE').toUpperCase()] ?? 0;

    try {
        // Fetch session and quiz to check for paid status
        const sessionDoc = await QuizSession.findById(sessionId).select('quizId').lean();
        if (!sessionDoc) throw new Error('Session not found');

        const quiz = await Quiz.findById(sessionDoc.quizId).select('isPaid').lean();
        const isPaidSession = quiz?.isPaid || false;

        // Entitlement check: CREATOR+ OR if it's a Paid Quiz
        const hasAdvancedAccess = rank >= 1 || isPaidSession;

        // Always fetch basic session data (all plans)
        const session = await getBasicSessionAnalytics(sessionId);

        // If no advanced access, return only basic data
        if (!hasAdvancedAccess) {
            logger.info("ANALYTICS_FETCH", { sessionId, plan, rank, isPaidSession, duration: Date.now() - start });
            return {
                session,
                questions: null,
                audience: null,
                isPaidSession,
                plan: 'FREE',
            };
        }

        // Fetch questions and audience in parallel
        const [questionsResult, audienceResult] = await Promise.allSettled([
            getQuestionInsights(sessionId),
            getAudienceInsights(sessionId),
        ]);

        logger.info("ANALYTICS_FETCH", { sessionId, plan, rank, isPaidSession, duration: Date.now() - start });

        return {
            session,
            questions: questionsResult.status === 'fulfilled' ? questionsResult.value : null,
            audience:  audienceResult.status  === 'fulfilled' ? audienceResult.value  : null,
            isPaidSession,
            plan,
        };
    } catch (error) {
        logger.error("ANALYTICS_FETCH_ERROR", { sessionId, plan, error: error.message, duration: Date.now() - start });
        throw error;
    }
};

module.exports = { getFullSessionAnalytics };
