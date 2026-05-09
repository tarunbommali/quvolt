const express = require('express');
const router = express.Router();
const blitzController = require('../controllers/blitz.controller');
const { protect } = require('../middleware/auth');

/**
 * Blitz System Routes
 */

// Start a new blitz session
router.post('/start', protect, blitzController.startBlitz);

// Record a result for a quiz within a blitz session
router.post('/record', protect, blitzController.recordResult);

// Get session details
router.get('/:sessionId', protect, blitzController.getSession);

// Join a blitz session
router.post('/:sessionId/join', protect, blitzController.joinSession);

// Update session status (e.g., start live, end session)
router.patch('/:sessionId/status', protect, blitzController.updateStatus);

// Get leaderboard (supports ?mode=folder)
router.get('/:sessionId/leaderboard', protect, blitzController.getLeaderboard);

// Get latest session for a quiz/folder
router.get('/target/:targetId', protect, blitzController.getLatestSession);

// Dynamic Folder Hierarchy & Scoreboard (NEW)
router.get('/folder/:folderId/scoreboard', protect, blitzController.getFolderScoreboard);
router.get('/folder/:folderId/children', protect, blitzController.getFolderChildren);

module.exports = router;
