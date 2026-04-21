const logger = require('../../utils/logger');
const { addSequenceNumber } = require('../session/session.realtime.service');

let ioInstance = null;

/**
 * Inject io instance
 */
const initGameplayPublisher = (io) => {
    ioInstance = io;
};

/**
 * Internal safe emit
 */
const publish = async (event, roomCode, payload, socket = null) => {
    const target = socket || (ioInstance ? ioInstance.to(roomCode) : null);
    if (!target) return;

    try {
        const sequencedPayload = await addSequenceNumber(roomCode, payload);
        target.emit(event, sequencedPayload);
        
        logger.debug(`[GAMEPLAY] Published ${event}`, { 
            roomCode, 
            seq: sequencedPayload.sequenceNumber 
        });
    } catch (err) {
        logger.error('[GAMEPLAY] Publish failed', { event, roomCode, error: err.message });
        target.emit(event, payload);
    }
};

// ── Throttled Leaderboard Updates ───────────────────────────────────────────
const leaderboardThrottles = new Map();

const publishLeaderboardUpdate = (roomCode, leaderboard) => {
    if (leaderboardThrottles.has(roomCode)) return;

    // Throttle to max 1 update per 500ms to prevent socket flooding
    publish('leaderboard:update', roomCode, leaderboard);
    publish('update_leaderboard', roomCode, leaderboard);

    const timer = setTimeout(() => {
        leaderboardThrottles.delete(roomCode);
    }, 500);

    leaderboardThrottles.set(roomCode, timer);
};

// ── Public APIs ─────────────────────────────────────────────────────────────

const publishNewQuestion = (roomCode, question) => {
    publish('new_question', roomCode, question);
};

const publishAnswerStats = (roomCode, stats) => {
    publish('answer_stats', roomCode, stats);
};

const publishFastestUser = (roomCode, user) => {
    publish('fastest_user', roomCode, user);
};

const publishStreakUpdate = (roomCode, data) => {
    publish('streak_update', roomCode, data);
};

const publishAnswerResult = (socket, result) => {
    socket.emit('answer:result', result);
};

const publishQuizFinished = (roomCode, data) => {
    publish('quiz_finished', roomCode, data);
    publish('quiz_completed', roomCode, data);
};

const publishRevealAnswer = (roomCode, data) => {
    publish('question:reveal', roomCode, data);
};

const publishQuestionSync = (roomCode, question) => {
    publish('question:sync', roomCode, question);
};

module.exports = {
    initGameplayPublisher,
    publishNewQuestion,
    publishQuestionSync,
    publishLeaderboardUpdate,
    publishAnswerStats,
    publishFastestUser,
    publishStreakUpdate,
    publishAnswerResult,
    publishQuizFinished,
    publishRevealAnswer,
};
