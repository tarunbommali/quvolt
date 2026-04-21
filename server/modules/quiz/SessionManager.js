const { WaitingState, LiveState, PausedState, CompletedState, AbortedState } = require('./state/SessionStates');
const eventBus = require('../core/EventBus');
const logger = require('../../utils/logger');

/**
 * Session Lifecycle Manager (Context for State Pattern)
 * Manages transitions and triggers domain events via EventBus.
 * Enforces production-grade guards and sequencing.
 */
class SessionManager {
    /**
     * @param {Object} sessionModel - The persistence model (Mongoose instance)
     */
    constructor(sessionModel) {
        this.model = sessionModel;
        this.state = this._mapStatusToState(sessionModel.status);
        this.roomCode = sessionModel.sessionCode;
    }

    /**
     * Map string status to State object
     */
    _mapStatusToState(status) {
        const normalized = String(status || 'waiting').toLowerCase();
        switch (normalized) {
            case 'waiting':   return new WaitingState();
            case 'live':      return new LiveState();
            case 'paused':    return new PausedState();
            case 'completed': return new CompletedState();
            case 'aborted':   return new AbortedState();
            default:          return new WaitingState();
        }
    }

    /**
     * Transition to a new state
     */
    async transitionTo(newState) {
        // Hard Guard: Prevent any transitions from terminal states (Requirement: Hardening)
        if (this.state.name === 'COMPLETED' || this.state.name === 'ABORTED') {
            logger.warn(`Rejected transition for session ${this.roomCode}: already in terminal state ${this.state.name}`);
            return;
        }

        // Hard Guard: Prevent transitioning to the same state
        if (this.state.name === newState.name) {
            logger.debug(`Session ${this.roomCode} already in state ${newState.name}`);
            return;
        }

        logger.info(`Session ${this.roomCode} transitioning: ${this.state.name} -> ${newState.name}`);
        
        await this.state.exit(this);
        const oldState = this.state;
        this.state = newState;
        
        // Persist to DB
        this.model.status = newState.name.toLowerCase();
        await this.model.save();

        await this.state.enter(this);

        // Notify system (Observer Pattern)
        eventBus.emit('SESSION_STATE_CHANGED', {
            roomCode: this.roomCode,
            from: oldState.name,
            to: newState.name,
            timestamp: Date.now()
        });
    }

    /**
     * Public API to trigger actions
     */
    async performAction(action, data = {}) {
        try {
            return await this.state.handleAction(this, action, data);
        } catch (err) {
            logger.error(`[SessionManager] Action '${action}' failed in state '${this.state.name}'`, { 
                roomCode: this.roomCode, 
                error: err.message 
            });
            throw err;
        }
    }

    // --- Actions delegated to state ---

    async start() {
        return this.performAction('START');
    }

    async pause() {
        return this.performAction('PAUSE');
    }

    async resume() {
        return this.performAction('RESUME');
    }

    async end() {
        return this.performAction('END');
    }

    async abort() {
        return this.performAction('ABORT');
    }
}

module.exports = SessionManager;
