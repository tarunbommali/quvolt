/**
 * Unit tests for sessionStateMachine.js
 * Requirements: 1.1, 1.2, 1.3
 */

const {
    SESSION_STATUS,
    canTransition,
    assertTransition,
    normalizeSessionStatus,
    assertWaitingSessionExists,
} = require('../utils/sessionStateMachine');

describe('Session State Machine', () => {
    describe('SESSION_STATUS constants', () => {
        it('should define all required states', () => {
            expect(SESSION_STATUS.DRAFT).toBe('draft');
            expect(SESSION_STATUS.SCHEDULED).toBe('scheduled');
            expect(SESSION_STATUS.WAITING).toBe('waiting');
            expect(SESSION_STATUS.LIVE).toBe('live');
            expect(SESSION_STATUS.COMPLETED).toBe('completed');
            expect(SESSION_STATUS.ABORTED).toBe('aborted');
        });

        it('should be frozen (immutable)', () => {
            expect(Object.isFrozen(SESSION_STATUS)).toBe(true);
        });
    });

    describe('normalizeSessionStatus', () => {
        it('should map legacy "upcoming" to DRAFT', () => {
            expect(normalizeSessionStatus('upcoming')).toBe(SESSION_STATUS.DRAFT);
        });

        it('should map legacy "ongoing" to WAITING', () => {
            expect(normalizeSessionStatus('ongoing')).toBe(SESSION_STATUS.WAITING);
        });

        it('should pass through current status values unchanged', () => {
            expect(normalizeSessionStatus(SESSION_STATUS.LIVE)).toBe(SESSION_STATUS.LIVE);
            expect(normalizeSessionStatus(SESSION_STATUS.COMPLETED)).toBe(SESSION_STATUS.COMPLETED);
        });

        it('should return falsy input as-is', () => {
            expect(normalizeSessionStatus(null)).toBeNull();
            expect(normalizeSessionStatus(undefined)).toBeUndefined();
        });
    });

    // Requirement 1.1: State machine enforces valid transitions (draft → scheduled → waiting → live → completed)
    describe('Valid transitions (Req 1.1)', () => {
        const validTransitions = [
            [SESSION_STATUS.DRAFT, SESSION_STATUS.SCHEDULED],
            [SESSION_STATUS.SCHEDULED, SESSION_STATUS.WAITING],
            [SESSION_STATUS.WAITING, SESSION_STATUS.LIVE],
            [SESSION_STATUS.LIVE, SESSION_STATUS.COMPLETED],
        ];

        test.each(validTransitions)(
            'allows %s → %s',
            (from, to) => {
                expect(canTransition(from, to)).toBe(true);
                expect(() => assertTransition(from, to)).not.toThrow();
            }
        );

        it('allows draft → waiting (direct to lobby)', () => {
            expect(canTransition(SESSION_STATUS.DRAFT, SESSION_STATUS.WAITING)).toBe(true);
        });

        it('returns true when transitioning to the same state (no-op)', () => {
            expect(canTransition(SESSION_STATUS.LIVE, SESSION_STATUS.LIVE)).toBe(true);
        });
    });

    // Requirement 1.2: Invalid transitions are rejected with error code
    describe('Invalid transition rejection (Req 1.2)', () => {
        const invalidTransitions = [
            [SESSION_STATUS.DRAFT, SESSION_STATUS.LIVE],
            [SESSION_STATUS.DRAFT, SESSION_STATUS.COMPLETED],
            [SESSION_STATUS.SCHEDULED, SESSION_STATUS.LIVE],
            [SESSION_STATUS.SCHEDULED, SESSION_STATUS.COMPLETED],
            [SESSION_STATUS.SCHEDULED, SESSION_STATUS.DRAFT],
            [SESSION_STATUS.WAITING, SESSION_STATUS.DRAFT],
            [SESSION_STATUS.WAITING, SESSION_STATUS.SCHEDULED],
            [SESSION_STATUS.WAITING, SESSION_STATUS.COMPLETED],
            [SESSION_STATUS.LIVE, SESSION_STATUS.DRAFT],
            [SESSION_STATUS.LIVE, SESSION_STATUS.SCHEDULED],
            [SESSION_STATUS.LIVE, SESSION_STATUS.WAITING],
            [SESSION_STATUS.COMPLETED, SESSION_STATUS.DRAFT],
            [SESSION_STATUS.COMPLETED, SESSION_STATUS.SCHEDULED],
            [SESSION_STATUS.COMPLETED, SESSION_STATUS.WAITING],
            [SESSION_STATUS.COMPLETED, SESSION_STATUS.LIVE],
            [SESSION_STATUS.ABORTED, SESSION_STATUS.LIVE],
            [SESSION_STATUS.ABORTED, SESSION_STATUS.COMPLETED],
        ];

        test.each(invalidTransitions)(
            'rejects %s → %s',
            (from, to) => {
                expect(canTransition(from, to)).toBe(false);
            }
        );

        it('throws an error with code INVALID_SESSION_TRANSITION', () => {
            expect(() => assertTransition(SESSION_STATUS.DRAFT, SESSION_STATUS.LIVE)).toThrow();

            try {
                assertTransition(SESSION_STATUS.DRAFT, SESSION_STATUS.LIVE);
            } catch (err) {
                expect(err.code).toBe('INVALID_SESSION_TRANSITION');
            }
        });

        it('error message includes the from and to states', () => {
            try {
                assertTransition(SESSION_STATUS.COMPLETED, SESSION_STATUS.WAITING);
            } catch (err) {
                expect(err.message).toMatch(SESSION_STATUS.COMPLETED);
                expect(err.message).toMatch(SESSION_STATUS.WAITING);
            }
        });

        it('error message includes the context label', () => {
            try {
                assertTransition(SESSION_STATUS.DRAFT, SESSION_STATUS.LIVE, 'quiz');
            } catch (err) {
                expect(err.message).toMatch('quiz');
            }
        });

        it('canTransition returns false for completed → any state', () => {
            Object.values(SESSION_STATUS).forEach((toState) => {
                if (toState !== SESSION_STATUS.COMPLETED) {
                    expect(canTransition(SESSION_STATUS.COMPLETED, toState)).toBe(false);
                }
            });
        });
    });

    // Requirement 1.3: Abort allowed from any state except completed
    describe('Abort transitions (Req 1.3)', () => {
        const abortableStates = [
            SESSION_STATUS.DRAFT,
            SESSION_STATUS.SCHEDULED,
            SESSION_STATUS.WAITING,
            SESSION_STATUS.LIVE,
        ];

        test.each(abortableStates)(
            'allows abort from %s',
            (fromState) => {
                expect(canTransition(fromState, SESSION_STATUS.ABORTED)).toBe(true);
                expect(() => assertTransition(fromState, SESSION_STATUS.ABORTED)).not.toThrow();
            }
        );

        it('rejects abort from completed', () => {
            expect(canTransition(SESSION_STATUS.COMPLETED, SESSION_STATUS.ABORTED)).toBe(false);
            expect(() => assertTransition(SESSION_STATUS.COMPLETED, SESSION_STATUS.ABORTED)).toThrow();
        });

        it('abort from completed throws INVALID_SESSION_TRANSITION', () => {
            try {
                assertTransition(SESSION_STATUS.COMPLETED, SESSION_STATUS.ABORTED);
            } catch (err) {
                expect(err.code).toBe('INVALID_SESSION_TRANSITION');
            }
        });
    });

    describe('assertWaitingSessionExists', () => {
        it('does not throw when session exists', () => {
            expect(() => assertWaitingSessionExists({ status: SESSION_STATUS.WAITING })).not.toThrow();
        });

        it('throws WAITING_SESSION_REQUIRED when session is null', () => {
            try {
                assertWaitingSessionExists(null);
            } catch (err) {
                expect(err.code).toBe('WAITING_SESSION_REQUIRED');
            }
        });

        it('throws WAITING_SESSION_REQUIRED when session is undefined', () => {
            try {
                assertWaitingSessionExists(undefined);
            } catch (err) {
                expect(err.code).toBe('WAITING_SESSION_REQUIRED');
            }
        });
    });
});
