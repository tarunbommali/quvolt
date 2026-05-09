/**
 * Centralized Subscription Plans Configuration
 * Controlled by Admin via DB with Hardcoded Fallbacks
 */

const PLANS = {
    FREE: { 
        participants: 10000, 
        maxParticipantsPerSession: 200,
        maxConcurrentSessions: 1,
        maxQuizzes: 5,
        maxQuestionsPerQuiz: 20,
        maxOptionsPerQuestion: 4,
        maxAIRequestsPerDay: 0,
        commission: 0.25, 
        price: 0,
        features: [
            '200 Participants / Session',
            '1 Concurrent Session',
            '5 Quiz Templates',
            'Up to 20 Questions / Quiz',
            '25% Platform Commission',
            'Quvolt Watermark'
        ]
    },
    CREATOR: { 
        participants: 50000, 
        maxParticipantsPerSession: 5000,
        maxConcurrentSessions: 3,
        maxQuizzes: 30,
        maxQuestionsPerQuiz: 100,
        maxOptionsPerQuestion: 4,
        maxAIRequestsPerDay: 50,
        commission: 0.10, 
        price: 499,
        features: [
            '5,000 Participants / Session',
            '3 Concurrent Sessions',
            '30 Quiz Templates',
            'Up to 100 Questions / Quiz',
            '10% Platform Commission',
            'AI Quiz Generation',
            'Custom Branding',
            'No Watermark'
        ]
    },
    TEAMS: { 
        participants: 1000000, 
        maxParticipantsPerSession: 100000,
        maxConcurrentSessions: 10, 
        maxQuizzes: 1000,
        maxQuestionsPerQuiz: 300,
        maxOptionsPerQuestion: 4,
        maxAIRequestsPerDay: 500,
        commission: 0.05, 
        price: 999,
        features: [
            '100,000 Participants / Session',
            '10 Concurrent Sessions',
            'Unlimited Quiz Templates',
            'Up to 300 Questions / Quiz',
            '5% Platform Commission',
            'White-labeling',
            'Multi-host Shared Libraries',
            'Priority Support'
        ]
    },
};

const buildPlan = (planId, data) => ({
    id: planId,
    name: planId.charAt(0) + planId.slice(1).toLowerCase(),
    participants: data.participants,
    maxParticipantsPerSession: data.maxParticipantsPerSession,
    maxConcurrentSessions: data.maxConcurrentSessions,
    maxQuizzes: data.maxQuizzes,
    maxQuestionsPerQuiz: data.maxQuestionsPerQuiz,
    maxOptionsPerQuestion: data.maxOptionsPerQuestion,
    maxAIRequestsPerDay: data.maxAIRequestsPerDay,
    commission: data.commission,
    commissionPercent: Number((data.commission * 100).toFixed(2)),
    price: data.price,
    monthlyAmount: data.price * 100, // in paise
    razorpayPlanId: process.env[`RAZORPAY_PLAN_${planId}_ID`] || `plan_${planId.toLowerCase()}`,
    features: data.features || [
        `${data.maxParticipantsPerSession.toLocaleString('en-IN')} Participants / Session`,
        `${data.maxConcurrentSessions} Concurrent Session${data.maxConcurrentSessions > 1 ? 's' : ''}`,
        `${data.maxQuizzes > 500 ? 'Unlimited' : data.maxQuizzes} Quiz Templates`,
        `Up to ${data.maxQuestionsPerQuiz} Questions / Quiz`,
        `${Number((data.commission * 100).toFixed(0))}% Platform Commission`,
    ],
});

/**
 * Get all plans merged with DB overrides if needed
 * Note: For high performance, we use the hardcoded PLANS as base.
 */
const getSubscriptionPlans = async () => {
    // Attempt to load overrides from DB if we are in a request context where mongoose is available
    try {
        const PlanConfig = require('../models/admin/PlanConfig');
        const dbConfigs = await PlanConfig.find({ isActive: true }).lean();
        
        const merged = { ...PLANS };
        dbConfigs.forEach(config => {
            if (merged[config.planId]) {
                merged[config.planId] = { ...merged[config.planId], ...config };
            }
        });
        
        return Object.fromEntries(
            Object.entries(merged).map(([planId, data]) => [planId, buildPlan(planId, data)])
        );
    } catch (e) {
        // Fallback to hardcoded
        return Object.fromEntries(
            Object.entries(PLANS).map(([planId, data]) => [planId, buildPlan(planId, data)])
        );
    }
};

const SUBSCRIPTION_PLANS = Object.fromEntries(
    Object.entries(PLANS).map(([planId, data]) => [planId, buildPlan(planId, data)])
);

const getPlanConfig = (planId) => SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS.FREE;
const getAllPlans = () => Object.values(SUBSCRIPTION_PLANS);
const getCommissionForPlan = (planId) => getPlanConfig(planId).commissionPercent;

module.exports = {
    PLANS,
    SUBSCRIPTION_PLANS,
    getSubscriptionPlans,
    getPlanConfig,
    getAllPlans,
    getCommissionForPlan,
};
