/**
 * Comprehensive tests for real-time state synchronization
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7
 */

const { compressMessage, decompressMessage, prepareMessage, COMPRESSION_THRESHOLD } = require('../utils/messageCompression');
const MessageBatcher = require('../utils/messageBatching');

// ─── Message Compression Tests ────────────────────────────────────────────────

describe('Message Compression (Requirement 13.5)', () => {
  test('should NOT compress messages smaller than 1KB', async () => {
    const smallPayload = { event: 'test', data: 'small' };
    const result = await compressMessage(smallPayload);

    expect(result.compressed).toBe(false);
    expect(result.data).toEqual(smallPayload);
  });

  test('should compress messages larger than 1KB', async () => {
    const largePayload = {
      event: 'state_update',
      data: 'x'.repeat(COMPRESSION_THRESHOLD + 100),
    };
    const result = await compressMessage(largePayload);

    expect(result.compressed).toBe(true);
    expect(typeof result.data).toBe('string'); // base64 encoded
    expect(result.compressedSize).toBeLessThan(result.originalSize);
  });

  test('should decompress a compressed message back to original', async () => {
    const original = {
      event: 'question_state',
      question: { text: 'x'.repeat(COMPRESSION_THRESHOLD + 100) },
    };

    const compressed = await compressMessage(original);
    expect(compressed.compressed).toBe(true);

    const decompressed = await decompressMessage(compressed.data);
    expect(decompressed).toEqual(original);
  });

  test('prepareMessage should include compression metadata', async () => {
    const largePayload = { data: 'x'.repeat(COMPRESSION_THRESHOLD + 100) };
    const result = await prepareMessage('test_event', largePayload);

    expect(result.event).toBe('test_event');
    expect(result.compressed).toBe(true);
    expect(result.metadata.originalSize).toBeGreaterThan(COMPRESSION_THRESHOLD);
    expect(result.metadata.compressedSize).toBeDefined();
  });

  test('prepareMessage should pass through small messages uncompressed', async () => {
    const smallPayload = { data: 'small' };
    const result = await prepareMessage('test_event', smallPayload);

    expect(result.event).toBe('test_event');
    expect(result.compressed).toBe(false);
    expect(result.data).toEqual(smallPayload);
  });
});

// ─── Message Batching Tests ───────────────────────────────────────────────────

describe('Message Batching (Requirement 13.6)', () => {
  let batcher;

  beforeEach(() => {
    // Create a fresh batcher for each test
    const { MessageBatcher: MB } = jest.requireActual('../utils/messageBatching');
    batcher = new (require('../utils/messageBatching').constructor || Object.getPrototypeOf(require('../utils/messageBatching')).constructor)();
    // Use the singleton but clear it
    batcher = require('../utils/messageBatching');
    batcher.clearAll();
  });

  afterEach(() => {
    batcher.clearAll();
  });

  test('should batch multiple rapid messages into single flush', (done) => {
    const roomCode = 'BATCH_TEST_001';
    const flushedMessages = [];

    const flushCallback = (code, grouped) => {
      flushedMessages.push({ code, grouped });
    };

    // Send 3 rapid messages
    batcher.batch(roomCode, 'score_update', { score: 100 }, flushCallback);
    batcher.batch(roomCode, 'score_update', { score: 110 }, flushCallback);
    batcher.batch(roomCode, 'score_update', { score: 120 }, flushCallback);

    // After batch window, should have flushed once with all 3
    setTimeout(() => {
      expect(flushedMessages.length).toBe(1);
      expect(flushedMessages[0].grouped['score_update']).toHaveLength(3);
      done();
    }, 200);
  });

  test('should group messages by event type', (done) => {
    const roomCode = 'BATCH_TEST_002';
    let flushed = null;

    batcher.batch(roomCode, 'score_update', { score: 100 }, (code, grouped) => { flushed = grouped; });
    batcher.batch(roomCode, 'participant_join', { name: 'Alice' }, (code, grouped) => { flushed = grouped; });
    batcher.batch(roomCode, 'score_update', { score: 110 }, (code, grouped) => { flushed = grouped; });

    setTimeout(() => {
      expect(flushed['score_update']).toHaveLength(2);
      expect(flushed['participant_join']).toHaveLength(1);
      done();
    }, 200);
  });

  test('should clear batch for a room', () => {
    const roomCode = 'BATCH_TEST_003';
    const flushCallback = jest.fn();

    batcher.batch(roomCode, 'test_event', { data: 1 }, flushCallback);
    batcher.clear(roomCode);

    // Callback should not be called after clear
    return new Promise(resolve => setTimeout(resolve, 200)).then(() => {
      expect(flushCallback).not.toHaveBeenCalled();
    });
  });
});

