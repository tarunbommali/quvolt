const PlanConfig = require('../../models/admin/PlanConfig');
const Offer = require('../../models/admin/Offer');
const logger = require('../../utils/logger');

const getAdminPlans = async () => {
  let configs = await PlanConfig.find({ isActive: true }).lean();
  
  if (!configs || configs.length === 0) {
    // Fallback to hardcoded plans if DB is empty
    const { PLANS } = require('../../config/plans');
    return PLANS;
  }

  // Convert array to object key format
  return configs.reduce((acc, plan) => {
    acc[plan.planId] = {
      participants: plan.participants,
      maxParticipantsPerSession: plan.maxParticipantsPerSession,
      maxConcurrentSessions: plan.maxConcurrentSessions,
      maxQuizzes: plan.maxQuizzes,

      price: plan.price,
      features: plan.features
    };
    return acc;
  }, {});
};

const updatePlanConfig = async (planId, updateData) => {
  return await PlanConfig.findOneAndUpdate(
    { planId },
    { $set: updateData },
    { upsert: true, new: true }
  );
};

const createOffer = async (offerData) => {
  return await Offer.create(offerData);
};

const getActiveOffers = async () => {
  const now = new Date();
  return await Offer.find({
    isActive: true,
    startDate: { $lte: now },
    $or: [{ endDate: { $exists: false } }, { endDate: { $gt: now } }]
  }).lean();
};

const validateOffer = async (code, planId) => {
  const offer = await Offer.findOne({ code, isActive: true });
  if (!offer) throw new Error('Invalid or expired offer code');
  
  const now = new Date();
  if (offer.startDate > now || (offer.endDate && offer.endDate < now)) {
    throw new Error('Offer code is not active');
  }

  if (offer.usageLimit && offer.usageCount >= offer.usageLimit) {
    throw new Error('Offer code usage limit exceeded');
  }

  if (offer.applicablePlans.length > 0 && !offer.applicablePlans.includes(planId)) {
    throw new Error('Offer code not applicable for this plan');
  }

  return offer;
};

module.exports = {
  getAdminPlans,
  updatePlanConfig,
  createOffer,
  getActiveOffers,
  validateOffer
};
