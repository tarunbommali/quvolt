const Subscription = require('../models/Subscription');
const { getPlanConfig } = require('../config/plans');

const QUIZ_TEMPLATE_LIMITS = {
    FREE: 5,
    PRO: 15,
    PREMIUM: 25,
};

const normalizePlan = (plan) => {
    const value = String(plan || 'FREE').toUpperCase();
    return Object.prototype.hasOwnProperty.call(QUIZ_TEMPLATE_LIMITS, value) ? value : 'FREE';
};

const resolveHostSubscriptionEntitlements = async (hostId) => {
    const now = new Date();
    const subscription = await Subscription.findOne({
        hostId,
        status: 'active',
        expiryDate: { $gt: now },
    })
        .sort({ expiryDate: -1, createdAt: -1 })
        .lean();

    const plan = normalizePlan(subscription?.plan);
    const planConfig = getPlanConfig(plan);

    return {
        plan,
        maxQuizTemplates: QUIZ_TEMPLATE_LIMITS[plan],
        participantLimit: subscription?.participantLimit || planConfig.participants,
        commissionPercent: subscription?.commissionPercent ?? planConfig.commissionPercent,
        canCreatePaidQuiz: plan !== 'FREE',
        canUsePrivateHosting: plan !== 'FREE',
        canUseAiGeneration: plan !== 'FREE',
    };
};

module.exports = {
    normalizePlan,
    resolveHostSubscriptionEntitlements,
    QUIZ_TEMPLATE_LIMITS,
};
