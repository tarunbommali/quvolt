const PLANS = {
    FREE: { participants: 10000, commission: 0.25, price: 0 },
    PRO: { participants: 15000, commission: 0.10, price: 499 },
    PREMIUM: { participants: 25000, commission: 0.05, price: 999 },
};

const buildPlan = (planId, data) => ({
    id: planId,
    name: planId.charAt(0) + planId.slice(1).toLowerCase(),
    participants: data.participants,
    commission: data.commission,
    commissionPercent: Number((data.commission * 100).toFixed(2)),
    price: data.price,
    monthlyAmount: data.price * 100,
    razorpayPlanId: process.env[`RAZORPAY_PLAN_${planId}_ID`] || `plan_${planId.toLowerCase()}`,
    features: [
        `${data.participants.toLocaleString('en-IN')} Participants`,
        `${Number((data.commission * 100).toFixed(0))}% Platform Commission`,
        data.price === 0 ? 'Free plan' : `₹${data.price}/month`,
    ],
});

const SUBSCRIPTION_PLANS = Object.fromEntries(
    Object.entries(PLANS).map(([planId, data]) => [planId, buildPlan(planId, data)])
);

const getPlanConfig = (planId) => SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS.FREE;
const getAllPlans = () => Object.values(SUBSCRIPTION_PLANS);
// Return percent (e.g. 10) for payment split calculations.
const getCommissionForPlan = (planId) => getPlanConfig(planId).commissionPercent;

module.exports = {
    PLANS,
    SUBSCRIPTION_PLANS,
    getPlanConfig,
    getAllPlans,
    getCommissionForPlan,
};
