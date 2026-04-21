const { subscriptionService } = require('../modules');
const { getPlanConfig, getAllPlans } = require('../utils/subscriptionPlans');
const Subscription = require('../models/Subscription');
const logger = require('../utils/logger');

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
      res.json({ success: true, data: plans });
    } catch (error) {
      logger.error('Get plans error', { error: error.message });
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch plans' } });
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

      res.json({
        success: true,
        data: {
          plan,
          status: subscription?.status || 'active',
          subscription: subscription || this._getDefaultFreeSub(planConfig),
          participantLimit: subscription?.participantLimit || planConfig.participants,
          commission: subscription?.commission ?? planConfig.commission,
          commissionPercent: subscription?.commissionPercent ?? planConfig.commissionPercent,
        },
      });
    } catch (error) {
      logger.error('Get host subscription error', { hostId: req.user._id, error: error.message });
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to fetch subscription' } });
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
        return res.json({ 
          success: true, 
          data: { 
            subscription: result.subscription, 
            message: 'Successfully upgraded to FREE plan' 
          } 
        });
      }

      res.status(201).json({
        success: true,
        data: { 
          orderId: result.orderId, 
          planId, 
          amount: result.amount, 
          currency: 'INR', 
          key: result.key,
          mock: result.mock 
        },
      });
    } catch (error) {
      const status = error.status || 500;
      logger.error('Create subscription order error', { error: error.message, hostId: req.user._id });
      res.status(status).json({ 
        error: { code: error.code || 'SERVER_ERROR', message: error.message } 
      });
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
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } });
      }

      const result = await subscriptionService.verifySubscriptionPayment({ 
        hostId, 
        orderId, 
        paymentId, 
        signature, 
        planId 
      });

      res.json({ 
        success: true, 
        data: { 
          subscription: result.subscription, 
          message: `Successfully upgraded to ${getPlanConfig(planId).name} plan` 
        } 
      });
    } catch (error) {
      const status = error.status || 500;
      logger.error('Verify subscription payment error', { error: error.message });
      res.status(status).json({ 
        error: { code: error.code || 'SERVER_ERROR', message: error.message } 
      });
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
        return res.status(404).json({ error: { code: 'NO_ACTIVE_SUBSCRIPTION', message: 'No active subscription found' } });
      }

      // Reusing handleSubscriptionExpiry to perform the downgrade
      const { handleSubscriptionExpiry } = require('../services/subscription/subscription.service');
      const cancelled = await handleSubscriptionExpiry(subscription);
      
      res.json({ 
        success: true, 
        data: { message: 'Subscription cancelled. Downgraded to FREE plan.', subscription: cancelled } 
      });
    } catch (error) {
      logger.error('Cancel subscription error', { hostId: req.user._id, error: error.message });
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to cancel subscription' } });
    }
  }

  // --- Private Helpers ---

  _getDefaultFreeSub(planConfig) {
    return {
      plan: 'FREE',
      status: 'active',
      monthlyAmount: 0,
      participantLimit: planConfig.participants,
      commission: planConfig.commission,
      commissionPercent: planConfig.commissionPercent,
      features: planConfig.features,
    };
  }
}

module.exports = new SubscriptionController();
