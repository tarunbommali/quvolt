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
 * @param {string} roomCode
 * @param {number} timeLeftSeconds
 * @param {number} expiryMs
 */
const emitTimerUpdate = (io, roomCode, timeLeftSeconds, expiryMs) => {
    io.to(roomCode).emit('timer:update', {
        timeLeft: timeLeftSeconds,
        expiry: expiryMs,
        serverTime: Date.now(),
    });
};

/**
 * Register socket-level timer event listeners.
 * Currently only logs host "timer:request" (a client asking for a fresh
 * authoritative timer snapshot).
 *
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 * @param {Function} getSessionStore - lazy getter to avoid circular deps
 */
const registerTimerHandler = (io, socket, getSessionStore) => {
    socket.on('timer:request', async ({ sessionCode } = {}) => {
        try {
            const roomCode = sessionCode || socket.data.roomCode;
            if (!roomCode) return;

            const sessionStore = getSessionStore();
            const session = await sessionStore.getSession(roomCode);
            if (!session?.questionExpiry) return;

            const timeLeftSeconds = Math.max(
                0,
                Math.floor((session.questionExpiry - Date.now()) / 1000)
            );

            emitTimerUpdate(io, roomCode, timeLeftSeconds, session.questionExpiry);

            logger.debug('timer:request serviced', { roomCode, timeLeftSeconds });
        } catch (err) {
            logger.error('timer.handler timer:request error', { error: err.message });
        }
    });
};

module.exports = {
    registerTimerHandler,
    emitTimerStart,
    emitTimerEnd,
    emitTimerUpdate,
};
