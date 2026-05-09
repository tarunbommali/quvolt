const Subscription = require('../models/Subscription');
const { getPlanConfig } = require('../config/plans');


const normalizePlan = (plan) => {
    const p = String(plan || 'FREE').toUpperCase();
    if (['FREE', 'CREATOR', 'TEAMS'].includes(p)) return p;
    return 'FREE';
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
        maxQuizTemplates: planConfig.maxQuizzes,
        maxQuestionsPerQuiz: planConfig.maxQuestionsPerQuiz,
        maxOptionsPerQuestion: planConfig.maxOptionsPerQuestion,
        maxAIRequestsPerDay: planConfig.maxAIRequestsPerDay,
        maxConcurrentSessions: planConfig.maxConcurrentSessions,
        maxParticipantsPerSession: planConfig.maxParticipantsPerSession,
        participantLimitMonthly: subscription?.participantLimit || planConfig.participants,
        commissionPercent: subscription?.commissionPercent ?? planConfig.commissionPercent,
        canCreatePaidQuiz: plan !== 'FREE',
        canUsePrivateHosting: plan !== 'FREE',
        canUseAiGeneration: plan !== 'FREE',
        level: plan === 'TEAMS' ? 3 : (plan === 'CREATOR' ? 2 : 1),
    };
};

module.exports = {
    normalizePlan,
    resolveHostSubscriptionEntitlements,
};
