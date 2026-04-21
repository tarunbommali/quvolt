const sessionStore = require('./session.service');
const logger = require('../../utils/logger');
const { prepareMessage } = require('../../utils/messageCompression');
const crypto = require('crypto');

/**
 * Increment and return the next sequence number for a session.
 * Uses Redis INCR for global ordering across all server instances.
 */
const getNextSequenceNumber = async (roomCode) => {
    return await sessionStore.incrementSequence(roomCode);
};

/**
 * Add sequence number and metadata to a broadcast payload.
 * This allows clients to detect missed messages and request reconciliation.
 */
const addSequenceNumber = async (roomCode, payload, socket = null) => {
    const sequenceNumber = await getNextSequenceNumber(roomCode);
    
    // Attempt to resolve session ID if not provided
    let sessionId = payload.sessionId;
    if (!sessionId) {
        const session = await sessionStore.getSession(roomCode);
        sessionId = session?.sessionId;
    }

    const meta = {
        sequenceNumber,
        sessionId,
        traceId: socket?.data?.requestId || crypto.randomUUID(),
        timestamp: Date.now(),
    };

    if (Array.isArray(payload)) {
        // If the payload is an array, we must wrap it in an object for JSON serialization 
        // to include metadata. We use property names expected by the frontend.
        return {
            items: payload,
            participants: payload,
            leaderboard: payload,
            ...meta
        };
    }

    return {
        ...payload,
        ...meta,
    };
};

/**
 * Emit a message with optional compression and observability metadata.
 * Messages larger than 1KB are automatically compressed.
 */
const emitWithCompression = async (io, roomCode, eventName, payload) => {
    const traceId = payload.traceId || crypto.randomUUID();
    
    try {
        const prepared = await prepareMessage(eventName, payload);
        
        if (prepared.compressed) {
            // Send compressed message with metadata
            io.to(roomCode).emit('compressed_message', {
                event: prepared.event,
                data: prepared.data,
                metadata: {
                    ...prepared.metadata,
                    traceId,
                    roomCode
                },
            });
            
            logger.debug('Sent compressed message', {
                roomCode,
                event: eventName,
                traceId,
                originalSize: prepared.metadata.originalSize,
                compressedSize: prepared.metadata.compressedSize,
            });
        } else {
            // Send uncompressed message normally
            io.to(roomCode).emit(eventName, {
                ...prepared.data,
                traceId
            });
        }
    } catch (error) {
        logger.error('Failed to emit message with compression', {
            roomCode,
            event: eventName,
            traceId,
            error: error.message,
        });
        // Fallback to normal emit
        io.to(roomCode).emit(eventName, {
            ...payload,
            traceId
        });
    }
};

module.exports = {
    getNextSequenceNumber,
    addSequenceNumber,
    emitWithCompression,
};
