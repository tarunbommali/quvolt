const Subscription = require('../models/Subscription');
const logger = require('../utils/logger');
const {
  getActiveSubscription,
  getHostCurrentPlan,
  createSubscription,
  cancelSubscription,
  getSubscriptionStats,
} = require('../services/subscriptionService');
const { getPlanConfig, getAllPlans, SUBSCRIPTION_PLANS } = require('../utils/subscriptionPlans');
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

/**
 * Get all subscription plans (public)
 */
const getAllSubscriptionPlans = async (req, res) => {
  try {
    const plans = getAllPlans();
    res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    logger.error('Get plans error', { error: error.message });
    res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch plans' },
    });
  }
};

/**
 * Get host's current subscription
 */
const getHostSubscription = async (req, res) => {
  try {
    const hostId = req.user._id;

    const subscription = await getActiveSubscription(hostId);
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
    res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch subscription' },
    });
  }
};

const getSubscriptionStatus = async (req, res) => {
  try {
    const hostId = req.user._id;
    const subscription = await getActiveSubscription(hostId);
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
    return res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch subscription status' },
    });
  }
};

/**
 * Create Razorpay subscription order for plan upgrade
 */
const createSubscriptionOrder = async (req, res) => {
  try {
    const { planId } = req.body;
    const hostId = req.user._id;

    if (!planId || !SUBSCRIPTION_PLANS[planId]) {
      return res.status(400).json({
        error: { code: 'INVALID_PLAN', message: 'Invalid plan ID' },
      });
    }

    const planConfig = getPlanConfig(planId);

    // For FREE plan, no payment needed
    if (planId === 'FREE') {
      const subscription = await createSubscription(hostId, 'FREE');
      return res.json({
        success: true,
        data: {
          subscription,
          message: 'Successfully upgraded to FREE plan',
        },
      });
    }

    // Validate amount
    if (!planConfig.monthlyAmount || planConfig.monthlyAmount <= 0) {
      logger.error('Invalid plan amount', { planId, amount: planConfig.monthlyAmount });
      return res.status(400).json({
        error: { code: 'INVALID_AMOUNT', message: `Invalid amount for plan ${planId}` },
      });
    }

    // Create Razorpay order for paid plans
    let order;
    try {
      order = await razorpay.orders.create({
        amount: planConfig.monthlyAmount,
        currency: 'INR',
        receipt: buildSubscriptionReceipt(hostId, planId),
        notes: {
          hostId: String(hostId),
          planId,
          planName: planConfig.name,
        },
      });
    } catch (razorpayError) {
      if (config.mockPaymentsEnabled) {
        const mockOrderId = buildMockSubscriptionOrderId(hostId, planId);
        logger.warn('Falling back to mock subscription order', {
          hostId,
          planId,
          orderId: mockOrderId,
          amount: planConfig.monthlyAmount,
          reason: razorpayError.message,
        });

        return res.status(201).json({
          success: true,
          data: {
            orderId: mockOrderId,
            planId,
            amount: planConfig.monthlyAmount / 100,
            currency: 'INR',
            key: 'mock_key',
            mock: true,
          },
        });
      }

      logger.error('Razorpay order creation failed', {
        hostId,
        planId,
        error: razorpayError.message,
        code: razorpayError.code,
      });
      return res.status(503).json({
        error: {
          code: 'RAZORPAY_ERROR',
          message: 'Payment service temporarily unavailable. Please try again later.',
          details: process.env.NODE_ENV === 'development' ? razorpayError.message : undefined,
        },
      });
    }

    if (!order || !order.id) {
      logger.error('Invalid Razorpay response - missing order ID', { planId, hostId });
      return res.status(500).json({
        error: { code: 'SERVER_ERROR', message: 'Failed to create payment order' },
      });
    }

    logger.info('Subscription order created', {
      orderId: order.id,
      hostId,
      planId,
      amount: planConfig.monthlyAmount,
    });

    res.status(201).json({
      success: true,
      data: {
        orderId: order.id,
        planId,
        amount: planConfig.monthlyAmount / 100,
        currency: 'INR',
        key: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    if (error.code === 'PAYMENTS_DISABLED') {
      return res.status(503).json({
        error: { code: 'PAYMENTS_DISABLED', message: 'Subscription payments are disabled in this environment' },
      });
    }
    logger.error('Create subscription order error', {
      error: error.message,
      stack: error.stack,
      hostId: req.user._id,
    });
    res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to create subscription order' },
    });
  }
};

/**
 * Verify subscription payment (after Razorpay confirmation)
 */
const verifySubscriptionPayment = async (req, res) => {
  try {
    const { orderId, paymentId, signature, planId } = req.body;
    const hostId = req.user._id;

    if (!orderId || !paymentId || !signature || !planId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' },
      });
    }

    const isMockMode = config.mockPaymentsEnabled && isMockSubscriptionOrder(orderId);

    if (!isMockMode) {
      // Verify signature (timing-safe to prevent oracle attacks)
      const crypto = require('crypto');
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const sig1 = Buffer.from(signature, 'hex');
      const sig2 = Buffer.from(generatedSignature, 'hex');
      if (sig1.length !== sig2.length || !crypto.timingSafeEqual(sig1, sig2)) {
        logger.error('Subscription payment verification failed', { orderId, hostId });
        return res.status(400).json({
          error: { code: 'INVALID_SIGNATURE', message: 'Payment verification failed' },
        });
      }
    }

    if (!SUBSCRIPTION_PLANS[planId]) {
      return res.status(400).json({
        error: { code: 'INVALID_PLAN', message: 'Invalid plan' },
      });
    }

    // Create/upgrade subscription
    const subscription = await createSubscription(hostId, planId, paymentId);

    logger.info('Subscription activated', {
      hostId,
      planId,
      paymentId,
      mode: isMockMode ? 'mock' : 'gateway',
    });

    res.json({
      success: true,
      data: {
        subscription: subscription.subscription,
        message: `Successfully upgraded to ${getPlanConfig(planId).name} plan`,
      },
    });
  } catch (error) {
    if (error.code === 'PAYMENTS_DISABLED') {
      return res.status(503).json({
        error: { code: 'PAYMENTS_DISABLED', message: 'Subscription payments are disabled in this environment' },
      });
    }
    logger.error('Verify subscription payment error', { error: error.message });
    res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to verify subscription' },
    });
  }
};

