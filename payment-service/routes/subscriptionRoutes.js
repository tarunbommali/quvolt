const express = require('express');
const subscriptionController = require('../controllers/subscriptionController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.get('/plans', (req, res) => subscriptionController.getAllSubscriptionPlans(req, res));

// Protected routes (hosts/hosts)
router.get('/my-subscription', protect, authorize('host', 'admin'), (req, res) => subscriptionController.getHostSubscription(req, res));
router.get('/status', protect, authorize('host', 'admin'), (req, res) => subscriptionController.getSubscriptionStatus(req, res));
router.post('/create-order', protect, authorize('host', 'admin'), (req, res) => subscriptionController.createSubscriptionOrder(req, res));
router.post('/create', protect, authorize('host', 'admin'), (req, res) => subscriptionController.createSubscriptionOrder(req, res));
router.post('/verify-payment', protect, authorize('host', 'admin'), (req, res) => subscriptionController.verifySubscriptionPayment(req, res));
router.post('/verify', protect, authorize('host', 'admin'), (req, res) => subscriptionController.verifySubscriptionPayment(req, res));
router.post('/cancel', protect, authorize('host', 'admin'), (req, res) => subscriptionController.cancelHostSubscription(req, res));

// Admin routes
router.get('/admin/statistics', protect, authorize('admin'), (req, res) => subscriptionController.getSubscriptionStatistics(req, res));
router.get('/admin/all', protect, authorize('admin'), (req, res) => subscriptionController.getAllActiveSubscriptions(req, res));

module.exports = router;
