const BaseService = require('../core/BaseService');
const Subscription = require('../../models/Subscription');
const { getPlanConfig } = require('../../utils/subscriptionPlans');

/**
 * Subscription Service (OOP Refactor)
 * Manages the lifecycle of host subscriptions.
 */
class SubscriptionService extends BaseService {
  /**
   * @param {Object} dependencies
   * @param {Object} dependencies.paymentRouter - Gateway router singleton
   * @param {Object} dependencies.idempotencyUtil - Idempotency helper
   */
  constructor({ paymentRouter, idempotencyUtil }) {
    super('SubscriptionService');
    this.paymentRouter = paymentRouter;
    this.idempotencyUtil = idempotencyUtil;
  }

  /**
   * Get host's active subscription
   */
  async getActiveSubscription(hostId) {
    const now = new Date();
    return Subscription.findOne({
      hostId,
      status: 'active',
      expiryDate: { $gt: now }
    }).sort({ expiryDate: -1, createdAt: -1 });
  }

  /**
   * Get host's current plan name
   */
  async getHostCurrentPlan(hostId) {
    const sub = await this.getActiveSubscription(hostId);
    return sub ? sub.plan : 'FREE';
  }

  /**
   * Create or upgrade subscription
   */
  async createSubscription(hostId, newPlan, razorpaySubId = null) {
    return this.execute(async () => {
      const now = new Date();
      const currentSub = await this.getActiveSubscription(hostId);
      const currentPlan = currentSub ? currentSub.plan : 'FREE';

      if (currentPlan === newPlan && currentSub) {
        return { success: true, subscription: currentSub };
      }

      // Handle Free Plan
      if (newPlan === 'FREE') {
        return this._handleFreeSubscription(hostId, now);
      }

      // Handle Paid Plan
      return this._handlePaidSubscription(hostId, newPlan, razorpaySubId, now, currentSub);
    });
  }

  /**
   * Create a subscription order for the gateway
   */
  async createSubscriptionOrder(hostId, planId) {
    return this.execute(async () => {
      const planConfig = getPlanConfig(planId);
      if (!planConfig) throw this._createError('Invalid plan ID', 'INVALID_PLAN', 400);

      if (planId === 'FREE') {
        const result = await this.createSubscription(hostId, 'FREE');
        return { type: 'FREE', subscription: result.subscription };
      }

      if (!planConfig.monthlyAmount || planConfig.monthlyAmount <= 0) {
        throw this._createError(`Invalid amount for plan ${planId}`, 'INVALID_AMOUNT', 400);
      }

      const receipt = this._buildSubscriptionReceipt(hostId, planId);
      const options = {
        amount: planConfig.monthlyAmount,
        currency: 'INR',
        receipt,
        notes: { hostId: String(hostId), planId, planName: planConfig.name },
      };

      try {
        const order = await this.paymentRouter.routeCreateOrder(options);
        return { 
          type: 'PAID', 
          orderId: order.id, 
          amount: planConfig.monthlyAmount / 100, 
          key: process.env.RAZORPAY_KEY_ID 
        };
      } catch (error) {
        const config = require('../../config/env');
        if (config.mockPaymentsEnabled) {
          const mockOrderId = `mock_sub_${String(hostId).slice(-6)}_${String(planId).toLowerCase()}_${Date.now().toString().slice(-6)}`;
          return { type: 'PAID', orderId: mockOrderId, amount: planConfig.monthlyAmount / 100, key: 'mock_key', mock: true };
        }
        throw error;
      }
    });
  }

  /**
   * Verify a subscription payment
   */
  async verifySubscriptionPayment({ hostId, orderId, paymentId, signature, planId }) {
    const idempotencyKey = `verify:subscription:${orderId}`;

    return this.idempotencyUtil.ensureIdempotent(idempotencyKey, async () => {
      const config = require('../../config/env');
      const isMockMode = config.mockPaymentsEnabled && orderId.startsWith('mock_sub_');

      if (!isMockMode) {
        const crypto = require('crypto');
        const generatedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
        const sig1 = Buffer.from(signature, 'hex');
        const sig2 = Buffer.from(generatedSignature, 'hex');
        if (sig1.length !== sig2.length || !crypto.timingSafeEqual(sig1, sig2)) {
          throw this._createError('Payment verification failed', 'INVALID_SIGNATURE', 400);
        }
      }

      return this.createSubscription(hostId, planId, paymentId);
    });
  }

  // --- Private Helpers ---

  async _handleFreeSubscription(hostId, now) {
    await Subscription.updateMany({ hostId, status: 'active' }, { $set: { status: 'replaced', expiryDate: now } });

    const freeSub = await Subscription.create({
      hostId,
      plan: 'FREE',
      status: 'active',
      startDate: now,
      endDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      participantLimit: getPlanConfig('FREE').participants,
    });

    this.logInfo('Subscription downgraded to FREE', { hostId });
    return { success: true, subscription: freeSub };
  }

  async _handlePaidSubscription(hostId, newPlan, razorpaySubId, now, currentSub) {
    const expiryDate = new Date(now);
    expiryDate.setMonth(expiryDate.getMonth() + 1);

    await Subscription.updateMany({ hostId, status: 'active' }, { $set: { status: 'replaced', expiryDate: now } });

    const planConfig = getPlanConfig(newPlan);
    const subscription = await Subscription.create({
      hostId,
      plan: newPlan,
      razorpaySubscriptionId: razorpaySubId,
      status: 'active',
      startDate: now,
      endDate: expiryDate,
      expiryDate,
      monthlyAmount: planConfig.monthlyAmount,
      autoRenew: true,
      participantLimit: planConfig.participants,
      razorpayPlanId: planConfig.razorpayPlanId,
    });

    if (currentSub) {
      await Subscription.findByIdAndUpdate(currentSub._id, {
        $push: { upgradeHistory: { fromPlan: currentSub.plan, toPlan: newPlan, upgradedAt: now, reason: 'User plan change' } }
      });
    }

    this.logInfo('Subscription created', { hostId, newPlan });
    return { success: true, subscription };
  }

  _buildSubscriptionReceipt(hostId, planId) {
    const compactHost = String(hostId).slice(-8);
    const compactPlan = String(planId).slice(0, 3);
    const compactTime = Date.now().toString().slice(-8);
    return `sub_${compactHost}_${compactPlan}_${compactTime}`;
  }

  _createError(message, code, status) {
    const error = new Error(message);
    error.code = code;
    error.status = status;
    return error;
  }
}

module.exports = SubscriptionService;
