const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { checkPermission, checkRevenueOwnership } = require('../middleware/checkPermission');
const {
  createOrder,
  verifyPayment,
  getPaymentStatus,
  getBatchPaymentStatus,
} = require('../controllers/paymentController');
const { handleWebhook } = require('../controllers/webhook.controller');
const {
  upsertHostAccount,
  getMyHostAccount,
  getHostPayoutSummary,
} = require('../controllers/payout.controller');
const kycController = require('../controllers/kyc.controller');
const revenueController = require('../controllers/revenueController');
const paymentRouter = require('../services/router/PaymentRouter');

// Payment routes
// Requirement 11.1: Require process_payment permission for creating payment orders
router.post('/create-order', protect, checkPermission('process_payment'), createOrder);
router.post('/verify', protect, verifyPayment);
router.get('/status/:quizId', protect, getPaymentStatus);
router.post('/status/batch', protect, getBatchPaymentStatus);
router.post('/webhook', handleWebhook); // Webhook usually uses signature, not JWT

// Requirement 11.3: Require manage_payouts permission for payout operations
router.post('/host/account', protect, authorize('host', 'admin'), checkPermission('manage_payouts'), upsertHostAccount);
router.get('/host/account', protect, authorize('host', 'admin'), getMyHostAccount);
router.get('/host/payout-summary', protect, authorize('host', 'admin'), checkPermission('manage_payouts'), getHostPayoutSummary);

// Host KYC Onboarding (Razorpay Route)
router.post('/host/onboarding', protect, authorize('host', 'admin'), checkPermission('manage_payouts'), kycController.createSubAccount);
router.post('/host/onboarding/link', protect, authorize('host', 'admin'), checkPermission('manage_payouts'), kycController.getOnboardingLink);
router.get('/host/onboarding/status', protect, authorize('host', 'admin'), checkPermission('manage_payouts'), kycController.checkKycStatus);

// Revenue routes
// Requirements 11.2, 11.4, 11.5: Require view_revenue permission and enforce ownership checks
router.post('/revenue/total', protect, authorize('host', 'admin'), checkPermission('view_revenue'), checkRevenueOwnership, revenueController.getTotalRevenue);
router.post('/revenue/by-quiz', protect, authorize('host', 'admin'), checkPermission('view_revenue'), checkRevenueOwnership, revenueController.getRevenueByQuiz);
router.post('/revenue/by-period', protect, authorize('host', 'admin'), checkPermission('view_revenue'), checkRevenueOwnership, revenueController.getRevenueByPeriod);
router.post('/revenue/by-gateway', protect, authorize('host', 'admin'), checkPermission('view_revenue'), checkRevenueOwnership, revenueController.getRevenueByGateway);
router.post('/revenue/analytics', protect, authorize('host', 'admin'), checkPermission('view_revenue'), checkRevenueOwnership, revenueController.getRevenueAnalytics);

// Transaction history route (Requirement 6.3)
// Requirements 11.4, 11.5: Enforce ownership checks for transaction history
router.get('/transactions/:userId', protect, checkPermission('view_revenue'), checkRevenueOwnership, revenueController.getTransactionHistory);

// Gateway health monitoring endpoint
// Requirements: 4.7, 6.6
router.get('/gateway-health', protect, authorize('host', 'admin'), async (req, res) => {
  try {
    const healthStatus = paymentRouter.getGatewayHealthStatus();
    const successRates = await paymentRouter.calculateGatewaySuccessRates();
    
    res.status(200).json({
      success: true,
      data: {
        gateways: healthStatus,
        successRates24h: successRates,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Error fetching gateway health status',
        details: { correlationId: req.correlationId },
      },
    });
  }
});

// Gateway performance metrics endpoint
// Requirements: 6.4, 6.5
router.get('/gateway-metrics', protect, authorize('host', 'admin'), async (req, res) => {
  try {
    const successRates = await paymentRouter.calculateGatewaySuccessRates();
    
    res.status(200).json({
      success: true,
      data: {
        metrics: successRates,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Error fetching gateway metrics',
        details: { correlationId: req.correlationId },
      },
    });
  }
});

// Flagged fallback transactions endpoint
// Requirement 6.4: Flag transactions that used fallback gateways
router.get('/flagged-transactions', protect, authorize('admin'), async (req, res) => {
  try {
    const { page, limit } = req.query;
    const result = await paymentRouter.getFlaggedFallbackTransactions({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50
    });
    
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Error fetching flagged transactions',
        details: { correlationId: req.correlationId },
      },
    });
  }
});

