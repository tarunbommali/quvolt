const SessionManager = require('../modules/quiz/SessionManager');
const { WaitingState, LiveState, PausedState, CompletedState, AbortedState } = require('../modules/quiz/state/SessionStates');
const eventBus = require('../modules/core/EventBus');
const questionManager = require('../modules/quiz/QuestionManager');
const logger = require('../utils/logger');

// Mocking dependencies
jest.mock('../modules/core/EventBus');
jest.mock('../modules/quiz/QuestionManager');
jest.mock('../utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    audit: jest.fn()
}));

describe('Session Lifecycle Management (OOP)', () => {
    let mockSession;
    let manager;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock session model
        mockSession = {
            status: 'waiting',
            sessionCode: 'TEST01',
            save: jest.fn().mockResolvedValue(true)
        };
        
        manager = new SessionManager(mockSession);
    });

    describe('Valid Transitions', () => {
        test('WAITING → LIVE', async () => {
            await manager.start();
            
            expect(mockSession.status).toBe('live');
            expect(manager.state).toBeInstanceOf(LiveState);
            expect(mockSession.save).toHaveBeenCalled();
            
            // EventBus should emit SESSION_STATE_CHANGED
            expect(eventBus.emit).toHaveBeenCalledWith('SESSION_STATE_CHANGED', expect.objectContaining({
                to: 'LIVE'
            }));
        });

        test('LIVE → PAUSED → LIVE (RESUME)', async () => {
            // Setup LIVE state manually to skip setImmediate side effects of enter() for this transition test
            manager.state = new LiveState();
            mockSession.status = 'live';

            await manager.pause();
            expect(mockSession.status).toBe('paused');
            expect(manager.state).toBeInstanceOf(PausedState);

            await manager.resume();
            expect(mockSession.status).toBe('live');
            expect(manager.state).toBeInstanceOf(LiveState);
        });

        test('LIVE → COMPLETED', async () => {
            manager.state = new LiveState();
            mockSession.status = 'live';

            await manager.end();
            expect(mockSession.status).toBe('completed');
            expect(manager.state).toBeInstanceOf(CompletedState);
        });
    });

    describe('Invalid Transitions & Terminal Guards', () => {
        test('COMPLETED → START (Rejected - Action not implemented)', async () => {
            manager.state = new CompletedState();
            mockSession.status = 'completed';

            // Now throws because we added super.handleAction fallback
            await expect(manager.start()).rejects.toThrow(/Action START not implemented/);
            
            expect(mockSession.status).toBe('completed');
            expect(manager.state).toBeInstanceOf(CompletedState);
        });

        test('ABORTED → START (Rejected - Action not implemented)', async () => {
            manager.state = new AbortedState();
            mockSession.status = 'aborted';

            await expect(manager.start()).rejects.toThrow(/Action START not implemented/);
            
            expect(mockSession.status).toBe('aborted');
            expect(manager.state).toBeInstanceOf(AbortedState);
        });

        test('PAUSED → START (Rejected - Action not implemented)', async () => {
            manager.state = new PausedState();
            mockSession.status = 'paused';

            // SessionState.handleAction throws when action is not found
            await expect(manager.start()).rejects.toThrow(/Action START not implemented/);
            
            expect(mockSession.status).toBe('paused');
        });
    });

    afterEach(async () => {
        // Give background tasks (setImmediate) time to finish or error out safely
        await new Promise(resolve => setImmediate(resolve));
    });

    describe('State Side Effects (Event Emissions)', () => {
        test('LIVE state triggers SESSION_START and QuestionManager.broadcast', async () => {
            // LiveState.enter uses setImmediate, so we need to wait
            await manager.start();
            
            // Explicitly wait for the setImmediate block in LiveState.enter
            await new Promise(resolve => setImmediate(resolve));

            expect(eventBus.emit).toHaveBeenCalledWith('SESSION_START', expect.objectContaining({
                roomCode: 'TEST01'
            }));
            expect(questionManager.broadcastQuestion).toHaveBeenCalledWith(manager);
        });

        test('PAUSED state triggers QUIZ_PAUSED', async () => {
            manager.state = new LiveState(); // From live
            await manager.pause();
            
            expect(eventBus.emit).toHaveBeenCalledWith('QUIZ_PAUSED', expect.objectContaining({
                roomCode: 'TEST01'
            }));
        });

        test('COMPLETED state triggers QUIZ_ENDED', async () => {
            manager.state = new LiveState();
            await manager.end();
            
            expect(eventBus.emit).toHaveBeenCalledWith('QUIZ_ENDED', expect.objectContaining({
                roomCode: 'TEST01'
            }));
        });

        test('ABORTED state triggers QUIZ_ABORTED', async () => {
            await manager.abort();
            
            expect(eventBus.emit).toHaveBeenCalledWith('QUIZ_ABORTED', expect.objectContaining({
                roomCode: 'TEST01'
            }));
        });
    });
});
