const subscriptionService = require('../services/subscription/subscription.service');
const { getPlanConfig, getAllPlans, SUBSCRIPTION_PLANS } = require('../utils/subscriptionPlans');
const Subscription = require('../models/Subscription');
const logger = require('../utils/logger');
const razorpay = require('../config/razorpay');
const config = require('../config/env');

const buildSubscriptionReceipt = (hostId, planId) => {
  const compactHost = String(hostId).slice(-8);
  const compactPlan = String(planId).slice(0, 3);
  const compactTime = Date.now().toString().slice(-8);
  return `sub_${compactHost}_${compactPlan}_${compactTime}`;
};

const buildMockSubscriptionOrderId = (hostId, planId) =>
  `mock_sub_${String(hostId).slice(-6)}_${String(planId).toLowerCase()}_${Date.now().toString().slice(-6)}`;

const isMockSubscriptionOrder = (orderId) => String(orderId || '').startsWith('mock_sub_');

exports.getAllSubscriptionPlans = async (req, res) => {
  try {
    const plans = getAllPlans();
    res.json({ success: true, data: plans });
  } catch (error) {
    logger.error('Get plans error', { error: error.message });
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch plans' } });
  }
};

exports.getHostSubscription = async (req, res) => {
  try {
    const hostId = req.user._id;
    const subscription = await subscriptionService.getActiveSubscription(hostId);
    const plan = subscription?.plan || 'FREE';
    const planConfig = getPlanConfig(plan);

    res.json({
      success: true,
      data: {
        plan,
        status: subscription?.status || 'active',
        subscription: subscription || {
          plan: 'FREE',
          status: 'active',
          monthlyAmount: 0,
          participantLimit: planConfig.participants,
          commission: planConfig.commission,
          commissionPercent: planConfig.commissionPercent,
          features: planConfig.features,
        },
        participantLimit: subscription?.participantLimit || planConfig.participants,
        commission: subscription?.commission ?? planConfig.commission,
        commissionPercent: subscription?.commissionPercent ?? planConfig.commissionPercent,
      },
    });
  } catch (error) {
    logger.error('Get host subscription error', { hostId: req.user._id, error: error.message });
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch subscription' } });
  }
};

exports.getSubscriptionStatus = async (req, res) => {
  try {
    const hostId = req.user._id;
    const subscription = await subscriptionService.getActiveSubscription(hostId);
    const plan = subscription?.plan || 'FREE';
    const planConfig = getPlanConfig(plan);

    return res.json({
      success: true,
      data: {
        plan,
        status: subscription?.status || 'inactive',
        participantLimit: subscription?.participantLimit || planConfig.participants,
        commission: subscription?.commission ?? planConfig.commission,
        commissionPercent: subscription?.commissionPercent ?? planConfig.commissionPercent,
        expiryDate: subscription?.expiryDate || null,
        subscription: subscription || null,
      },
    });
  } catch (error) {
    logger.error('Get subscription status error', { hostId: req.user._id, error: error.message });
    return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch subscription status' } });
  }
};

exports.createSubscriptionOrder = async (req, res) => {
  try {
    const { planId } = req.body;
    const hostId = req.user._id;

    if (!planId || !SUBSCRIPTION_PLANS[planId]) {
      return res.status(400).json({ error: { code: 'INVALID_PLAN', message: 'Invalid plan ID' } });
    }

    const planConfig = getPlanConfig(planId);

    if (planId === 'FREE') {
      const subscription = await subscriptionService.createSubscription(hostId, 'FREE');
      return res.json({ success: true, data: { subscription, message: 'Successfully upgraded to FREE plan' } });
    }

    if (!planConfig.monthlyAmount || planConfig.monthlyAmount <= 0) {
      return res.status(400).json({ error: { code: 'INVALID_AMOUNT', message: `Invalid amount for plan ${planId}` } });
    }

    let order;
    try {
      order = await razorpay.orders.create({
        amount: planConfig.monthlyAmount,
        currency: 'INR',
        receipt: buildSubscriptionReceipt(hostId, planId),
        notes: { hostId: String(hostId), planId, planName: planConfig.name },
      });
    } catch (razorpayError) {
      if (config.mockPaymentsEnabled) {
        const mockOrderId = buildMockSubscriptionOrderId(hostId, planId);
        return res.status(201).json({
          success: true,
          data: { orderId: mockOrderId, planId, amount: planConfig.monthlyAmount / 100, currency: 'INR', key: 'mock_key', mock: true },
        });
      }
      throw razorpayError;
    }

    res.status(201).json({
      success: true,
      data: { orderId: order.id, planId, amount: planConfig.monthlyAmount / 100, currency: 'INR', key: process.env.RAZORPAY_KEY_ID },
    });
  } catch (error) {
    logger.error('Create subscription order error', { error: error.message, hostId: req.user._id });
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create subscription order' } });
  }
};

exports.verifySubscriptionPayment = async (req, res) => {
  try {
    const { orderId, paymentId, signature, planId } = req.body;
    const hostId = req.user._id;

    if (!orderId || !paymentId || !signature || !planId) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } });
    }

    const isMockMode = config.mockPaymentsEnabled && isMockSubscriptionOrder(orderId);

    if (!isMockMode) {
      const crypto = require('crypto');
      const generatedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
      const sig1 = Buffer.from(signature, 'hex');
      const sig2 = Buffer.from(generatedSignature, 'hex');
      if (sig1.length !== sig2.length || !crypto.timingSafeEqual(sig1, sig2)) {
        return res.status(400).json({ error: { code: 'INVALID_SIGNATURE', message: 'Payment verification failed' } });
      }
    }

    const subscription = await subscriptionService.createSubscription(hostId, planId, paymentId);
    res.json({ success: true, data: { subscription: subscription.subscription, message: `Successfully upgraded to ${getPlanConfig(planId).name} plan` } });
  } catch (error) {
    logger.error('Verify subscription payment error', { error: error.message });
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to verify subscription' } });
  }
};

exports.cancelHostSubscription = async (req, res) => {
  try {
    const hostId = req.user._id;
    const { reason } = req.body;
    const subscription = await Subscription.findOne({ hostId, status: 'active' });

    if (!subscription) {
      return res.status(404).json({ error: { code: 'NO_ACTIVE_SUBSCRIPTION', message: 'No active subscription found' } });
    }

    const cancelled = await subscriptionService.cancelSubscription(subscription._id, reason);
    res.json({ success: true, data: { message: 'Subscription cancelled. Downgraded to FREE plan.', subscription: cancelled } });
  } catch (error) {
    logger.error('Cancel subscription error', { hostId: req.user._id, error: error.message });
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to cancel subscription' } });
  }
};

exports.getSubscriptionStatistics = async (req, res) => {
  try {
    const stats = await subscriptionService.getSubscriptionStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Get subscription stats error', { error: error.message });
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch statistics' } });
  }
};

exports.getAllActiveSubscriptions = async (req, res) => {
  try {
    const { plan, limit = 50, skip = 0 } = req.query;
    const query = { status: 'active', expiryDate: { $gt: new Date() } };
    if (plan) query.plan = plan;

    const subscriptions = await Subscription.find(query).populate('hostId', 'name email').limit(Number(limit)).skip(Number(skip)).sort({ expiryDate: -1 }).lean();
    const total = await Subscription.countDocuments(query);

    res.json({ success: true, data: { subscriptions, pagination: { total, limit: Number(limit), skip: Number(skip), pages: Math.ceil(total / Number(limit)) } } });
  } catch (error) {
    logger.error('Get all subscriptions error', { error: error.message });
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch subscriptions' } });
  }
};
