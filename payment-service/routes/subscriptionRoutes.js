const express = require('express');
const subscriptionController = require('../controllers/subscriptionController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.get('/plans', subscriptionController.getAllSubscriptionPlans);

// Protected routes (organizers/hosts)
router.get('/my-subscription', protect, authorize('organizer', 'admin'), subscriptionController.getHostSubscription);
router.get('/status', protect, authorize('organizer', 'admin'), subscriptionController.getSubscriptionStatus);
router.post('/create-order', protect, authorize('organizer', 'admin'), subscriptionController.createSubscriptionOrder);
router.post('/create', protect, authorize('organizer', 'admin'), subscriptionController.createSubscriptionOrder);
router.post('/verify-payment', protect, authorize('organizer', 'admin'), subscriptionController.verifySubscriptionPayment);
router.post('/verify', protect, authorize('organizer', 'admin'), subscriptionController.verifySubscriptionPayment);
router.post('/cancel', protect, authorize('organizer', 'admin'), subscriptionController.cancelHostSubscription);

// Admin routes
router.get('/admin/statistics', protect, authorize('admin'), subscriptionController.getSubscriptionStatistics);
router.get('/admin/all', protect, authorize('admin'), subscriptionController.getAllActiveSubscriptions);

module.exports = router;