module.exports = router;

/**
 * Gateway Configuration Endpoints
 * Requirements: 11.6, 14.5, 14.6
 */

/**
 * @route   POST /payment/admin/gateways/config
 * @desc    Update gateway configuration
 * @access  Admin only
 * Requirements: 11.6, 14.5, 14.6
 */
router.post('/admin/gateways/config', protect, authorize('admin'), async (req, res) => {
  try {
    const { gatewayName, config } = req.body;

    if (!gatewayName || !config) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'gatewayName and config are required',
        },
      });
    }

    // Update gateway configuration
    const result = await paymentRouter.updateGatewayConfig(gatewayName, config);

    if (!result.success) {
      return res.status(400).json({
        error: {
          code: 'CONFIG_ERROR',
          message: result.message || 'Failed to update gateway configuration',
        },
      });
    }

    // Log configuration change in audit log (Requirement 14.6)
    const auditLogService = require('../../server/services/rbac/auditLog.service');
    await auditLogService.logSensitiveOperation({
      userId: req.user._id,
      resourceType: 'gateway',
      resourceId: gatewayName,
      action: 'update_gateway_config',
      permission: 'manage_gateway_config',
      correlationId: req.correlationId,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      metadata: {
        gatewayName,
        configKeys: Object.keys(config),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Gateway configuration updated successfully',
      data: {
        gatewayName,
        enabled: config.enabled,
        priority: config.priority,
      },
    });
  } catch (error) {
    console.error('Error updating gateway config:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to update gateway configuration',
        details: { correlationId: req.correlationId },
      },
    });
  }
});

/**
 * @route   GET /payment/admin/gateways/config
 * @desc    Get current gateway configuration (credentials redacted)
 * @access  Admin only
 * Requirement: 14.5
 */
router.get('/admin/gateways/config', protect, authorize('admin'), async (req, res) => {
  try {
    const config = paymentRouter.getGatewayConfig();

    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Error fetching gateway config:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch gateway configuration',
        details: { correlationId: req.correlationId },
      },
    });
  }
});

/**
 * @route   POST /payment/admin/gateways/:gatewayName/enable
 * @desc    Enable a gateway
 * @access  Admin only
 * Requirement: 14.2
 */
router.post('/admin/gateways/:gatewayName/enable', protect, authorize('admin'), async (req, res) => {
  try {
    const { gatewayName } = req.params;

    const result = await paymentRouter.enableGateway(gatewayName);

    if (!result.success) {
      return res.status(400).json({
        error: {
          code: 'CONFIG_ERROR',
          message: result.message || 'Failed to enable gateway',
        },
      });
    }

    // Log configuration change
    const auditLogService = require('../../server/services/rbac/auditLog.service');
    await auditLogService.logSensitiveOperation({
      userId: req.user._id,
      resourceType: 'gateway',
      resourceId: gatewayName,
      action: 'enable_gateway',
      permission: 'manage_gateway_config',
      correlationId: req.correlationId,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      metadata: { gatewayName },
    });

    res.status(200).json({
      success: true,
      message: `Gateway ${gatewayName} enabled successfully`,
    });
  } catch (error) {
    console.error('Error enabling gateway:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to enable gateway',
        details: { correlationId: req.correlationId },
      },
    });
  }
});

/**
 * @route   POST /payment/admin/gateways/:gatewayName/disable
 * @desc    Disable a gateway
 * @access  Admin only
 * Requirement: 14.2
 */
router.post('/admin/gateways/:gatewayName/disable', protect, authorize('admin'), async (req, res) => {
  try {
    const { gatewayName } = req.params;

    const result = await paymentRouter.disableGateway(gatewayName);

    if (!result.success) {
      return res.status(400).json({
        error: {
          code: 'CONFIG_ERROR',
          message: result.message || 'Failed to disable gateway',
        },
      });
    }

    // Log configuration change
    const auditLogService = require('../../server/services/rbac/auditLog.service');
    await auditLogService.logSensitiveOperation({
      userId: req.user._id,
      resourceType: 'gateway',
      resourceId: gatewayName,
      action: 'disable_gateway',
      permission: 'manage_gateway_config',
      correlationId: req.correlationId,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      metadata: { gatewayName },
    });

    res.status(200).json({
      success: true,
      message: `Gateway ${gatewayName} disabled successfully`,
    });
  } catch (error) {
    console.error('Error disabling gateway:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to disable gateway',
        details: { correlationId: req.correlationId },
      },
    });
  }
});
