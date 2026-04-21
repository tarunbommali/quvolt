const eventBus = require('../../core/EventBus');

/**
 * Abstract Session State
 */
class SessionState {
    constructor(name) {
        this.name = name;
    }

    async handleAction(context, action, data) {
        throw new Error(`Action ${action} not implemented for state ${this.name}`);
    }

    async enter(context) {
        // Hooks for state entry
    }

    async exit(context) {
        // Hooks for state exit
    }
}

/**
 * Waiting Room State
 */
class WaitingState extends SessionState {
    constructor() {
        super('WAITING');
    }

    async handleAction(context, action) {
        if (action === 'START') {
            return context.transitionTo(new LiveState());
        }
        if (action === 'ABORT') {
            return context.transitionTo(new AbortedState());
        }
        return super.handleAction(context, action);
    }
}

/**
 * Live / Ongoing State
 */
class LiveState extends SessionState {
    constructor() {
        super('LIVE');
    }

    async enter(context) {
        // Use setImmediate to prevent recursive transition errors during initialization
        setImmediate(async () => {
            try {
                const questionManager = require('../QuestionManager');
                eventBus.emit('SESSION_START', {
                    roomCode: context.roomCode,
                    data: { status: 'live' }
                });
                
                // Start the first question when entering Live state
                await questionManager.broadcastQuestion(context);
            } catch (err) {
                const logger = require('../../../utils/logger');
                logger.error(`[LiveState] Failed to initialize live session ${context.roomCode}`, { error: err.message });
            }
        });
    }

    async handleAction(context, action) {
        if (action === 'PAUSE') {
            return context.transitionTo(new PausedState());
        }
        if (action === 'END') {
            return context.transitionTo(new CompletedState());
        }
        if (action === 'ABORT') {
            return context.transitionTo(new AbortedState());
        }
        return super.handleAction(context, action);
    }
}

/**
 * Paused State
 */
class PausedState extends SessionState {
    constructor() {
        super('PAUSED');
    }

    async enter(context) {
        eventBus.emit('QUIZ_PAUSED', {
            roomCode: context.roomCode,
            data: { isPaused: true, message: 'Quiz paused' }
        });
    }

    async handleAction(context, action) {
        if (action === 'RESUME') {
            return context.transitionTo(new LiveState());
        }
        if (action === 'END') {
            return context.transitionTo(new CompletedState());
        }
        return super.handleAction(context, action);
    }
}

/**
 * Completed State
 */
class CompletedState extends SessionState {
    constructor() {
        super('COMPLETED');
    }

    async enter(context) {
        eventBus.emit('QUIZ_ENDED', {
            roomCode: context.roomCode,
            data: { status: 'completed' }
        });
    }

    async handleAction(context, action) {
        // Hardening: Allow re-launching from completed (optional, matches state machine)
        if (action === 'RESTART') {
            return context.transitionTo(new WaitingState());
        }
        return super.handleAction(context, action);
    }
}

/**
 * Aborted State
 */
class AbortedState extends SessionState {
    constructor() {
        super('ABORTED');
    }

    async enter(context) {
        eventBus.emit('QUIZ_ABORTED', {
            roomCode: context.roomCode,
            data: { status: 'aborted', message: 'Quiz aborted' }
        });
    }

    async handleAction(context, action) {
        if (action === 'RESTART') {
            return context.transitionTo(new WaitingState());
        }
        return super.handleAction(context, action);
    }
}

module.exports = {
    WaitingState,
    LiveState,
    PausedState,
    CompletedState,
    AbortedState
};
