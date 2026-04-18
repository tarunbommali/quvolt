const QuizSession = require('../models/QuizSession');
const Quiz = require('../models/Quiz');
const sessionStore = require('../services/session/session.service');
const logger = require('../utils/logger');
const { SESSION_STATUS } = require('../utils/sessionStateMachine');

/**
 * Session Cleanup Job
 * Detects and aborts stale sessions that have been in live state for too long
 */

const STALE_SESSION_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // Run every hour

let cleanupInterval = null;
let ioInstance = null;

/**
 * Start the session cleanup job
 * @param {Object} io - Socket.io instance for broadcasting
 */
const startSessionCleanupJob = (io) => {
    if (cleanupInterval) {
        logger.warn('Session cleanup job already running');
        return;
    }
    
    ioInstance = io;
    
    logger.info('Starting session cleanup job', {
        interval: CLEANUP_INTERVAL_MS,
        threshold: STALE_SESSION_THRESHOLD_MS
    });
    
    // Run immediately on startup
    cleanupStaleSessions().catch(error => {
        logger.error('Initial session cleanup failed', { error: error.message });
    });
    
    // Then run periodically
    cleanupInterval = setInterval(() => {
        cleanupStaleSessions().catch(error => {
            logger.error('Scheduled session cleanup failed', { error: error.message });
        });
    }, CLEANUP_INTERVAL_MS);
    
    // Ensure interval doesn't prevent process exit
    cleanupInterval.unref();
};

/**
 * Stop the session cleanup job
 */
const stopSessionCleanupJob = () => {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
        logger.info('Session cleanup job stopped');
    }
};

/**
 * Clean up stale sessions
 * @returns {Promise<Object>} Cleanup statistics
 */
const cleanupStaleSessions = async () => {
    try {
        logger.info('Running session cleanup job');
        
        const cutoffTime = new Date(Date.now() - STALE_SESSION_THRESHOLD_MS);
        
        // Find sessions that have been in live state for more than 24 hours
        const staleSessions = await QuizSession.find({
            status: SESSION_STATUS.LIVE,
            $or: [
                { startedAt: { $lt: cutoffTime } },
                { updatedAt: { $lt: cutoffTime } }
            ]
        }).populate('quizId', '_id status').lean();
        
        const stats = {
            checked: staleSessions.length,
            aborted: 0,
            errors: []
        };
        
        if (staleSessions.length === 0) {
            logger.info('No stale sessions found');
            return stats;
        }
        
        logger.info('Found stale sessions', { count: staleSessions.length });
        
        for (const session of staleSessions) {
            try {
                await abortStaleSession(session);
                stats.aborted++;
            } catch (error) {
                stats.errors.push({
                    sessionCode: session.sessionCode,
                    error: error.message
                });
                logger.error('Failed to abort stale session', {
                    sessionCode: session.sessionCode,
                    sessionId: session._id,
                    error: error.message
                });
            }
        }
        
        logger.info('Session cleanup completed', stats);
        return stats;
    } catch (error) {
        logger.error('Session cleanup job failed', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
};

/**
 * Abort a single stale session
 * @param {Object} session - Session document
 */
const abortStaleSession = async (session) => {
    const sessionCode = session.sessionCode;
    const endedAt = new Date();
    const message = 'Session automatically aborted due to inactivity (>24 hours)';
    
    logger.info('Aborting stale session', {
        sessionCode,
        sessionId: session._id,
        startedAt: session.startedAt,
        age: Date.now() - new Date(session.startedAt).getTime()
    });
    
    // Update session in database
    await QuizSession.findByIdAndUpdate(session._id, {
        status: SESSION_STATUS.ABORTED,
        endedAt,
        lastSessionMessage: message
    });
    
    // Update quiz if it exists
    if (session.quizId) {
        await Quiz.findByIdAndUpdate(session.quizId._id || session.quizId, {
            status: SESSION_STATUS.ABORTED,
            lastSessionCode: sessionCode,
            lastSessionStatus: 'aborted',
            lastSessionEndedAt: endedAt,
            lastSessionMessage: message
        });
    }
    
    // Notify connected participants if any
    if (ioInstance) {
        ioInstance.to(sessionCode).emit('quiz_aborted', {
            message,
            roomCode: sessionCode,
            quizId: session.quizId?._id?.toString() || session.quizId?.toString() || null,
            endedAt: endedAt.toISOString(),
            reason: 'stale_session'
        });
        
        // Disconnect all sockets from the room (if supported)
        if (typeof ioInstance.in === 'function') {
            setTimeout(async () => {
                try {
                    const sockets = await ioInstance.in(sessionCode).fetchSockets();
                    for (const socket of sockets) {
                        socket.leave(sessionCode);
                    }
                } catch (error) {
                    logger.warn('Failed to disconnect sockets from room', {
                        sessionCode,
                        error: error.message
                    });
                }
            }, 100);
        }
    }
    
    // Remove from Redis
    await sessionStore.deleteSession(sessionCode);
    
    logger.info('Stale session aborted successfully', {
        sessionCode,
        sessionId: session._id
    });
};

/**
 * Manually trigger cleanup (for testing or admin operations)
 * @returns {Promise<Object>} Cleanup statistics
 */
const triggerCleanup = async () => {
    logger.info('Manual session cleanup triggered');
    return await cleanupStaleSessions();
};

/**
 * Get cleanup job status
 * @returns {Object} Job status
 */
const getCleanupJobStatus = () => {
    return {
        running: cleanupInterval !== null,
        interval: CLEANUP_INTERVAL_MS,
        threshold: STALE_SESSION_THRESHOLD_MS
    };
};

module.exports = {
    startSessionCleanupJob,
    stopSessionCleanupJob,
    cleanupStaleSessions,
    triggerCleanup,
    getCleanupJobStatus,
    STALE_SESSION_THRESHOLD_MS,
    CLEANUP_INTERVAL_MS
};
