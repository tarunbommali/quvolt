const logger = require('../../utils/logger');
const { addSequenceNumber } = require('../session/session.realtime.service');

let ioInstance = null;

/**
 * Inject io instance once (from quiz.socket.js)
 */
const initTimerPublisher = (io) => {
    ioInstance = io;
};

/**
 * Internal safe emit (centralized) with sequencing support
 */
const publish = async (event, roomCode, payload) => {
    if (!ioInstance) {
        logger.warn('[TIMER] IO not initialized', { event, roomCode });
        return;
    }

    try {
        // Elite SaaS: Every timer event is now sequenced to prevent drift
        const sequencedPayload = await addSequenceNumber(roomCode, {
            ...payload,
            serverTime: Date.now()
        });
        
        ioInstance.to(roomCode).emit(event, sequencedPayload);
        
        logger.debug(`[TIMER] Published ${event}`, { 
            roomCode, 
            seq: sequencedPayload.sequenceNumber,
            traceId: sequencedPayload.traceId 
        });
    } catch (err) {
        logger.error('[TIMER] Publish failed', { event, roomCode, error: err.message });
        // Fallback for critical timer events
        ioInstance.to(roomCode).emit(event, { ...payload, serverTime: Date.now() });
    }
};

/**
 * Public APIs (isolated infra layer)
 */
const publishTimerStart = (roomCode, duration, expiry) => {
    publish('timer:start', roomCode, {
        duration,
        expiry
    });
};

const publishTimerUpdate = (roomCode, timeLeft, expiry) => {
    publish('timer:update', roomCode, {
        timeLeft,
        expiry
    });
};

const publishTimerTick = (roomCode, timeLeft, expiry) => {
    publish('timer:tick', roomCode, {
        timeLeft,
        expiry
    });
};

const publishTimerEnd = (roomCode) => {
    publish('timer:end', roomCode, {});
};

module.exports = {
    initTimerPublisher,
    publishTimerStart,
    publishTimerUpdate,
    publishTimerTick,
    publishTimerEnd,
};
