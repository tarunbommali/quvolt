const QuizSession = require('../../models/QuizSession');
const Submission = require('../../models/Submission');
const sessionStore = require('./session.service');
const logger = require('../../utils/logger');
const { SESSION_STATUS } = require('../../utils/sessionStateMachine');

/**
 * Session Recovery Service
 * Handles restoration of active sessions after server restart
 */

/**
 * Restore all active sessions from database to Redis
 * Called on server startup to recover from restarts
 * @param {Object} io - Socket.io instance for broadcasting
 * @returns {Promise<Object>} Recovery statistics
 */
const restoreActiveSessions = async (io) => {
    try {
        logger.info('Starting session recovery process');
        
        // Find all sessions that were active when server went down
        const activeSessions = await QuizSession.find({
            status: { $in: [SESSION_STATUS.WAITING, SESSION_STATUS.LIVE] }
        }).populate('quizId', 'questions mode interQuestionDelay roomCode').lean();

        const stats = {
            total: activeSessions.length,
            restored: 0,
            aborted: 0,
            errors: []
        };

        for (const dbSession of activeSessions) {
            try {
                await restoreSingleSession(io, dbSession);
                stats.restored++;
                logger.info('Session restored successfully', { 
                    sessionCode: dbSession.sessionCode,
                    status: dbSession.status 
                });
            } catch (error) {
                stats.errors.push({
                    sessionCode: dbSession.sessionCode,
                    error: error.message
                });
                logger.error('Failed to restore session', {
                    sessionCode: dbSession.sessionCode,
                    error: error.message,
                    stack: error.stack
                });
                
                // Abort sessions that can't be restored
                try {
                    await QuizSession.findByIdAndUpdate(dbSession._id, {
                        status: SESSION_STATUS.ABORTED,
                        endedAt: new Date()
                    });
                    stats.aborted++;
                } catch (abortError) {
                    logger.error('Failed to abort unrestorable session', {
                        sessionCode: dbSession.sessionCode,
                        error: abortError.message
                    });
                }
            }
        }

        logger.info('Session recovery completed', stats);
        return stats;
    } catch (error) {
        logger.error('Session recovery process failed', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
};

/**
 * Restore a single session to Redis
 * @param {Object} io - Socket.io instance
 * @param {Object} dbSession - Session document from MongoDB
 */
const restoreSingleSession = async (io, dbSession) => {
    const sessionCode = dbSession.sessionCode;
    
    // Check if session already exists in Redis (shouldn't happen, but be safe)
    const existingSession = await sessionStore.getSession(sessionCode);
    if (existingSession) {
        logger.warn('Session already exists in Redis, skipping', { sessionCode });
        return;
    }

    // Load participant data from submissions
    const participants = await loadParticipantData(dbSession._id, sessionCode);
    
    // Load leaderboard data from submissions
    const leaderboard = await loadLeaderboardData(dbSession._id, sessionCode);
    
    // Get questions from template snapshot or quiz
    const questions = dbSession.templateSnapshot?.questions || 
                     dbSession.quizId?.questions || 
                     [];

    if (questions.length === 0) {
        throw new Error('No questions found for session');
    }

    // Reconstruct session state
    const sessionState = {
        status: dbSession.status,
        mode: dbSession.mode || 'auto',
        isPaused: dbSession.isPaused || false,
        currentQuestionIndex: dbSession.currentQuestionIndex || 0,
        questionState: dbSession.questionState || 'waiting',
        questionStartTime: dbSession.questionStartTime ? new Date(dbSession.questionStartTime).getTime() : null,
        questionExpiry: dbSession.questionExpiry ? new Date(dbSession.questionExpiry).getTime() : null,
        participants,
        leaderboard,
        quizId: dbSession.quizId?._id?.toString() || dbSession.quizId?.toString(),
        sessionId: dbSession._id.toString(),
        waitingRoomCode: dbSession.quizId?.roomCode || null,
        questions: questions.map(q => ({ ...q })),
        lastActivity: Date.now(),
        participantLimit: 50,
        interQuestionDelay: (dbSession.quizId?.interQuestionDelay ?? 1.5) * 1000,
        pausedAt: dbSession.pausedAt ? new Date(dbSession.pausedAt).getTime() : null,
        timeLeftOnPause: null
    };

    // Calculate time left if paused
    if (sessionState.isPaused && sessionState.pausedAt && sessionState.questionExpiry) {
        sessionState.timeLeftOnPause = sessionState.questionExpiry - sessionState.pausedAt;
    }

    // Store session in Redis
    await sessionStore.setSession(sessionCode, sessionState);
    
    logger.info('Session state restored to Redis', {
        sessionCode,
        participantCount: Object.keys(participants).length,
        currentQuestionIndex: sessionState.currentQuestionIndex,
        status: sessionState.status
    });
};

/**
 * Load participant data from database
 * @param {String} sessionId - Session ID
 * @param {String} sessionCode - Session code
 * @returns {Promise<Object>} Participants map
 */
const loadParticipantData = async (sessionId, sessionCode) => {
    try {
        // Get unique participants from submissions
        const submissions = await Submission.find({
            $or: [
                { sessionId },
                { roomCode: sessionCode }
            ]
        })
        .populate('userId', 'name role')
        .select('userId')
        .lean();

        const participants = {};
        const seen = new Set();

        for (const submission of submissions) {
            if (!submission.userId) continue;
            
            const userId = submission.userId._id.toString();
            if (seen.has(userId)) continue;
            
            seen.add(userId);
            participants[userId] = {
                _id: userId,
                name: submission.userId.name,
                role: submission.userId.role || 'participant'
            };
        }

        return participants;
    } catch (error) {
        logger.error('Failed to load participant data', {
            sessionId,
            sessionCode,
            error: error.message
        });
        return {};
    }
};

/**
 * Load leaderboard data from submissions
 * @param {String} sessionId - Session ID
 * @param {String} sessionCode - Session code
 * @returns {Promise<Object>} Leaderboard map
 */
const loadLeaderboardData = async (sessionId, sessionCode) => {
    try {
        // Aggregate scores from submissions
        const results = await Submission.aggregate([
            {
                $match: {
                    $or: [
                        { sessionId },
                        { roomCode: sessionCode }
                    ]
                }
            },
            {
                $group: {
                    _id: '$userId',
                    totalScore: { $sum: '$score' },
                    totalTime: { $sum: '$timeTaken' },
                    correctAnswers: {
                        $sum: { $cond: ['$isCorrect', 1, 0] }
                    },
                    totalAnswers: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $unwind: '$user'
            }
        ]);

        const leaderboard = {};
        
        for (const result of results) {
            const userId = result._id.toString();
            
            // Calculate streak (simplified - would need submission order for accurate streak)
            const streak = result.correctAnswers;
            
            leaderboard[userId] = {
                userId,
                name: result.user.name,
                score: result.totalScore,
                time: result.totalTime,
                streak,
                bestStreak: streak
            };
        }

        return leaderboard;
    } catch (error) {
        logger.error('Failed to load leaderboard data', {
            sessionId,
            sessionCode,
            error: error.message
        });
        return {};
    }
};

/**
 * Handle participant reconnection
 * Restores participant state when they rejoin within reconnection window
 * @param {Object} socket - Socket instance
 * @param {String} sessionCode - Session code
 * @param {Object} user - User object
 * @returns {Promise<Object>} Reconnection data
 */
const handleParticipantReconnection = async (socket, sessionCode, user) => {
    const RECONNECTION_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
    
    try {
        const session = await sessionStore.getSession(sessionCode);
        if (!session) {
            return { reconnected: false, reason: 'session_not_found' };
        }

        // Check if user was previously in this session
        const wasParticipant = session.participants && session.participants[user._id];
        
        if (!wasParticipant) {
            return { reconnected: false, reason: 'not_previous_participant' };
        }

        // Check reconnection window (based on last activity)
        const timeSinceActivity = Date.now() - (session.lastActivity || 0);
        if (timeSinceActivity > RECONNECTION_WINDOW_MS) {
            return { reconnected: false, reason: 'reconnection_window_expired' };
        }

        // Restore participant submission history
        const submissionHistory = await Submission.find({
            userId: user._id,
            $or: [
                { sessionId: session.sessionId },
                { roomCode: sessionCode }
            ]
        })
        .select('questionId selectedOption isCorrect score timeTaken')
        .sort({ createdAt: 1 })
        .lean();

        // Get current question and user score
        const currentQuestion = session.questions?.[session.currentQuestionIndex];
        const userStats = session.leaderboard?.[user._id] || {
            userId: user._id,
            name: user.name,
            score: 0,
            time: 0,
            streak: 0,
            bestStreak: 0
        };

        logger.info('Participant reconnected successfully', {
            sessionCode,
            userId: user._id,
            currentQuestionIndex: session.currentQuestionIndex,
            userScore: userStats.score
        });

        return {
            reconnected: true,
            currentQuestion: currentQuestion ? {
                _id: currentQuestion._id,
                text: currentQuestion.text,
                options: currentQuestion.options,
                timeLimit: currentQuestion.timeLimit,
                index: session.currentQuestionIndex,
                total: session.questions.length,
                expiry: session.questionExpiry
            } : null,
            userStats,
            submissionHistory: submissionHistory.map(s => ({
                questionId: s.questionId,
                isCorrect: s.isCorrect,
                score: s.score
            })),
            sessionStatus: session.status,
            isPaused: session.isPaused
        };
    } catch (error) {
        logger.error('Participant reconnection failed', {
            sessionCode,
            userId: user._id,
            error: error.message
        });
        return { reconnected: false, reason: 'error', error: error.message };
    }
};

module.exports = {
    restoreActiveSessions,
    restoreSingleSession,
    loadParticipantData,
    loadLeaderboardData,
    handleParticipantReconnection
};
