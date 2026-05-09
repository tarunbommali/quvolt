const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { handleWebhook } = require('../controllers/webhook.controller');
const paymentRouter = require('../services/router/PaymentRouter');

// Webhook
router.post('/webhook', handleWebhook);

// Gateway health monitoring endpoint
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
      error: { code: 'SERVER_ERROR', message: 'Error fetching gateway health status', details: { correlationId: req.correlationId } }
    });
  }
});

// Gateway performance metrics endpoint
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
      error: { code: 'SERVER_ERROR', message: 'Error fetching gateway metrics', details: { correlationId: req.correlationId } }
    });
  }
});

module.exports = router;
