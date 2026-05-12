const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const { io } = require(path.join(root, 'client', 'node_modules', 'socket.io-client'));

const BASE = process.env.QUIZ_API_BASE_URL || 'http://localhost:5000';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(pathname, { method = 'GET', token, body } = {}) {
    const response = await fetch(`${BASE}${pathname}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    let payload;
    try {
        payload = text ? JSON.parse(text) : null;
    } catch {
        payload = text;
    }

    if (!response.ok) {
        throw new Error(`${method} ${pathname} -> ${response.status} ${JSON.stringify(payload)}`);
    }

    if (payload && typeof payload === 'object' && payload.success === true && Object.prototype.hasOwnProperty.call(payload, 'data')) {
        return payload.data;
    }

    return payload;
}

async function register(role, label) {
    const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    const data = await request('/api/auth/register', {
        method: 'POST',
        body: {
            name: label,
            email: `${label}.${suffix}@example.com`,
            password: 'Password123!',
            role,
        },
    });
    return data;
}

function createClient(token) {
    const state = { roomCode: null, sessionId: null, questions: [], ticks: [] };
    const socket = io(BASE, {
        auth: { token },
        transports: ['websocket'],
        reconnection: false,
    });

    socket.on('room_state', (payload) => {
        if (payload?.roomCode) state.roomCode = payload.roomCode;
        if (payload?.sessionId) state.sessionId = payload.sessionId;
    });

    socket.on('session_redirect', ({ roomCode, sessionId }) => {
        if (roomCode) state.roomCode = roomCode;
        if (sessionId) state.sessionId = sessionId;
        socket.emit('join_room', { roomCode, sessionId });
    });

    socket.on('new_question', (question) => state.questions.push(question));
    socket.on('timer_tick', (tick) => state.ticks.push(tick));

    const ready = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('connect timeout')), 10000);
        socket.once('connect', () => {
            clearTimeout(timeout);
            resolve();
        });
        socket.once('connect_error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });
    });

    return { socket, state, ready };
}

async function waitFor(predicate, label, timeout = 25000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        if (predicate()) return;
        await wait(50);
    }
    throw new Error(`Timeout ${label}`);
}

(async () => {
    const org = await register('host', 'smoke_org');
    const p1 = await register('participant', 'smoke_p1');
    const p2 = await register('participant', 'smoke_p2');

    const quiz = await request('/api/quiz', {
        method: 'POST',
        token: org.token,
        body: {
            title: `Realtime Smoke ${Date.now()}`,
            type: 'quiz',
            quizCategory: 'regular',
        },
    });

    await request(`/api/quiz/${quiz._id}/questions`, {
        method: 'POST',
        token: org.token,
        body: {
            text: 'Q1?',
            options: ['A', 'B', 'C', 'D'],
            correctOption: 1,
            timeLimit: 5,
            shuffleOptions: false,
        },
    });

    await request(`/api/quiz/${quiz._id}/questions`, {
        method: 'POST',
        token: org.token,
        body: {
            text: 'Q2?',
            options: ['E', 'F', 'G', 'H'],
            correctOption: 1,
            timeLimit: 5,
            shuffleOptions: false,
        },
    });

    // 1. Initialize a waiting session
    const sessionInit = await request(`/api/quiz/${quiz._id}/start`, {
        method: 'POST',
        token: org.token,
    });
    const sessionCode = sessionInit.sessionCode;

    const host = createClient(org.token);
    const participantA = createClient(p1.token);
    const participantB = createClient(p2.token);

    await Promise.all([host.ready, participantA.ready, participantB.ready]);

    // 2. Join the session room
    host.socket.emit('join_room', { roomCode: sessionCode });
    participantA.socket.emit('join_room', { roomCode: sessionCode });
    participantB.socket.emit('join_room', { roomCode: sessionCode });

    // 3. Start the quiz (Transition to LIVE)
    await request(`/api/quiz/${quiz._id}/start-live`, {
        method: 'POST',
        token: org.token,
    });

    await waitFor(
        () => participantA.state.questions.length >= 2 && participantB.state.questions.length >= 2,
        'two questions delivered',
    );

    await waitFor(
        () => participantA.state.ticks.length > 0 && participantB.state.ticks.length > 0,
        'timer ticks delivered',
    );

    console.log(JSON.stringify({
        status: 'ok',
        firstQuestion: participantA.state.questions[0]?.text || null,
        secondQuestion: participantA.state.questions[1]?.text || null,
        participantATickCount: participantA.state.ticks.length,
        participantBTickCount: participantB.state.ticks.length,
    }, null, 2));

    host.socket.close();
    participantA.socket.close();
    participantB.socket.close();
})().catch((err) => {
    console.error(err && err.stack ? err.stack : String(err));
    process.exit(1);
});
