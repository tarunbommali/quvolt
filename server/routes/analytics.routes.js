const express = require('express');
const requireRole = require('../middleware/requireRole');
const analyticsController = require('../controllers/analytics.controller');

const router = express.Router();

/**
 * Quiz-specific analytics (Host/Admin only)
 * Restricted by plan: advanced metrics (dropoff, correlation) gated to CREATOR+
 */
router.get('/quiz/:quizId', requireRole(['host', 'admin']), analyticsController.getQuizAnalytics);

/**
 * Global Summary for Host (Admin can view others via query param)
 */
router.get('/summary', requireRole(['host', 'admin']), analyticsController.gethostAnalyticsSummary);

/**
 * User personal analytics (Participant/Host/Admin)
 */
router.get('/user', requireRole(['participant', 'host', 'admin']), analyticsController.getUserAnalytics);

/**
 * View specific user analytics (Host/Admin only)
 */
router.get('/user/:userId', requireRole(['host', 'admin']), analyticsController.getUserAnalytics);

module.exports = router;
