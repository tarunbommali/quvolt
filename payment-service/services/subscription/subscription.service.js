const razorpay = require('../../config/razorpay');
const config = require('../../config/env');
const Subscription = require('../../models/Subscription');
const User = require('../../models/User');
const { getPlanConfig } = require('../../utils/subscriptionPlans');
const logger = require('../../utils/logger');

/**
 * Sync user's plan with their active subscription
 */
async function syncUserPlan(hostId, plan) {
  try {
    await User.findByIdAndUpdate(hostId, { $set: { plan } });
    logger.info('User plan synced', { hostId, plan });
  } catch (err) {
    logger.error('Failed to sync user plan', { hostId, plan, error: err.message });
  }
}

/**
 * Get active subscription for a host
 * Returns the subscription if active and not expired
 */
async function getActiveSubscription(hostId) {
  const now = new Date();
  const subscription = await Subscription.findOne({
    hostId,
    status: 'active',
    expiryDate: { $gt: now }
  }).sort({ expiryDate: -1, createdAt: -1 });

  return subscription;
}

/**
 * Get host's current plan
 * Checks active subscription, defaults to FREE if none or expired
 */
async function getHostCurrentPlan(hostId) {
  const subscription = await getActiveSubscription(hostId);
  return subscription ? subscription.plan : 'FREE';
}

/**
 * Create or upgrade subscription for host
 */
async function createSubscription(hostId, newPlan, razorpaySubId = null) {
  try {
    const now = new Date();
    const activeSubscriptions = await Subscription.find({
      hostId,
      status: 'active',
      expiryDate: { $gt: now }
    }).sort({ expiryDate: -1, createdAt: -1 });

    const currentSubscription = activeSubscriptions[0] || null;
    const currentPlan = currentSubscription ? currentSubscription.plan : 'FREE';

    if (currentPlan === newPlan && currentSubscription) {
      await syncUserPlan(hostId, newPlan);
      return { success: true, subscription: currentSubscription };
    }

    if (newPlan === 'FREE') {
      await Subscription.updateMany(
        {
          hostId,
          status: 'active',
        },
        {
          $set: {
            status: 'replaced',
            currentCycleEnd: now,
            expiryDate: now,
          },
        }
      );

      const freeSubscription = await Subscription.create({
        hostId,
        plan: 'FREE',
        razorpaySubscriptionId: null,
        status: 'active',
        startDate: now,
        endDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
        currentCycleStart: now,
        currentCycleEnd: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
        monthlyAmount: 0,
        autoRenew: false,
        participantLimit: getPlanConfig('FREE').participants,
        commission: getPlanConfig('FREE').commission,
      });

      await syncUserPlan(hostId, 'FREE');

      logger.info({
        event: 'subscription_downgraded_to_free',
        hostId,
      });

      return { success: true, subscription: freeSubscription };
    }

    const expiryDate = new Date(now);
    expiryDate.setMonth(expiryDate.getMonth() + 1);

    await Subscription.updateMany(
      {
        hostId,
        status: 'active',
      },
      {
        $set: {
          status: 'replaced',
          currentCycleEnd: now,
          expiryDate: now,
        },
      }
    );

    const subscription = await Subscription.create({
      hostId,
      plan: newPlan,
      razorpaySubscriptionId: razorpaySubId,
      status: 'active',
      startDate: now,
      endDate: expiryDate,
      expiryDate,
      currentCycleStart: now,
      currentCycleEnd: expiryDate,
      monthlyAmount: getPlanConfig(newPlan).monthlyAmount,
      autoRenew: true,
      participantLimit: getPlanConfig(newPlan).participants,
      commission: getPlanConfig(newPlan).commission,
      commissionPercent: getPlanConfig(newPlan).commissionPercent,
      razorpayPlanId: getPlanConfig(newPlan).razorpayPlanId,
    });

    if (currentSubscription) {
      await Subscription.findByIdAndUpdate(currentSubscription._id, {
        $push: {
          upgradeHistory: {
            fromPlan: currentPlan,
            toPlan: newPlan,
            upgradedAt: now,
            reason: 'User plan change'
          }
        }
      });
    }

    await syncUserPlan(hostId, newPlan);

    logger.info({
      event: 'subscription_created',
      hostId,
      newPlan,
      expiryDate
    });

    return { success: true, subscription };
  } catch (err) {
    logger.error({ event: 'subscription_creation_failed', hostId, newPlan, error: err.message });
    throw err;
  }
}