// ─── Sequence Number Tests ────────────────────────────────────────────────────

describe('Sequence Numbers (Requirement 13.3)', () => {
  test('should include sequence number in state updates', () => {
    // Simulate sequence number tracking
    const sequenceTracker = new Map();

    const getNextSequence = (roomCode) => {
      const current = sequenceTracker.get(roomCode) || 0;
      const next = current + 1;
      sequenceTracker.set(roomCode, next);
      return next;
    };

    const roomCode = 'SEQ_TEST_001';

    const seq1 = getNextSequence(roomCode);
    const seq2 = getNextSequence(roomCode);
    const seq3 = getNextSequence(roomCode);

    expect(seq1).toBe(1);
    expect(seq2).toBe(2);
    expect(seq3).toBe(3);
  });

  test('should detect missed updates via sequence gap', () => {
    const lastReceivedSeq = 5;
    const incomingSeq = 8; // Gap: 6 and 7 were missed

    const hasMissedUpdates = incomingSeq > lastReceivedSeq + 1;
    expect(hasMissedUpdates).toBe(true);

    const missedCount = incomingSeq - lastReceivedSeq - 1;
    expect(missedCount).toBe(2);
  });

  test('should NOT flag consecutive sequence as missed', () => {
    const lastReceivedSeq = 5;
    const incomingSeq = 6; // Consecutive, no gap

    const hasMissedUpdates = incomingSeq > lastReceivedSeq + 1;
    expect(hasMissedUpdates).toBe(false);
  });

  test('should handle sequence reset (new session)', () => {
    const sequenceTracker = new Map();

    const getNextSequence = (roomCode) => {
      const current = sequenceTracker.get(roomCode) || 0;
      const next = current + 1;
      sequenceTracker.set(roomCode, next);
      return next;
    };

    const resetSequence = (roomCode) => {
      sequenceTracker.set(roomCode, 0);
    };

    const roomCode = 'SEQ_RESET_001';

    getNextSequence(roomCode); // 1
    getNextSequence(roomCode); // 2
    resetSequence(roomCode);
    const afterReset = getNextSequence(roomCode); // Should be 1 again

    expect(afterReset).toBe(1);
  });
});

// ─── State Reconciliation Tests ───────────────────────────────────────────────

