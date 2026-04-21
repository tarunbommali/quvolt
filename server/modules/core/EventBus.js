/**
 * Event Bus (Observer Pattern)
 * Decouples system events from Socket.io implementation
 */
class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    /**
     * Subscribe to an event (alias: on)
     * @param {string} event - Event name
     * @param {Function} handler - Handler function
     */
    subscribe(event, handler) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(handler);
        return () => this.unsubscribe(event, handler);
    }

    on(event, handler) {
        return this.subscribe(event, handler);
    }

    /**
     * Unsubscribe from an event
     */
    unsubscribe(event, handler) {
        if (!this.listeners.has(event)) return;
        const filtered = this.listeners.get(event).filter(h => h !== handler);
        this.listeners.set(event, filtered);
    }

    /**
     * Emit an event to all subscribers
     * @param {string} event - Event name
     * @param {any} data - Event data
     */
    emit(event, data) {
        const handlers = this.listeners.get(event) || [];
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (err) {
                console.error(`[EventBus] Error in handler for ${event}:`, err);
            }
        });
    }
}

// Export as a singleton for global use
module.exports = new EventBus();
