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
            if (quizResult.error) return sendError(res, quizResult.error, quizResult.statusCode);

            // Fetch the most recent waiting session for this quiz
            const session = await QuizSession.findOne({ 
                quizId: id, 
                status: 'waiting' 
            }).sort({ createdAt: -1 });

            if (!session) {
                return sendError(res, 'No waiting session found for this quiz. Please start a session first.', 404);
            }

            const manager = new SessionManager(session);
            
            // Hard Guard: Ensure we are actually in WAITING state before starting
            if (session.status !== 'waiting') {
                return sendError(res, `Cannot start session: current status is ${session.status}`, 409);
            }

            await manager.start();

            // Sync Quiz model status (Hardening: Requirement 8.1)
            await require('../models/Quiz').findByIdAndUpdate(id, { status: 'live' });

            return sendSuccess(res, {
                roomCode: session.sessionCode,
                status: session.status,
                sessionId: session._id
            }, 'Quiz started successfully');
        } catch (error) {
            logger.error('[OOP SessionController] startLiveSession', { 
                quizId: req.params.id,
                error: error.message,
                stack: error.stack 
            });
            return sendError(res, error.message, 500);
        }
    }

    /**
     * Pause an ongoing quiz
     */
    async pauseSession(req, res) {
        try {
            const { sessionCode } = req.body;
            const session = await QuizSession.findOne({ sessionCode, status: 'live' });
            if (!session) return sendError(res, 'Live session not found', 404);

            const manager = new SessionManager(session);
            await manager.pause();

            return sendSuccess(res, null, 'Quiz paused');
        } catch (error) {
            logger.error('[OOP SessionController] pauseSession', { error: error.message });
            return sendError(res, error.message, 500);
        }
    }

    /**
     * Resume a paused quiz
     */
    async resumeSession(req, res) {
        try {
            const { sessionCode } = req.body;
            const session = await QuizSession.findOne({ sessionCode, status: 'paused' });
            if (!session) return sendError(res, 'Paused session not found', 404);

            const manager = new SessionManager(session);
            await manager.resume();

            return sendSuccess(res, null, 'Quiz resumed');
        } catch (error) {
            logger.error('[OOP SessionController] resumeSession', { error: error.message });
            return sendError(res, error.message, 500);
        }
    }

    /**
     * End a quiz gracefully
     */
    async endSession(req, res) {
        try {
            const { sessionCode } = req.body;
            const session = await QuizSession.findOne({ sessionCode, status: { $in: ['live', 'paused'] } });
            if (!session) return sendError(res, 'Active session not found', 404);

            const manager = new SessionManager(session);
            await manager.end();

            // Sync Quiz model status
            await require('../models/Quiz').findByIdAndUpdate(session.quizId, { status: 'completed' });

            return sendSuccess(res, null, 'Quiz ended');
        } catch (error) {
            logger.error('[OOP SessionController] endSession', { error: error.message });
            return sendError(res, error.message, 500);
        }
    }
}

module.exports = new SessionController();
