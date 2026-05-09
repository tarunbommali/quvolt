const blitzService = require('../services/blitz/blitz.service');
const Quiz = require('../models/Quiz');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const logger = require('../utils/logger');

/**
 * Controller for Blitz Session management.
 */

const startBlitz = async (req, res) => {
    try {
        const { type, quizId, folderId } = req.body;
        const hostId = req.user._id;

        const session = await blitzService.startBlitz({
            type,
            quizId,
            folderId,
            hostId
        });

        return sendSuccess(res, session, 'Blitz session started successfully', 201);
    } catch (error) {
        logger.error('[BlitzController] startBlitz', { message: error.message, stack: error.stack });
        return sendError(res, error.message || 'Failed to start blitz', error.statusCode || 500);
    }
};

const getLeaderboard = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { mode } = req.query; // 'single' or 'folder'
        
        let leaderboard;
        if (mode === 'folder') {
            leaderboard = await blitzService.getFolderLeaderboard(sessionId);
        } else {
            leaderboard = await blitzService.getSingleLeaderboard(sessionId);
        }

        return sendSuccess(res, leaderboard, 'Leaderboard retrieved successfully');
    } catch (error) {
        logger.error('[BlitzController] getLeaderboard', { message: error.message, stack: error.stack });
        return sendError(res, error.message || 'Failed to get leaderboard', error.statusCode || 500);
    }
};

const joinSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user._id;

        const session = await blitzService.joinSession(sessionId, userId);
        return sendSuccess(res, session, 'Joined blitz session successfully');
    } catch (error) {
        logger.error('[BlitzController] joinSession', { message: error.message, stack: error.stack });
        return sendError(res, error.message || 'Failed to join session', error.statusCode || 500);
    }
};

const getSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user._id;

        const session = await blitzService.getSession(sessionId, userId);
        return sendSuccess(res, session, 'Session retrieved successfully');
    } catch (error) {
        logger.error('[BlitzController] getSession', { message: error.message, stack: error.stack });
        return sendError(res, error.message || 'Failed to get session', error.statusCode || 500);
    }
};

const updateStatus = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { status } = req.body;
        const hostId = req.user._id;

        const session = await blitzService.updateStatus(sessionId, hostId, status);
        return sendSuccess(res, session, `Session status updated to ${status}`);
    } catch (error) {
        logger.error('[BlitzController] updateStatus', { message: error.message, stack: error.stack });
        return sendError(res, error.message || 'Failed to update status', error.statusCode || 500);
    }
};

const recordResult = async (req, res) => {
    try {
        const { sessionId, quizId, score, unitId, folderId } = req.body;
        const userId = req.user._id;

        const result = await blitzService.recordResult({
            sessionId,
            userId,
            quizId,
            score,
            unitId,
            folderId
        });

        return sendSuccess(res, result, 'Result recorded successfully');
    } catch (error) {
        logger.error('[BlitzController] recordResult', { message: error.message, stack: error.stack });
        return sendError(res, error.message || 'Failed to record result', error.statusCode || 500);
    }
};

const getLatestSession = async (req, res) => {
    try {
        const { targetId } = req.params;
        const { type } = req.query; // 'folder' | 'single'

        const session = await blitzService.getLatestSessionForTarget(targetId, type);
        if (!session) return sendError(res, 'No session found for this target', 404);

        return sendSuccess(res, session, 'Latest session retrieved');
    } catch (error) {
        logger.error('[BlitzController] getLatestSession', { message: error.message, stack: error.stack });
        return sendError(res, error.message || 'Failed to get latest session', 500);
    }
};

const getFolderScoreboard = async (req, res) => {
    try {
        const { folderId } = req.params;
        const { groupBy = 'unit' } = req.query;

        const scoreboard = await blitzService.getDynamicFolderScoreboard(folderId, groupBy);
        return sendSuccess(res, scoreboard, 'Scoreboard retrieved successfully');
    } catch (error) {
        logger.error('[BlitzController] getFolderScoreboard', { message: error.message, stack: error.stack });
        return sendError(res, error.message || 'Failed to get scoreboard', 500);
    }
};

const getFolderChildren = async (req, res) => {
    try {
        const { folderId } = req.params;
        const children = await Quiz.find({ parentId: folderId }).sort({ level: 1 }).lean();
        return sendSuccess(res, children, 'Children retrieved successfully');
    } catch (error) {
        logger.error('[BlitzController] getFolderChildren', { message: error.message, stack: error.stack });
        return sendError(res, error.message || 'Failed to get children', 500);
    }
};

module.exports = {
    startBlitz,
    getLeaderboard,
    joinSession,
    getSession,
    updateStatus,
    recordResult,
    getLatestSession,
    getFolderScoreboard,
    getFolderChildren
};
