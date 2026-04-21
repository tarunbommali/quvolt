/**
 * socketEventBus.js
 * 
 * Lightweight event bus to decouple the Socket.IO infrastructure 
 * from the domain logic (Quiz, UI, Analytics, etc).
 */

class SocketEventBus {
    constructor() {
        this.listeners = new Map();
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name (use SOCKET_EVENTS constants)
     * @param {Function} callback - Function to execute when event is emitted
     * @returns {Function} - Unsubscribe function
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);

        // Return unsubscribe function for convenience in useEffect
        return () => this.off(event, callback);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event 
     * @param {Function} callback 
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    /**
     * Emit an event to all subscribers
     * @param {string} event 
     * @param {any} payload 
     */
    emit(event, payload) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(payload);
                } catch (error) {
                    console.error(`[SocketEventBus] Error in listener for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Clear all listeners for an event (or all events if none specified)
     */
    clear(event = null) {
        if (event) {
            this.listeners.delete(event);
        } else {
            this.listeners.clear();
        }
    }
}

export const socketEventBus = new SocketEventBus();