/**
 * Cancel subscription
 */
const cancelHostSubscription = async (req, res) => {
  try {
    const hostId = req.user._id;
    const { reason } = req.body;

    const subscription = await Subscription.findOne({
      hostId,
      status: 'active',
    });

    if (!subscription) {
      return res.status(404).json({
        error: { code: 'NO_ACTIVE_SUBSCRIPTION', message: 'No active subscription found' },
      });
    }

    const cancelled = await cancelSubscription(subscription._id, reason);

    logger.info('Subscription cancelled', {
      hostId,
      planId: subscription.plan,
    });

    res.json({
      success: true,
      data: {
        message: 'Subscription cancelled. Downgraded to FREE plan.',
        subscription: cancelled,
      },
    });
  } catch (error) {
    logger.error('Cancel subscription error', { hostId: req.user._id, error: error.message });
    res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to cancel subscription' },
    });
  }
};

/**
 * Get subscription statistics (admin only)
 */
const getSubscriptionStatistics = async (req, res) => {
  try {
    const stats = await getSubscriptionStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Get subscription stats error', { error: error.message });
    res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch statistics' },
    });
  }
};

/**
 * Get all active subscriptions (admin only)
 */
const getAllActiveSubscriptions = async (req, res) => {
  try {
    const { plan, limit = 50, skip = 0 } = req.query;

    const query = { status: 'active', expiryDate: { $gt: new Date() } };
    if (plan) query.plan = plan;

    const subscriptions = await Subscription.find(query)
      .populate('hostId', 'name email')
      .limit(Number(limit))
      .skip(Number(skip))
      .sort({ expiryDate: -1 })
      .lean();

    const total = await Subscription.countDocuments(query);

    res.json({
      success: true,
      data: {
        subscriptions,
        pagination: {
          total,
          limit: Number(limit),
          skip: Number(skip),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    logger.error('Get all subscriptions error', { error: error.message });
    res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch subscriptions' },
    });
  }
};

module.exports = {
  getAllSubscriptionPlans,
  getHostSubscription,
  getSubscriptionStatus,
  createSubscriptionOrder,
  verifySubscriptionPayment,
  cancelHostSubscription,
  getSubscriptionStatistics,
  getAllActiveSubscriptions,
  buildSubscriptionReceipt,
};
