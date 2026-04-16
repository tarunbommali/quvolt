const express = require('express');
const subscriptionController = require('../controllers/subscriptionController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.get('/plans', subscriptionController.getAllSubscriptionPlans);

// Protected routes (hosts/hosts)
router.get('/my-subscription', protect, authorize('host', 'admin'), subscriptionController.getHostSubscription);
router.get('/status', protect, authorize('host', 'admin'), subscriptionController.getSubscriptionStatus);
router.post('/create-order', protect, authorize('host', 'admin'), subscriptionController.createSubscriptionOrder);
router.post('/create', protect, authorize('host', 'admin'), subscriptionController.createSubscriptionOrder);
router.post('/verify-payment', protect, authorize('host', 'admin'), subscriptionController.verifySubscriptionPayment);
router.post('/verify', protect, authorize('host', 'admin'), subscriptionController.verifySubscriptionPayment);
router.post('/cancel', protect, authorize('host', 'admin'), subscriptionController.cancelHostSubscription);

// Admin routes
router.get('/admin/statistics', protect, authorize('admin'), subscriptionController.getSubscriptionStatistics);
router.get('/admin/all', protect, authorize('admin'), subscriptionController.getAllActiveSubscriptions);

module.exports = router;
