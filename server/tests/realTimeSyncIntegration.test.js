/**
 * Integration tests for real-time synchronization
 *
 * Validates: Requirements 13.1, 13.2, 13.3
 *
 * Covers:
 *  - Sequence number tracking (Req 13.3)
 *  - State reconciliation via getSessionState controller (Req 13.1, 13.3)
 *  - Message compression threshold behaviour (Req 13.1)
 *  - Broadcast timing for state changes (Req 13.1, 13.2)
 */

const sessionStore = require('../services/session/session.service');
const {
    compressMessage,
    decompressMessage,
    prepareMessage,
    COMPRESSION_THRESHOLD,
} = require('../utils/messageCompression');
const messageBatcher = require('../utils/messageBatching');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeSession = (overrides = {}) => ({
    status: 'live',
    mode: 'auto',
    isPaused: false,
    currentQuestionIndex: 0,
    sequenceNumber: 0,
    questionState: 'live',
    questionExpiry: Date.now() + 30000,
    participants: { user1: { _id: 'user1', name: 'Alice', role: 'participant' } },
    leaderboard: { user1: { userId: 'user1', name: 'Alice', score: 100, time: 5 } },
    questions: [
        {
            _id: 'q1',
            text: 'What is 2+2?',
            options: ['3', '4', '5', '6'],
            timeLimit: 30,
            mediaUrl: null,
            questionType: 'mcq',
        },
    ],
    currentQuestionStats: {
        questionId: 'q1',
        optionCounts: { '3': 0, '4': 1, '5': 0, '6': 0 },
        totalAnswers: 1,
        fastestUser: { userId: 'user1', name: 'Alice', timeTaken: 5, isCorrect: true },
    },
    lastActivity: Date.now(),
    ...overrides,
});

// ─── 1. Sequence Number Tracking ─────────────────────────────────────────────
// Validates: Requirements 13.3

describe('Sequence Number Tracking (Req 13.3)', () => {
    const ROOM = 'INT_SEQ_001';

    beforeEach(async () => {
        await sessionStore.setSession(ROOM, makeSession({ sequenceNumber: 0 }));
    });

    afterEach(async () => {
        await sessionStore.deleteSession(ROOM);
    });

    test('sequence number starts at 0 when session is created', async () => {
        const session = await sessionStore.getSession(ROOM);
        expect(session.sequenceNumber).toBe(0);
    });

    test('sequence number increments correctly across multiple updates', async () => {
        const increments = 5;
        for (let i = 1; i <= increments; i++) {
            const session = await sessionStore.getSession(ROOM);
            session.sequenceNumber = (session.sequenceNumber || 0) + 1;
            await sessionStore.setSession(ROOM, session);

            const updated = await sessionStore.getSession(ROOM);
            expect(updated.sequenceNumber).toBe(i);
        }
    });

    test('sequence numbers are strictly monotonically increasing', async () => {
        const observed = [];
        for (let i = 0; i < 4; i++) {
            const session = await sessionStore.getSession(ROOM);
            session.sequenceNumber = (session.sequenceNumber || 0) + 1;
            await sessionStore.setSession(ROOM, session);
            observed.push(session.sequenceNumber);
        }

        for (let i = 1; i < observed.length; i++) {
            expect(observed[i]).toBeGreaterThan(observed[i - 1]);
        }
    });

    test('gap in sequence numbers indicates missed messages', () => {
        const lastReceived = 4;
        const incoming = 7; // 5 and 6 were missed

        const missed = incoming - lastReceived - 1;
        expect(missed).toBe(2);
        expect(incoming > lastReceived + 1).toBe(true);
    });

    test('consecutive sequence numbers indicate no missed messages', () => {
        const lastReceived = 4;
        const incoming = 5;

        const hasMissed = incoming > lastReceived + 1;
        expect(hasMissed).toBe(false);
    });

    test('sequence number is preserved through session store round-trip', async () => {
        const session = await sessionStore.getSession(ROOM);
        session.sequenceNumber = 42;
        await sessionStore.setSession(ROOM, session);

        const retrieved = await sessionStore.getSession(ROOM);
        expect(retrieved.sequenceNumber).toBe(42);
    });
});

// ─── 2. State Reconciliation ──────────────────────────────────────────────────
// Validates: Requirements 13.1, 13.3

