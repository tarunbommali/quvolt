const { subscriptionService } = require('../modules');
const { getPlanConfig, getAllPlans } = require('../utils/subscriptionPlans');
const Subscription = require('../models/Subscription');
const logger = require('../utils/logger');
const { sendSuccess, sendError } = require('../utils/responseHelper');

/**
 * Subscription Controller (OOP Refactored)
 * Routes HTTP requests to the refactored SubscriptionService class.
 */
class SubscriptionController {
  /**
   * Get all available subscription plans
   */
  async getAllSubscriptionPlans(req, res) {
    try {
      const plans = getAllPlans();
      return sendSuccess(res, plans, 'Plans fetched successfully');
    } catch (error) {
      logger.error('Get plans error', { error: error.message });
      return sendError(res, 'Failed to fetch plans', 500, error.message);
    }
  }

  /**
   * Get detailed subscription info for a host
   */
  async getHostSubscription(req, res) {
    try {
      const hostId = req.user._id;
      const subscription = await subscriptionService.getActiveSubscription(hostId);
      const plan = subscription?.plan || 'FREE';
      const planConfig = getPlanConfig(plan);

      return sendSuccess(res, {
        plan,
        status: subscription?.status || 'active',
        subscription: subscription || this._getDefaultFreeSub(planConfig),
        participantLimit: subscription?.participantLimit || planConfig.participants,
      }, 'Subscription fetched successfully');
    } catch (error) {
      logger.error('Get host subscription error', { hostId: req.user._id, error: error.message });
      return sendError(res, 'Failed to fetch subscription', 500, error.message);
    }
  }

  /**
   * Get subscription status summary
   */
  async getSubscriptionStatus(req, res) {
    try {
      const hostId = req.user._id;
      const subscription = await subscriptionService.getActiveSubscription(hostId);
      const plan = subscription?.plan || 'FREE';
      const planConfig = getPlanConfig(plan);

      return sendSuccess(res, {
        plan,
        status: subscription?.status || 'inactive',
        participantLimit: subscription?.participantLimit || planConfig.participants,
        expiryDate: subscription?.expiryDate || null,
        subscription: subscription || null,
      }, 'Subscription status fetched');
    } catch (error) {
      logger.error('Get subscription status error', { hostId: req.user._id, error: error.message });
      return sendError(res, 'Failed to fetch subscription status', 500, error.message);
    }
  }

  /**
   * Create an order for upgrading/renewing subscription
   */
  async createSubscriptionOrder(req, res) {
    try {
      const { planId } = req.body;
      const hostId = req.user._id;

      const result = await subscriptionService.createSubscriptionOrder(hostId, planId);
      
      if (result.type === 'FREE') {
        return sendSuccess(res, { 
          subscription: result.subscription, 
        }, 'Successfully upgraded to FREE plan');
      }

      return sendSuccess(res, { 
        orderId: result.orderId, 
        planId, 
        amount: result.amount, 
        currency: 'INR', 
        key: result.key,
        mock: result.mock 
      }, 'Order created successfully', 201);
    } catch (error) {
      const status = error.status || 500;
      logger.error('Create subscription order error', { error: error.message, hostId: req.user._id });
      return sendError(res, error.message, status, error.code);
    }
  }

  /**
   * Verify subscription payment
   */
  async verifySubscriptionPayment(req, res) {
    try {
      const { orderId, paymentId, signature, planId } = req.body;
      const hostId = req.user._id;

      if (!orderId || !paymentId || !signature || !planId) {
        return sendError(res, 'Missing required fields', 400);
      }

      const result = await subscriptionService.verifySubscriptionPayment({ 
        hostId, 
        orderId, 
        paymentId, 
        signature, 
        planId 
      });

      return sendSuccess(res, { 
        subscription: result.subscription, 
      }, `Successfully upgraded to ${getPlanConfig(planId).name} plan`);
    } catch (error) {
      const status = error.status || 500;
      logger.error('Verify subscription payment error', { error: error.message });
      return sendError(res, error.message, status, error.code);
    }
  }

  /**
   * Cancel subscription (downgrade to FREE)
   */
  async cancelHostSubscription(req, res) {
    try {
      const hostId = req.user._id;
      const { reason } = req.body;
      const subscription = await Subscription.findOne({ hostId, status: 'active' });

      if (!subscription) {
        return sendError(res, 'No active subscription found', 404);
      }

      // Reusing handleSubscriptionExpiry to perform the downgrade
      const { handleSubscriptionExpiry } = require('../services/subscription/subscription.service');
      const cancelled = await handleSubscriptionExpiry(subscription);
      
      return sendSuccess(res, { 
        subscription: cancelled 
      }, 'Subscription cancelled. Downgraded to FREE plan.');
    } catch (error) {
      logger.error('Cancel subscription error', { hostId: req.user._id, error: error.message });
      return sendError(res, 'Failed to cancel subscription', 500, error.message);
    }
  }

  // --- Private Helpers ---

  _getDefaultFreeSub(planConfig) {
    return {
      plan: 'FREE',
      status: 'active',
      monthlyAmount: 0,
      participantLimit: planConfig.participants,
      features: planConfig.features,
    };
  }
}

module.exports = new SubscriptionController();
