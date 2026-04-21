const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/admin/admin.controller');
const { protect, authorize } = require('../../middleware/auth');

// Public/Authenticated routes for users to get plans and validate offers
router.get('/plans', adminController.getPlans);
router.post('/offers/validate', protect, adminController.validateOffer);

// Admin-only routes
router.put('/plans/:planId', protect, authorize('admin'), adminController.updatePlan);
router.post('/offers', protect, authorize('admin'), adminController.createOffer);
router.get('/offers', protect, authorize('admin'), adminController.getOffers);

module.exports = router;
