const express = require('express');
const requireRole = require('../middleware/requireRole');
const requirePlan = require('../middleware/requirePlan');
const { protect } = require('../middleware/auth');
const analyticsController = require('../controllers/analytics.controller');

const router = express.Router();

/**
 * Quiz-specific analytics (Host/Admin only)
 * Advanced metrics (dropoff, correlation) gated to CREATOR+ via controller.
 */
router.get('/quiz/:quizId', protect, requireRole(['host', 'admin']), analyticsController.getQuizAnalytics);

/**
 * Global Summary for Host
 */
router.get('/summary', protect, requireRole(['host', 'admin']), analyticsController.gethostAnalyticsSummary);

/**
 * User personal analytics
 */
router.get('/user', protect, requireRole(['participant', 'host', 'admin']), analyticsController.getUserAnalytics);
router.get('/user/:userId', protect, requireRole(['host', 'admin']), analyticsController.getUserAnalytics);

/**
 * Session-level analytics (all plans — basic data)
 */
router.get('/sessions/recent', protect, requireRole(['host', 'admin']), analyticsController.getRecentSessions);
router.get('/session/:sessionId', protect, requireRole(['host', 'admin']), analyticsController.getSessionAnalytics);

/**
 * Unified plan-aware endpoint — 1 call returns all data the user's plan allows.
 * Backend enforces plan gates internally; no requirePlan middleware needed.
 */
router.get('/full/:sessionId', protect, requireRole(['host', 'admin']), analyticsController.getFullAnalytics);

/**
 * Question-level insights (CREATOR+ plan required)
 */
router.get('/questions/:sessionId', protect, requireRole(['host', 'admin']), requirePlan('CREATOR'), analyticsController.getSessionQuestionInsights);

/**
 * Audience insights (CREATOR+ plan required)
 */
router.get('/audience/:sessionId', protect, requireRole(['host', 'admin']), requirePlan('CREATOR'), analyticsController.getSessionAudienceInsights);

/**
 * Participant Drilldown (CREATOR+ plan required)
 */
router.get('/:sessionId/participant/:userId', protect, requireRole(['host', 'admin']), requirePlan('CREATOR'), analyticsController.getParticipantDrilldown);

module.exports = router;

