const express = require('express');
const requireRole = require('../middleware/requireRole');
const { getQuizAnalytics, getUserAnalytics, getOrganizerAnalyticsSummary } = require('../services/analytics.service');
const Quiz = require('../models/Quiz');

const router = express.Router();

router.get('/quiz/:quizId', requireRole(['organizer', 'admin']), async (req, res) => {
    try {
        const { quizId } = req.params;

        if (req.user.role !== 'admin') {
            const ownedQuiz = await Quiz.findOne({ _id: quizId, organizerId: req.user._id }).select('_id').lean();
            if (!ownedQuiz) {
                return res.status(403).json({ message: 'Not authorized to view this quiz analytics' });
            }
        }

        const data = await getQuizAnalytics(quizId);
        return res.json(data);
    } catch (error) {
        const statusCode = error.message === 'Quiz not found' ? 404 : 400;
        return res.status(statusCode).json({ message: error.message || 'Failed to load quiz analytics' });
    }
});

router.get('/user', requireRole(['participant', 'organizer', 'admin']), async (req, res) => {
    try {
        const data = await getUserAnalytics(req.user._id);
        return res.json(data);
    } catch (error) {
        return res.status(400).json({ message: error.message || 'Failed to load user analytics' });
    }
});

router.get('/user/:userId', requireRole(['organizer', 'admin']), async (req, res) => {
    try {
        const data = await getUserAnalytics(req.params.userId);
        return res.json(data);
    } catch (error) {
        return res.status(400).json({ message: error.message || 'Failed to load user analytics' });
    }
});

router.get('/summary', requireRole(['organizer', 'admin']), async (req, res) => {
    try {
        const targetUserId = req.user.role === 'admin' && req.query.userId
            ? req.query.userId
            : req.user._id;

        const data = await getOrganizerAnalyticsSummary(targetUserId);
        return res.json(data);
    } catch (error) {
        return res.status(400).json({ message: error.message || 'Failed to load organizer analytics summary' });
    }
});

module.exports = router;