/**
 * Handle subscription expiry
 * Downgrades to FREE plan
 */
async function handleSubscriptionExpiry(subscription) {
  try {
    subscription.status = 'expired';
    subscription.currentCycleEnd = new Date();
    subscription.endDate = new Date();
    await subscription.save();

    const { subscription: freeSubscription } = await createSubscription(subscription.hostId, 'FREE');
    await syncUserPlan(subscription.hostId, 'FREE');

    logger.info({
      event: 'subscription_expired_downgraded',
      hostId: subscription.hostId,
      expiredPlan: subscription.plan
    });

    return freeSubscription;
  } catch (err) {
    logger.error({
      event: 'subscription_expiry_handling_failed',
      subscriptionId: subscription._id,
      error: err.message
    });
    throw err;
  }
}

/**
 * Cancel subscription
 */
async function cancelSubscription(subscriptionId, reason = '') {
  try {
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) throw new Error('Subscription not found');

    subscription.status = 'cancelled';
    subscription.cancellationReason = reason;
    subscription.cancelledAt = new Date();
    subscription.currentCycleEnd = new Date();
    subscription.endDate = new Date();
    subscription.expiryDate = new Date();
    await subscription.save();

    await createSubscription(subscription.hostId, 'FREE');
    await syncUserPlan(subscription.hostId, 'FREE');

    logger.info({
      event: 'subscription_cancelled',
      subscriptionId,
      reason
    });

    return subscription;
  } catch (err) {
    logger.error({
      event: 'subscription_cancellation_failed',
      subscriptionId,
      error: err.message
    });
    throw err;
  }
}

/**
 * Process subscription renewal/payment
 * Called when Razorpay confirms payment for subscription cycle
 */
async function processSubscriptionPayment(subscriptionId, razorpayPaymentId, cycleAmount) {
  try {
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) throw new Error('Subscription not found');

    subscription.paidCycles = (subscription.paidCycles || 0) + 1;
    subscription.failedPaymentCount = 0;

    // Extend expiry date by 1 month
    const newExpiryDate = new Date(subscription.expiryDate);
    newExpiryDate.setMonth(newExpiryDate.getMonth() + 1);
    subscription.expiryDate = newExpiryDate;
    subscription.endDate = newExpiryDate;
    subscription.currentCycleStart = new Date();
    subscription.currentCycleEnd = newExpiryDate;

    await subscription.save();
    
    // Ensure user plan is PRO/PREMIUM
    await syncUserPlan(subscription.hostId, subscription.plan);

    logger.info({
      event: 'subscription_payment_processed',
      subscriptionId,
      razorpayPaymentId,
      cycleAmount
    });

    return subscription;
  } catch (err) {
    logger.error({
      event: 'subscription_payment_processing_failed',
      subscriptionId,
      error: err.message
    });
    throw err;
  }
}

/**
 * Handle failed subscription payment
 */
async function handleFailedSubscriptionPayment(subscriptionId) {
  try {
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) throw new Error('Subscription not found');

    subscription.failedPaymentCount = (subscription.failedPaymentCount || 0) + 1;

    // If 3 failed attempts, pause subscription
    if (subscription.failedPaymentCount >= 3) {
      subscription.status = 'paused';
      await syncUserPlan(subscription.hostId, 'FREE'); // Fallback to FREE while paused
    }

    await subscription.save();

    logger.info({
      event: 'subscription_payment_failed',
      subscriptionId,
      failedCount: subscription.failedPaymentCount
    });

    return subscription;
  } catch (err) {
    logger.error({
      event: 'subscription_failure_handling_failed',
      subscriptionId,
      error: err.message
    });
    throw err;
  }
}

/**
 * Get subscription statistics for admin
 */
