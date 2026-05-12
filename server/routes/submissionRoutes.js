const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const submissionController = require('../controllers/submission.controller');

// Participant: Get all quiz session history
router.get('/my-history', protect, requireRole(['participant', 'host', 'admin']), submissionController.getMyHistory);

// Participant: Get detailed analysis for a specific session
router.get('/my-results/:sessionId', protect, requireRole(['participant', 'host', 'admin']), submissionController.getMySessionResults);

module.exports = router;
