const SessionManager = require('../modules/quiz/SessionManager');
const eventBus = require('../modules/core/EventBus');
const sessionStore = require('../services/session/session.service');
const { LiveState, CompletedState } = require('../modules/quiz/state/SessionStates');
const logger = require('../utils/logger');

// Mock dependencies
jest.mock('../services/session/session.service');
jest.mock('../utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    audit: jest.fn()
}));

describe('Quiz Engine Chaos & Determinism', () => {
    let mockSession;
    let manager;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSession = {
            status: 'waiting',
            sessionCode: 'CHAOS01',
            save: jest.fn().mockResolvedValue(true)
        };
        manager = new SessionManager(mockSession);
    });

    afterEach(async () => {
        // Clear background setImmediate tasks to prevent teardown errors
        await new Promise(resolve => setImmediate(resolve));
    });

    describe('Duplicate Event Suppression (Client Side Logic Simulation)', () => {
        test('redundant START action in LIVE state throws error (Action not implemented)', async () => {
            // First start
            await manager.start();
            // Wait for background tasks in enter()
            await new Promise(resolve => setImmediate(resolve));

            expect(manager.state).toBeInstanceOf(LiveState);
            
            // Second start (Redundant)
            // LiveState does not implement 'START', so it throws via super.handleAction()
            await expect(manager.start()).rejects.toThrow(/Action START not implemented/);
        });
    });

    describe('Terminal State Resilience', () => {
        test('session remains COMPLETED even if out-of-order START arrives (throws error)', async () => {
            manager.state = new CompletedState();
            mockSession.status = 'completed';

            // Now throws because of super.handleAction() hardening
            await expect(manager.start()).rejects.toThrow(/Action START not implemented/);

            expect(mockSession.status).toBe('completed');
            expect(manager.state).toBeInstanceOf(CompletedState);
        });
    });

    describe('Storage Failure Resilience', () => {
        test('system handles DB save failure during transition', async () => {
            mockSession.save.mockRejectedValue(new Error('MongoDB Timeout'));
            
            // Transition propagates the error
            await expect(manager.start()).rejects.toThrow('MongoDB Timeout');
            
            // Verify state updated before save failed
            expect(manager.state).toBeInstanceOf(LiveState); 
        });

        test('recovering session from Redis failure (Propagation)', async () => {
            sessionStore.getSession.mockRejectedValue(new Error('Redis Connection Lost'));
            
            const questionManager = require('../modules/quiz/QuestionManager');
            await expect(questionManager.broadcastQuestion(manager)).rejects.toThrow('Redis Connection Lost');
        });
    });

    describe('Flow Determinism', () => {
        test('cannot transition to COMPLETED without going through LIVE', async () => {
            // manager starts in WAITING
            // Action END not implemented in WaitingState
            await expect(manager.end()).rejects.toThrow(/Action END not implemented/);
            
            expect(mockSession.status).toBe('waiting');
        });

        test('ABORT action is always available from non-terminal states', async () => {
            // From WAITING
            await manager.abort();
            expect(mockSession.status).toBe('aborted');
            
            // Reset
            mockSession.status = 'live';
            manager = new SessionManager(mockSession);
            
            // From LIVE
            await manager.abort();
            expect(mockSession.status).toBe('aborted');
        });
    });
});
