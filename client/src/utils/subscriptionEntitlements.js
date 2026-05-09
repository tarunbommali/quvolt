// ── Template quotas per plan ─────────────────────────────────────────────
const QUIZ_TEMPLATE_LIMITS = {
    FREE: 5,
    CREATOR: 30,
    TEAMS: 1000,
};

export const normalizePlan = (plan) => {
    const value = String(plan || 'FREE').toUpperCase();
    return Object.prototype.hasOwnProperty.call(QUIZ_TEMPLATE_LIMITS, value) ? value : 'FREE';
};

/**
 * getSubscriptionEntitlements
 *
 * Returns feature flags and limits derived from the user's subscription plan.
 * Commission, paid-quiz, and payout fields have been removed — subscriptions
 * now only gate template quotas, participant capacity, private hosting, and AI.
 */
export const getSubscriptionEntitlements = (user) => {
    const plan = normalizePlan(user?.plan || user?.subscription?.plan);

    return {
        plan,
        maxQuizTemplates: QUIZ_TEMPLATE_LIMITS[plan],
        participantLimit: user?.subscription?.participantLimit ?? null,
        canUsePrivateHosting: plan !== 'FREE',
        canUseAiGeneration: plan !== 'FREE',
    };
};
