import { createServer as createHttpServer } from 'node:http';
import { parse } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { Server as SocketIOServer } from 'socket.io';

const port = Number(process.env.E2E_PORT || 4173);
const QUESTION_DURATION_SECONDS = 15;

const json = (res, statusCode, payload) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
};

const createQuestionPayload = (questionNumber) => ({
  _id: `q-${questionNumber}`,
  text: `Question ${questionNumber}: ${questionNumber === 1 ? 'Launch' : 'Reconnected'}`,
  options: ['Option A', 'Option B', 'Option C', 'Option D'],
  correctOption: 0,
  timeLimit: QUESTION_DURATION_SECONDS,
  questionType: 'multiple-choice',
  index: questionNumber - 1,
  total: 2,
});

const createWaitingPayload = (roomCode) => ({
  status: 'waiting',
  roomCode,
  sessionId: 'session-e2e',
  title: 'E2E Quiz',
  participants: [
    { _id: 'p-1', name: 'Alex' },
    { _id: 'p-2', name: 'Taylor' },
  ],
  leaderboard: [],
});

const createLivePayload = (roomCode, questionNumber, timeLeftOverride) => {
  const currentQuestion = createQuestionPayload(questionNumber);
  const timeLeft = Number.isFinite(timeLeftOverride) ? Math.max(1, Math.floor(timeLeftOverride)) : currentQuestion.timeLimit;
  return {
    status: 'live',
    roomCode,
    sessionId: 'session-e2e',
    title: 'E2E Quiz',
    participants: [
      { _id: 'p-1', name: 'Alex' },
      { _id: 'p-2', name: 'Taylor' },
    ],
    leaderboard: [],
    currentQuestion,
    timeLeft,
    expiry: Date.now() + timeLeft * 1_000,
  };
};

const vite = await createViteServer({
  root: process.cwd(),
  server: { middlewareMode: true },
  appType: 'spa',
});

let reconnectDirective = null;
const roomRuntime = new Map();

const httpServer = createHttpServer((req, res) => {
  const { pathname, query } = parse(req.url || '/', true);

  if (req.method === 'POST' && pathname === '/api/auth/refresh') {
    const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const header = b64({ alg: 'HS256', typ: 'JWT' });
    const payload = b64({ id: 'user-e2e-1', role: 'participant', exp: Math.floor(Date.now() / 1000) + 3600 });
    const e2eToken = `${header}.${payload}.mocksignature`;
    json(res, 200, { token: e2eToken });
    return;
  }

  if (req.method === 'GET' && pathname?.startsWith('/api/quiz/')) {
    const roomCode = String(pathname.split('/').pop() || 'E2E123').toUpperCase();
    json(res, 200, {
      _id: 'quiz-e2e',
      title: 'E2E Quiz',
      roomCode,
      activeSessionCode: roomCode,
      sessionId: 'session-e2e',
      status: 'waiting',
    });
    return;
  }

  if (req.method === 'POST' && pathname?.startsWith('/api/quiz/join-scheduled/')) {
    json(res, 200, { success: true });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/e2e/disrupt-socket') {
    reconnectDirective = {
      mode: query?.mode === 'continuity' ? 'continuity' : 'next-question',
      remainingUses: 2,
      expiresAt: Date.now() + 8_000,
    };
    for (const socket of io.sockets.sockets.values()) {
      try {
        socket.conn.close();
      } catch {
        // Ignore; this endpoint is best-effort for reconnect testing.
      }
    }
    json(res, 200, { success: true });
    return;
  }

  vite.middlewares(req, res, () => {
    res.statusCode = 404;
    res.end('Not Found');
  });
});

const io = new SocketIOServer(httpServer, {
  path: '/socket.io',
  cors: {
    origin: true,
    credentials: true,
  },
});

io.on('connection', (socket) => {
  socket.on('join_room', ({ roomCode }) => {
    const normalizedRoomCode = String(roomCode || 'E2E123').toUpperCase();
    if (reconnectDirective && reconnectDirective.expiresAt < Date.now()) {
      reconnectDirective = null;
    }

    const mode = reconnectDirective?.mode || null;
    if (reconnectDirective) {
      reconnectDirective.remainingUses -= 1;
      if (reconnectDirective.remainingUses <= 0) {
        reconnectDirective = null;
      }
    }

    const runtime = roomRuntime.get(normalizedRoomCode) || {
      activeQuestion: 1,
      questionStartedAt: null,
    };

    let questionNumber = 1;
    let liveDelayMs = 600;
    let timeLeftOverride;

    if (mode === 'next-question') {
      questionNumber = 2;
      liveDelayMs = 450;
      runtime.activeQuestion = 2;
    } else if (mode === 'continuity' && runtime.questionStartedAt) {
      questionNumber = runtime.activeQuestion;
      liveDelayMs = 300;
      const elapsedSeconds = Math.floor((Date.now() - runtime.questionStartedAt) / 1_000);
      timeLeftOverride = QUESTION_DURATION_SECONDS - elapsedSeconds;
    }

    roomRuntime.set(normalizedRoomCode, runtime);

    socket.join(normalizedRoomCode);
    socket.emit('room_state', createWaitingPayload(normalizedRoomCode));

    setTimeout(() => {
      if (mode !== 'continuity' || !runtime.questionStartedAt) {
        runtime.questionStartedAt = Date.now();
      }
      runtime.activeQuestion = questionNumber;
      roomRuntime.set(normalizedRoomCode, runtime);
      socket.emit('room_state', createLivePayload(normalizedRoomCode, questionNumber, timeLeftOverride));
    }, liveDelayMs);
  });
});

const shutdown = async () => {
  await new Promise((resolve) => io.close(() => resolve()));
  await vite.close();
  await new Promise((resolve) => httpServer.close(() => resolve()));
};

process.on('SIGINT', async () => {
  await shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await shutdown();
  process.exit(0);
});

httpServer.listen(port, '127.0.0.1', () => {
  console.log(`E2E mock realtime server listening on http://127.0.0.1:${port}`);
});
