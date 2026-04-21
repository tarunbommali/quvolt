const QUIZ_TEMPLATE_LIMITS = {
    FREE: 5,
    CREATOR: 30,
    TEAMS: 1000,
};

const PARTICIPANT_LIMITS = {
    FREE: 10000,
    CREATOR: 50000,
    TEAMS: 1000000,
};

const COMMISSION_PERCENTS = {
    FREE: 25,
    CREATOR: 10,
    TEAMS: 5,
};

export const normalizePlan = (plan) => {
    const value = String(plan || 'FREE').toUpperCase();
    return Object.prototype.hasOwnProperty.call(QUIZ_TEMPLATE_LIMITS, value) ? value : 'FREE';
};

export const getSubscriptionEntitlements = (user) => {
    const plan = normalizePlan(user?.plan || user?.subscription?.plan);

    return {
        plan,
        maxQuizTemplates: QUIZ_TEMPLATE_LIMITS[plan],
        participantLimit: user?.participantLimit || user?.subscription?.participantLimit || PARTICIPANT_LIMITS[plan],
        commissionPercent: user?.commissionPercent || user?.subscription?.commissionPercent || COMMISSION_PERCENTS[plan],
        canCreatePaidQuiz: plan !== 'FREE',
        canUsePrivateHosting: plan !== 'FREE',
        canUseAiGeneration: plan !== 'FREE',
    };
};