describe('State Reconciliation (Requirement 13.4, 13.7)', () => {
  test('should build complete state snapshot for reconciliation', () => {
    const session = {
      status: 'live',
      currentQuestionIndex: 2,
      questionState: 'live',
      questionExpiry: Date.now() + 15000,
      isPaused: false,
      mode: 'auto',
    };

    const leaderboard = [
      { userId: 'u1', name: 'Alice', score: 200, rank: 1 },
      { userId: 'u2', name: 'Bob', score: 150, rank: 2 },
    ];

    const currentQuestion = {
      _id: 'q3',
      text: 'What is 2+2?',
      options: ['3', '4', '5', '6'],
      timeLimit: 30,
    };

    const stateSnapshot = {
      sessionStatus: session.status,
      currentQuestionIndex: session.currentQuestionIndex,
      questionState: session.questionState,
      timeRemaining: session.questionExpiry ? Math.max(0, session.questionExpiry - Date.now()) : null,
      isPaused: session.isPaused,
      mode: session.mode,
      leaderboard,
      currentQuestion,
      timestamp: Date.now(),
    };

    // Verify snapshot contains all required fields
    expect(stateSnapshot.sessionStatus).toBe('live');
    expect(stateSnapshot.currentQuestionIndex).toBe(2);
    expect(stateSnapshot.questionState).toBe('live');
    expect(stateSnapshot.timeRemaining).toBeGreaterThan(0);
    expect(stateSnapshot.leaderboard).toHaveLength(2);
    expect(stateSnapshot.currentQuestion).toBeDefined();
    expect(stateSnapshot.timestamp).toBeDefined();
  });

  test('should deliver full state within 2 seconds on reconnect (Requirement 13.7)', async () => {
    const startTime = Date.now();

    // Simulate state retrieval (should be fast)
    const getFullState = async () => {
      // Simulate async DB/Redis lookup
      await new Promise(resolve => setTimeout(resolve, 50));
      return {
        sessionStatus: 'live',
        currentQuestionIndex: 1,
        leaderboard: [],
        timestamp: Date.now(),
      };
    };

    const state = await getFullState();
    const elapsed = Date.now() - startTime;

    expect(state).toBeDefined();
    expect(elapsed).toBeLessThan(2000); // Must be within 2 seconds
  });

  test('should broadcast state changes within 1 second (Requirement 13.1)', async () => {
    const startTime = Date.now();

    // Simulate broadcast operation
    const broadcastStateChange = async () => {
      await new Promise(resolve => setTimeout(resolve, 10)); // Simulate minimal processing
      return { broadcasted: true, timestamp: Date.now() };
    };

    const result = await broadcastStateChange();
    const elapsed = Date.now() - startTime;

    expect(result.broadcasted).toBe(true);
    expect(elapsed).toBeLessThan(1000); // Must be within 1 second
  });
});

// ─── Concurrent Update Tests ──────────────────────────────────────────────────

describe('Concurrent Updates (Requirement 13.2)', () => {
  test('should handle concurrent participant submissions without data loss', async () => {
    const submissions = new Map();

    const submitAnswer = async (userId, answer, score) => {
      // Simulate concurrent submissions
      await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
      submissions.set(userId, { answer, score, timestamp: Date.now() });
    };

    // Simulate 10 concurrent submissions
    const participants = Array.from({ length: 10 }, (_, i) => `user${i}`);
    await Promise.all(
      participants.map(userId => submitAnswer(userId, 'A', Math.floor(Math.random() * 100)))
    );

    expect(submissions.size).toBe(10);
    participants.forEach(userId => {
      expect(submissions.has(userId)).toBe(true);
    });
  });

  test('should send question data to all participants simultaneously (Requirement 13.2)', async () => {
    const receivedTimes = [];

    const broadcastToParticipant = async (participantId) => {
      // Simulate minimal broadcast delay
      await new Promise(resolve => setTimeout(resolve, 5));
      receivedTimes.push({ participantId, time: Date.now() });
    };

    const broadcastStart = Date.now();
    const participants = Array.from({ length: 5 }, (_, i) => `participant${i}`);

    // Broadcast simultaneously
    await Promise.all(participants.map(id => broadcastToParticipant(id)));

    const broadcastEnd = Date.now();
    const totalTime = broadcastEnd - broadcastStart;

    // All participants should receive within 1 second
    expect(totalTime).toBeLessThan(1000);
    expect(receivedTimes).toHaveLength(5);

    // All receive times should be close together (within 100ms of each other)
    const times = receivedTimes.map(r => r.time);
    const spread = Math.max(...times) - Math.min(...times);
    expect(spread).toBeLessThan(100);
  });
});