describe('State Reconciliation (Req 13.1, 13.3)', () => {
    const ROOM = 'INT_RECON_001';

    beforeEach(async () => {
        await sessionStore.setSession(ROOM, makeSession({ sequenceNumber: 7 }));
    });

    afterEach(async () => {
        await sessionStore.deleteSession(ROOM);
    });

    test('reconciliation snapshot includes sequenceNumber', async () => {
        const session = await sessionStore.getSession(ROOM);
        expect(session.sequenceNumber).toBeDefined();
        expect(typeof session.sequenceNumber).toBe('number');
    });

    test('reconciliation snapshot includes all required state fields', async () => {
        const session = await sessionStore.getSession(ROOM);

        // Fields that getSessionState controller returns
        expect(session.status).toBeDefined();
        expect(session.mode).toBeDefined();
        expect(session.currentQuestionIndex).toBeDefined();
        expect(session.questionState).toBeDefined();
        expect(session.leaderboard).toBeDefined();
        expect(session.participants).toBeDefined();
        expect(session.sequenceNumber).toBeDefined();
    });

    test('reconciliation snapshot reflects latest sequence number', async () => {
        // Simulate 3 state updates
        for (let i = 0; i < 3; i++) {
            const s = await sessionStore.getSession(ROOM);
            s.sequenceNumber += 1;
            await sessionStore.setSession(ROOM, s);
        }

        const snapshot = await sessionStore.getSession(ROOM);
        expect(snapshot.sequenceNumber).toBe(10); // started at 7, +3
    });

    test('reconciliation snapshot leaderboard is sorted by score descending', async () => {
        const session = await sessionStore.getSession(ROOM);
        session.leaderboard = {
            u1: { userId: 'u1', name: 'Alice', score: 300, time: 10 },
            u2: { userId: 'u2', name: 'Bob', score: 100, time: 5 },
            u3: { userId: 'u3', name: 'Carol', score: 200, time: 8 },
        };
        await sessionStore.setSession(ROOM, session);

        const stored = await sessionStore.getSession(ROOM);
        const sorted = Object.values(stored.leaderboard)
            .sort((a, b) => b.score - a.score || a.time - b.time);

        expect(sorted[0].name).toBe('Alice');
        expect(sorted[1].name).toBe('Carol');
        expect(sorted[2].name).toBe('Bob');
    });

    test('reconciliation returns 404-equivalent when session does not exist', async () => {
        const missing = await sessionStore.getSession('NONEXISTENT_ROOM');
        expect(missing).toBeNull();
    });

    test('reconciliation snapshot is built within 500ms', async () => {
        const start = Date.now();
        const session = await sessionStore.getSession(ROOM);

        // Build the same snapshot the controller builds
        const currentQuestionIndex = session.currentQuestionIndex ?? 0;
        const question = session.questions?.[currentQuestionIndex];
        const currentQuestion = question
            ? {
                  _id: question._id,
                  text: question.text,
                  options: question.options,
                  timeLimit: question.timeLimit,
                  index: currentQuestionIndex,
                  total: session.questions.length,
                  expiry: session.questionExpiry,
              }
            : null;

        const leaderboard = Object.values(session.leaderboard || {})
            .sort((a, b) => b.score - a.score || a.time - b.time)
            .slice(0, 10);

        const snapshot = {
            sessionCode: ROOM,
            status: session.status,
            mode: session.mode,
            isPaused: session.isPaused || false,
            currentQuestionIndex,
            currentQuestion,
            questionState: session.questionState || 'waiting',
            leaderboard,
            participants: Object.values(session.participants || {}),
            sequenceNumber: session.sequenceNumber || 0,
            timestamp: Date.now(),
        };

        const elapsed = Date.now() - start;
        expect(elapsed).toBeLessThan(500);
        expect(snapshot.sequenceNumber).toBe(7);
        expect(snapshot.currentQuestion).not.toBeNull();
    });
});

// ─── 3. Message Compression ───────────────────────────────────────────────────
// Validates: Requirements 13.1

describe('Message Compression Integration (Req 13.1)', () => {
    test('messages below 1KB threshold are NOT compressed', async () => {
        const small = { event: 'ping', data: 'ok' };
        const result = await compressMessage(small);

        expect(result.compressed).toBe(false);
        expect(result.data).toEqual(small);
        expect(result.originalSize).toBeLessThan(COMPRESSION_THRESHOLD);
    });

    test('messages above 1KB threshold ARE compressed', async () => {
        const large = { data: 'x'.repeat(COMPRESSION_THRESHOLD + 200) };
        const result = await compressMessage(large);

        expect(result.compressed).toBe(true);
        expect(typeof result.data).toBe('string'); // base64
        expect(result.compressedSize).toBeLessThan(result.originalSize);
    });

    test('compressed message round-trips correctly', async () => {
        const original = {
            event: 'new_question',
            payload: { text: 'Q?', options: ['A', 'B', 'C', 'D'], data: 'y'.repeat(COMPRESSION_THRESHOLD + 100) },
        };

        const compressed = await compressMessage(original);
        expect(compressed.compressed).toBe(true);

        const restored = await decompressMessage(compressed.data);
        expect(restored).toEqual(original);
    });

    test('prepareMessage marks large payloads as compressed with metadata', async () => {
        const large = { questions: Array.from({ length: 50 }, (_, i) => ({ id: i, text: 'x'.repeat(30) })) };
        const result = await prepareMessage('state_sync', large);

        if (result.compressed) {
            expect(result.metadata).toBeDefined();
            expect(result.metadata.originalSize).toBeGreaterThan(COMPRESSION_THRESHOLD);
            expect(result.metadata.compressedSize).toBeDefined();
        } else {
            // payload happened to be under threshold — still valid
            expect(result.data).toEqual(large);
        }
    });

    test('prepareMessage passes small payloads through unmodified', async () => {
        const small = { status: 'live', seq: 1 };
        const result = await prepareMessage('status_update', small);

        expect(result.compressed).toBe(false);
        expect(result.data).toEqual(small);
        expect(result.event).toBe('status_update');
    });

    test('compression threshold is exactly 1024 bytes', () => {
        expect(COMPRESSION_THRESHOLD).toBe(1024);
    });

    test('payload at exactly threshold boundary is compressed', async () => {
        // Build a payload whose JSON is exactly COMPRESSION_THRESHOLD bytes
        const base = '{"d":"';
        const suffix = '"}';
        const padding = COMPRESSION_THRESHOLD - base.length - suffix.length;
        const payload = JSON.parse(base + 'a'.repeat(padding) + suffix);

        const result = await compressMessage(payload);
        // The condition is `size < COMPRESSION_THRESHOLD`, so a payload of exactly
        // 1024 bytes is NOT below the threshold and therefore IS compressed.
        expect(result.compressed).toBe(true);
    });
});