async function getSubscriptionStats() {
  const now = new Date();

  const stats = await Subscription.aggregate([
    {
      $facet: {
        byPlan: [
          { $match: { status: 'active', expiryDate: { $gt: now } } },
          { $group: { _id: '$plan', count: { $sum: 1 }, totalRevenue: { $sum: '$monthlyAmount' } } }
        ],
        byStatus: [
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ],
        expiringSoon: [
          { $match: { status: 'active', expiryDate: { $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), $gt: now } } },
          { $count: 'count' }
        ],
        totalMRR: [
          { $match: { status: 'active', expiryDate: { $gt: now } } },
          { $group: { _id: null, total: { $sum: '$monthlyAmount' } } }
        ]
      }
    }
  ]);

  return stats[0];
}

const buildSubscriptionReceipt = (hostId, planId) => {
  const compactHost = String(hostId).slice(-8);
  const compactPlan = String(planId).slice(0, 3);
  const compactTime = Date.now().toString().slice(-8);
  return `sub_${compactHost}_${compactPlan}_${compactTime}`;
};

const buildMockSubscriptionOrderId = (hostId, planId) =>
  `mock_sub_${String(hostId).slice(-6)}_${String(planId).toLowerCase()}_${Date.now().toString().slice(-6)}`;

const isMockSubscriptionOrder = (orderId) => String(orderId || '').startsWith('mock_sub_');

async function createSubscriptionOrder(hostId, planId) {
  const planConfig = getPlanConfig(planId);
  if (!planConfig) {
    const error = new Error('Invalid plan ID');
    error.code = 'INVALID_PLAN';
    error.status = 400;
    throw error;
  }

  if (planId === 'FREE') {
    const result = await createSubscription(hostId, 'FREE');
    return { type: 'FREE', subscription: result.subscription };
  }

  if (!planConfig.monthlyAmount || planConfig.monthlyAmount <= 0) {
    const error = new Error(`Invalid amount for plan ${planId}`);
    error.code = 'INVALID_AMOUNT';
    error.status = 400;
    throw error;
  }

  try {
    const order = await razorpay.orders.create({
      amount: planConfig.monthlyAmount,
      currency: 'INR',
      receipt: buildSubscriptionReceipt(hostId, planId),
      notes: { hostId: String(hostId), planId, planName: planConfig.name },
    });
    return { type: 'PAID', orderId: order.id, amount: planConfig.monthlyAmount / 100, key: process.env.RAZORPAY_KEY_ID };
  } catch (error) {
    if (config.mockPaymentsEnabled) {
      const mockOrderId = buildMockSubscriptionOrderId(hostId, planId);
      return { type: 'PAID', orderId: mockOrderId, amount: planConfig.monthlyAmount / 100, key: 'mock_key', mock: true };
    }
    throw error;
  }
}

async function verifySubscriptionPayment({ hostId, orderId, paymentId, signature, planId }) {
  const { ensureIdempotent } = require('../../utils/idempotency');
  const idempotencyKey = `verify:subscription:${orderId}`;

  return ensureIdempotent(idempotencyKey, async () => {
    const isMockMode = config.mockPaymentsEnabled && isMockSubscriptionOrder(orderId);

    if (!isMockMode) {
      const crypto = require('crypto');
      const generatedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
      const sig1 = Buffer.from(signature, 'hex');
      const sig2 = Buffer.from(generatedSignature, 'hex');
      if (sig1.length !== sig2.length || !crypto.timingSafeEqual(sig1, sig2)) {
        const error = new Error('Payment verification failed');
        error.code = 'INVALID_SIGNATURE';
        error.status = 400;
        throw error;
      }
    }

    return createSubscription(hostId, planId, paymentId);
  });
}

module.exports = {
  getActiveSubscription,
  getHostCurrentPlan,
  createSubscription,
  handleSubscriptionExpiry,
  cancelSubscription,
  processSubscriptionPayment,
  handleFailedSubscriptionPayment,
  getSubscriptionStats,
  createSubscriptionOrder,
  verifySubscriptionPayment,
  buildSubscriptionReceipt,
  buildMockSubscriptionOrderId,
};
