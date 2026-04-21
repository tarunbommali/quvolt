const logger = require('../../utils/logger');
const { addSequenceNumber } = require('./session.realtime.service');

let ioInstance = null;

/**
 * Inject io instance once (from quiz.socket.js)
 */
const initSessionPublisher = (io) => {
    ioInstance = io;
};

/**
 * Internal safe emit (centralized)
 */
const publish = async (event, roomCode, payload, socket = null) => {
    const target = socket || (ioInstance ? ioInstance.to(roomCode) : null);
    
    if (!target) {
        logger.warn('[SESSION] No target for emit', { event, roomCode });
        return;
    }

    try {
        // Elite SaaS: Every session event is sequenced
        const sequencedPayload = await addSequenceNumber(roomCode, payload);
        target.emit(event, sequencedPayload);
        
        logger.debug(`[SESSION] Published ${event}`, { 
            roomCode, 
            seq: sequencedPayload.sequenceNumber,
            traceId: sequencedPayload.traceId 
        });
    } catch (err) {
        logger.error('[SESSION] Publish failed', { event, roomCode, error: err.message });
        target.emit(event, payload); // Fallback
    }
};

/**
 * Public APIs (isolated infra layer)
 */

const publishJoinSuccess = (socket, roomCode, data) => {
    publish('join_success', roomCode, data, socket);
};

const publishSessionState = (socket, roomCode, state) => {
    publish('session:state', roomCode, state, socket);
};

// ── Throttled Participant Updates ──────────────────────────────────────────
const participantThrottles = new Map();

const publishParticipantUpdate = (roomCode, participants) => {
    if (participantThrottles.has(roomCode)) return;

    const payload = {
        participants,
        count: participants.length,
    };
    
    publish('participants:update', roomCode, payload);
    publish('session:updateParticipants', roomCode, payload);

    // Throttle to max 1 update per 200ms during join storms
    const timer = setTimeout(() => {
        participantThrottles.delete(roomCode);
    }, 200);

    participantThrottles.set(roomCode, timer);
};

const publishSessionStart = (roomCode, data) => {
    publish('session:start', roomCode, data);
    publish('start_quiz', roomCode, data); // Legacy compat
};

const publishSessionRedirect = (waitingRoomCode, data) => {
    publish('session_redirect', waitingRoomCode, data);
};

const publishSessionModeChange = (roomCode, mode) => {
    publish('session:modeChanged', roomCode, { mode });
};

const publishQuizPaused = (roomCode, data) => {
    publish('quiz_paused', roomCode, data);
};

const publishRejoinSuccess = (socket, roomCode, data) => {
    publish('rejoin_success', roomCode, data, socket);
};

module.exports = {
    initSessionPublisher,
    publishJoinSuccess,
    publishSessionState,
    publishParticipantUpdate,
    publishSessionStart,
    publishSessionRedirect,
    publishSessionModeChange,
    publishQuizPaused,
    publishRejoinSuccess,
};
