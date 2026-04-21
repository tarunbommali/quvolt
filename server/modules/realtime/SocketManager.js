const eventBus = require('../core/EventBus');
const { addSequenceNumber } = require('../../services/session/session.realtime.service');
const logger = require('../../utils/logger');

/**
 * Socket Manager (Singleton Pattern)
 * Wraps Socket.io to provide a clean OOP interface for emitting events.
 * Bridges the internal EventBus (Observer) to client-facing Socket.IO events.
 * Handles sequencing and server-side timestamping.
 */
class SocketManager {
    constructor() {
        this.io = null;
    }

    /**
     * Initialize with Socket.io instance
     * @param {Object} io - Socket.io Server instance
     */
    initialize(io) {
        this.io = io;
        this._setupEventSubscriptions();
    }

    /**
     * Subscribe to EventBus and bridge to Sockets
     */
    _setupEventSubscriptions() {
        const events = [
            { bus: 'QUESTION_START',    socket: 'new_question' },
            { bus: 'QUESTION_SYNC',     socket: 'question:sync' },
            { bus: 'QUESTION_PROGRESS', socket: 'question:progress' },
            { bus: 'TIMER_START',       socket: 'timer:start' },
            { bus: 'TIMER_TICK',        socket: 'timer:tick' },
            { bus: 'SESSION_START',     socket: 'session:start' },
            { bus: 'QUIZ_PAUSED',       socket: 'quiz_paused' },
            { bus: 'QUIZ_RESUMED',      socket: 'quiz_resumed' },
            { bus: 'QUIZ_ENDED',        socket: 'quiz_finished' },
            { bus: 'QUIZ_ABORTED',      socket: 'quiz_aborted' },
            { bus: 'LEADERBOARD_UPDATE',socket: 'update_leaderboard' },
            { bus: 'STATS_UPDATE',      socket: 'answer_stats' },
            { bus: 'SHOW_ANSWER',       socket: 'show_correct_answer' }
        ];

        events.forEach(({ bus, socket }) => {
            eventBus.on(bus, async ({ roomCode, data }) => {
                await this.broadcast(roomCode, socket, data);
            });
        });
    }

    /**
     * Broadcast with sequencing and serverTime
     */
    async broadcast(roomCode, event, payload) {
        if (!this.io) return;

        try {
            // Enforce sequencing and timestamping (Requirement: Final Hardening)
            const sequencedPayload = await addSequenceNumber(roomCode, payload);
            
            // Inject serverTime for clock drift correction
            sequencedPayload.serverTime = Date.now();

            this.io.to(roomCode).emit(event, sequencedPayload);

            if (process.env.NODE_ENV !== 'production') {
                logger.debug(`[SOCKET] Broadcast: ${event}`, { 
                    roomCode, 
                    seq: sequencedPayload.sequenceNumber 
                });
            }
        } catch (err) {
            logger.error(`[SOCKET] Broadcast failed: ${event}`, { roomCode, error: err.message });
            // Fallback to raw emit
            this.io.to(roomCode).emit(event, payload);
        }
    }

    /**
     * Emit directly to a specific socket
     */
    emitToSocket(socketId, event, data) {
        if (!this.io) return;
        this.io.to(socketId).emit(event, data);
    }
}

module.exports = new SocketManager();
