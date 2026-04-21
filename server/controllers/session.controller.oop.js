const QuizSession = require('../models/QuizSession');
const { SessionManager } = require('../modules');
const { sendSuccess, sendError, getManagedQuizOrError } = require('../utils/controllerHelpers');
const logger = require('../utils/logger');

/**
 * OOP Session Controller
 * Bridges HTTP requests to the OOP SessionManager (State Pattern)
 */
class SessionController {
    /**
     * Start a quiz (move from WAITING to LIVE)
     */
    async startLiveSession(req, res) {
        try {
            const { id } = req.params;
            const quizResult = await getManagedQuizOrError(req, id);
            if (quizResult.error) return sendError(res, quizResult.statusCode, quizResult.error);

            const session = await QuizSession.findOne({ 
                quizId: id, 
                status: 'waiting' 
            }).sort({ createdAt: -1 });

            if (!session) return sendError(res, 404, 'No waiting session found');

            const manager = new SessionManager(session);
            await manager.start();

            return sendSuccess(res, {
                roomCode: session.sessionCode,
                status: 'live'
            }, 'Quiz started successfully');
        } catch (error) {
            logger.error('[OOP SessionController] startLiveSession', { error: error.message });
            return sendError(res, 500, error.message);
        }
    }

    /**
     * Pause an ongoing quiz
     */
    async pauseSession(req, res) {
        try {
            const { sessionCode } = req.body;
            const session = await QuizSession.findOne({ sessionCode, status: 'live' });
            if (!session) return sendError(res, 404, 'Live session not found');

            const manager = new SessionManager(session);
            await manager.pause();

            return sendSuccess(res, null, 'Quiz paused');
        } catch (error) {
            logger.error('[OOP SessionController] pauseSession', { error: error.message });
            return sendError(res, 500, error.message);
        }
    }

    /**
     * Resume a paused quiz
     */
    async resumeSession(req, res) {
        try {
            const { sessionCode } = req.body;
            const session = await QuizSession.findOne({ sessionCode, status: 'paused' });
            if (!session) return sendError(res, 404, 'Paused session not found');

            const manager = new SessionManager(session);
            await manager.resume();

            return sendSuccess(res, null, 'Quiz resumed');
        } catch (error) {
            logger.error('[OOP SessionController] resumeSession', { error: error.message });
            return sendError(res, 500, error.message);
        }
    }

    /**
     * End a quiz gracefully
     */
    async endSession(req, res) {
        try {
            const { sessionCode } = req.body;
            const session = await QuizSession.findOne({ sessionCode, status: { $in: ['live', 'paused'] } });
            if (!session) return sendError(res, 404, 'Active session not found');

            const manager = new SessionManager(session);
            await manager.end();

            return sendSuccess(res, null, 'Quiz ended');
        } catch (error) {
            logger.error('[OOP SessionController] endSession', { error: error.message });
            return sendError(res, 500, error.message);
        }
    }
}

module.exports = new SessionController();
