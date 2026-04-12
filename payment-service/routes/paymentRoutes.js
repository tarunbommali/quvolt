const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  createOrder,
  verifyPayment,
  getPaymentStatus,
  getBatchPaymentStatus,
  handleWebhook,
  upsertHostAccount,
  getMyHostAccount,
  getHostPayoutSummary
} = require('../controllers/paymentController');
const revenueController = require('../controllers/revenueController');

// Payment routes
router.post('/create-order', protect, createOrder);
router.post('/verify', protect, verifyPayment);
router.get('/status/:quizId', protect, getPaymentStatus);
router.post('/status/batch', protect, getBatchPaymentStatus);
router.post('/webhook', handleWebhook); // Webhook usually uses signature, not JWT
router.post('/host/account', protect, authorize('organizer', 'admin'), upsertHostAccount);
router.get('/host/account', protect, authorize('organizer', 'admin'), getMyHostAccount);
router.get('/host/payout-summary', protect, authorize('organizer', 'admin'), getHostPayoutSummary);

// Revenue routes
router.post('/revenue/total', protect, authorize('organizer', 'admin'), revenueController.getTotalRevenue);
router.post('/revenue/by-quiz', protect, authorize('organizer', 'admin'), revenueController.getRevenueByQuiz);
router.post('/revenue/by-period', protect, authorize('organizer', 'admin'), revenueController.getRevenueByPeriod);

module.exports = router;