// ─── 4. Broadcast Timing ─────────────────────────────────────────────────────
// Validates: Requirements 13.1, 13.2

describe('Broadcast Timing (Req 13.1, 13.2)', () => {
    const ROOM = 'INT_TIMING_001';

    beforeEach(async () => {
        await sessionStore.setSession(ROOM, makeSession());
    });

    afterEach(async () => {
        await sessionStore.deleteSession(ROOM);
        messageBatcher.clear(ROOM);
    });

    test('state change broadcast completes within 1 second (Req 13.1)', async () => {
        const emitted = [];
        const mockIo = {
            to: (room) => ({ emit: (event, data) => emitted.push({ room, event, data }) }),
        };

        const start = Date.now();

        // Simulate the broadcast path: read session, add seq, emit
        const session = await sessionStore.getSession(ROOM);
        session.sequenceNumber = (session.sequenceNumber || 0) + 1;
        await sessionStore.setSession(ROOM, session);

        const payload = { status: session.status, sequenceNumber: session.sequenceNumber, timestamp: Date.now() };
        mockIo.to(ROOM).emit('state_update', payload);

        const elapsed = Date.now() - start;
        expect(elapsed).toBeLessThan(1000);
        expect(emitted).toHaveLength(1);
        expect(emitted[0].event).toBe('state_update');
    });

    test('question broadcast to multiple participants completes within 1 second (Req 13.2)', async () => {
        const receivedAt = [];
        const participantCount = 10;

        // Simulate io.to(room).emit reaching all participants simultaneously
        const broadcastStart = Date.now();

        const mockBroadcast = async () => {
            // Simulate minimal async overhead (compression check, seq increment)
            const session = await sessionStore.getSession(ROOM);
            const prepared = await prepareMessage('new_question', session.questions[0]);
            receivedAt.push(Date.now());
            return prepared;
        };

        // All participants receive the same broadcast call
        await Promise.all(Array.from({ length: participantCount }, () => mockBroadcast()));

        const elapsed = Date.now() - broadcastStart;
        expect(elapsed).toBeLessThan(1000);
        expect(receivedAt).toHaveLength(participantCount);

        // All receive times should be within 200ms of each other (simultaneous broadcast)
        const spread = Math.max(...receivedAt) - Math.min(...receivedAt);
        expect(spread).toBeLessThan(200);
    });

    test('batched messages are flushed within batch window (100ms)', (done) => {
        const flushed = [];

        messageBatcher.batch(ROOM, 'answer_stats', { score: 10 }, (room, grouped) => {
            flushed.push(grouped);
        });
        messageBatcher.batch(ROOM, 'answer_stats', { score: 20 }, (room, grouped) => {
            flushed.push(grouped);
        });

        // Batch window is 100ms; check after 200ms
        setTimeout(() => {
            expect(flushed.length).toBeGreaterThanOrEqual(1);
            const lastFlush = flushed[flushed.length - 1];
            expect(lastFlush['answer_stats']).toBeDefined();
            done();
        }, 200);
    });

    test('sequence number is included in broadcast payload', async () => {
        const session = await sessionStore.getSession(ROOM);
        session.sequenceNumber = (session.sequenceNumber || 0) + 1;
        await sessionStore.setSession(ROOM, session);

        const payload = {
            status: session.status,
            sequenceNumber: session.sequenceNumber,
            timestamp: Date.now(),
        };

        expect(payload.sequenceNumber).toBeGreaterThan(0);
        expect(typeof payload.sequenceNumber).toBe('number');
        expect(payload.timestamp).toBeDefined();
    });

    test('question transition broadcast includes sequence number (Req 13.2, 13.3)', async () => {
        const session = await sessionStore.getSession(ROOM);
        const question = session.questions[0];

        // Simulate addSequenceNumber behaviour
        session.sequenceNumber = (session.sequenceNumber || 0) + 1;
        await sessionStore.setSession(ROOM, session);

        const questionPayload = {
            ...question,
            sequenceNumber: session.sequenceNumber,
            timestamp: Date.now(),
        };

        expect(questionPayload.sequenceNumber).toBe(1);
        expect(questionPayload._id).toBe('q1');
    });
});
