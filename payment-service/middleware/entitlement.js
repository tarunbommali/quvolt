const subscriptionService = require('../services/subscription/subscription.service');
const logger = require('../utils/logger');

/**
 * Entitlement Middleware for Quvolt
 * Enforces feature access based on host subscription plan
 */
const checkPlanAccess = (feature) => {
  return async (req, res, next) => {
    try {
      const hostId = req.user._id;
      const currentPlan = await subscriptionService.getHostCurrentPlan(hostId);
      
      const { getPlanConfig } = require('../utils/subscriptionPlans');
      const planConfig = getPlanConfig(currentPlan);

      if (!planConfig) {
        return res.status(403).json({ 
          error: { code: 'ACCESS_DENIED', message: 'No active plan configuration found' } 
        });
      }

      // feature-specific checks
      if (feature === 'ai_generation' && !planConfig.features.includes('AI_QUIZ_GENERATION')) {
        return res.status(403).json({ 
          error: { code: 'PLAN_LIMIT_EXCEEDED', message: 'AI generation requires Creator plan or higher' } 
        });
      }

      if (feature === 'private_quiz' && !planConfig.features.includes('PRIVATE_QUIZ_SESSIONS')) {
        return res.status(403).json({ 
          error: { code: 'PLAN_LIMIT_EXCEEDED', message: 'Private sessions require Creator plan or higher' } 
        });
      }

      // Add plan info to request for controllers to use (e.g. participant limits)
      req.plan = {
        name: currentPlan,
        config: planConfig
      };

      next();
    } catch (error) {
      logger.error('Plan access check failed', { error: error.message });
      res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Error checking subscription entitlements' } });
    }
  };
};

module.exports = { checkPlanAccess };
