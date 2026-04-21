const Subscription = require('../../models/Subscription');
const { getPlanConfig } = require('../../utils/subscriptionPlans');
const logger = require('../../utils/logger');

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

module.exports = {
  getActiveSubscription,
  getHostCurrentPlan,
  createSubscription,
  handleSubscriptionExpiry,
  cancelSubscription,
  processSubscriptionPayment,
  handleFailedSubscriptionPayment,
  getSubscriptionStats
};
