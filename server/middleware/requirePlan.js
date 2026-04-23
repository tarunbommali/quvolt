/**
 * requirePlan middleware
 * Enforces subscription tier access for analytics endpoints.
 *
 * Usage:
 *   router.get('/questions/:sessionId', protect, requirePlan('CREATOR'), controller.getQuestionInsights);
 *
 * The user's plan is read from req.user.plan (set by the `protect` JWT middleware).
 * Admins bypass plan checks entirely.
 */

const TIER_RANKS = {
    FREE: 0,
    CREATOR: 1,
    TEAMS: 2,
};

/**
 * @param {'FREE'|'CREATOR'|'TEAMS'} minimumPlan
 */
const requirePlan = (minimumPlan) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, data: null, message: 'Not authorized' });
    }

    // Admins always bypass plan checks
    if (req.user.role === 'admin') return next();

    const userPlan = (req.user.plan || 'FREE').toUpperCase();
    const userRank = TIER_RANKS[userPlan] ?? 0;
    const requiredRank = TIER_RANKS[minimumPlan] ?? 0;

    if (userRank >= requiredRank) return next();

    return res.status(403).json({
        success: false,
        data: null,
        message: `This feature requires the ${minimumPlan} plan. Upgrade to unlock.`,
        requiredPlan: minimumPlan,
        currentPlan: userPlan,
    });
};

module.exports = requirePlan;
