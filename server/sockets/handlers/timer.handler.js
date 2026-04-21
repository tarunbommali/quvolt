/**
 * timer.handler.js
 *
 * Emits authoritative timer events (`timer:start`, `timer:update`, `timer:end`)
 * to all clients in a room.  This module does NOT own the timer logic —
 * the distributed timer worker in quiz.service drives question advancement.
 * This handler's sole responsibility is broadcasting time-related signals so
 * participants only display the timer, never control it.
 *
 * Called by quiz.service.broadcastQuestionEnhanced via the io instance
 * (not via socket events), so it is invoked as a utility rather than a handler.
 */

const logger = require('../../utils/logger');

/**
 * Emit `timer:start` to all clients in a room.
 *
 * @param {import('socket.io').Server} io
 * @param {string} roomCode
 * @param {number} durationSeconds  - Total question time limit
 * @param {number} expiryMs         - Unix ms when the timer ends
 */
const emitTimerStart = (io, roomCode, durationSeconds, expiryMs) => {
    io.to(roomCode).emit('timer:start', {
        duration: durationSeconds,
        expiry: expiryMs,
        serverTime: Date.now(),
    });
};

/**
 * Emit `timer:end` to all clients in a room.
 *
 * @param {import('socket.io').Server} io
 * @param {string} roomCode
 */
const emitTimerEnd = (io, roomCode) => {
    io.to(roomCode).emit('timer:end', {
        roomCode,
        serverTime: Date.now(),
    });
};

/**
 * Optionally push a `timer:update` heartbeat.
 * Called by the distributed worker loop if the feature is enabled.
 *
 * @param {import('socket.io').Server} io
const sessionStore = require('../../services/session/session.service');
const { publishTimerUpdate } = require('../../services/timer/timer.publisher');

/**
 * timer.handler.js
 * 
 * Thin adapter layer for timer requests. 
 * Delegates logic to publisher to maintain isolation.
 */
const registerTimerHandler = (io, socket) => {
    // ── timer:request ──────────────────────────────────────────────────────────
    // Participant can request a sync for the current timer.
    socket.on('timer:request', async ({ sessionCode } = {}) => {
        try {
            const roomCode = sessionCode || socket.data.roomCode;
            if (!roomCode) return;

            const session = await sessionStore.getSession(roomCode);
            if (!session?.questionExpiry) return;

            const timeLeft = Math.max(
                0,
                Math.floor((session.questionExpiry - Date.now()) / 1000)
            );

            // 🔥 use publisher instead of direct emit
            await publishTimerUpdate(roomCode, timeLeft, session.questionExpiry);

            logger.debug('[TIMER] request serviced', { roomCode, timeLeft, userId: socket.data.user?._id });
        } catch (err) {
            logger.error('[TIMER] request error', { error: err.message, roomCode: sessionCode });
        }
    });
};

module.exports = {
    registerTimerHandler,
};
