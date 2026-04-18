const logger = require('./logger');

/**
 * Message batching utility for combining rapid state changes into single updates.
 * Uses debouncing to batch multiple rapid updates within a time window.
 */
class MessageBatcher {
    constructor() {
        // Map of roomCode -> { timer, messages }
        this.batches = new Map();
        this.batchWindow = 100; // 100ms batching window
    }

    /**
     * Add a message to the batch for a specific room.
     * If no more messages arrive within the batch window, the batch is flushed.
     */
    batch(roomCode, eventName, payload, flushCallback) {
        if (!this.batches.has(roomCode)) {
            this.batches.set(roomCode, {
                timer: null,
                messages: [],
            });
        }

        const batch = this.batches.get(roomCode);

        // Clear existing timer
        if (batch.timer) {
            clearTimeout(batch.timer);
        }

        // Add message to batch
        batch.messages.push({
            event: eventName,
            payload,
            timestamp: Date.now(),
        });

        // Set new timer to flush batch
        batch.timer = setTimeout(() => {
            this.flush(roomCode, flushCallback);
        }, this.batchWindow);
    }

    /**
     * Flush all pending messages for a room.
     */
    flush(roomCode, flushCallback) {
        const batch = this.batches.get(roomCode);
        if (!batch || batch.messages.length === 0) {
            return;
        }

        const messages = [...batch.messages];
        batch.messages = [];
        batch.timer = null;

        logger.debug('Flushing message batch', {
            roomCode,
            messageCount: messages.length,
        });

        // Group messages by event type
        const grouped = messages.reduce((acc, msg) => {
            if (!acc[msg.event]) {
                acc[msg.event] = [];
            }
            acc[msg.event].push(msg.payload);
            return acc;
        }, {});

        // Call flush callback with grouped messages
        if (flushCallback) {
            flushCallback(roomCode, grouped);
        }
    }

    /**
     * Clear all batches for a room (e.g., when session ends).
     */
    clear(roomCode) {
        const batch = this.batches.get(roomCode);
        if (batch && batch.timer) {
            clearTimeout(batch.timer);
        }
        this.batches.delete(roomCode);
    }

    /**
     * Clear all batches.
     */
    clearAll() {
        for (const [roomCode, batch] of this.batches.entries()) {
            if (batch.timer) {
                clearTimeout(batch.timer);
            }
        }
        this.batches.clear();
    }
}

// Singleton instance
const messageBatcher = new MessageBatcher();

module.exports = messageBatcher;
