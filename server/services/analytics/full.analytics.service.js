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
        // Always fetch basic session data (all plans)
        const session = await getBasicSessionAnalytics(sessionId);

        // FREE tier — return only basic data
        if (rank === 0) {
            logger.info("ANALYTICS_FETCH", { sessionId, plan, rank, duration: Date.now() - start });
            return {
                session,
                questions: null,
                audience: null,
                plan: 'FREE',
            };
        }

        // CREATOR+ — fetch questions and audience in parallel
        const [questionsResult, audienceResult] = await Promise.allSettled([
            getQuestionInsights(sessionId),
            getAudienceInsights(sessionId),
        ]);

        logger.info("ANALYTICS_FETCH", { sessionId, plan, rank, duration: Date.now() - start });

        return {
            session,
            questions: questionsResult.status === 'fulfilled' ? questionsResult.value : null,
            audience:  audienceResult.status  === 'fulfilled' ? audienceResult.value  : null,
            plan,
        };
    } catch (error) {
        logger.error("ANALYTICS_FETCH_ERROR", { sessionId, plan, error: error.message, duration: Date.now() - start });
        throw error;
    }
};

module.exports = { getFullSessionAnalytics };
