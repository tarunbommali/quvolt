const logger = require('../../utils/logger');
const sessionStore = require('../../services/session/session.service');
const quizService = require('../../services/quiz/quiz.service');

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Debounce helper keyed by roomCode — prevents participant-update floods
 * when multiple joins happen within the same tick.
 */
const participantDebounceTimers = new Map();

const debouncedParticipantUpdate = (io, roomCode, participants, delayMs = 150) => {
    if (participantDebounceTimers.has(roomCode)) {
        clearTimeout(participantDebounceTimers.get(roomCode));
    }

    const timer = setTimeout(() => {
        io.to(roomCode).emit('session:updateParticipants', {
            participants,
            count: participants.length,
        });
        participantDebounceTimers.delete(roomCode);
    }, delayMs);

    participantDebounceTimers.set(roomCode, timer);
};

/**
 * Build a lightweight session:state snapshot for late-joiners and
 * broadcast to a specific socket (not the whole room).
 */
const buildSessionStateSnapshot = (session, roomCode) => ({
    sessionCode: roomCode,
    status: session.status,
    mode: session.mode || 'auto',
    currentQuestionIndex: session.currentQuestionIndex ?? 0,
    isPaused: session.isPaused || false,
    participantCount: Object.keys(session.participants || {}).length,
    participants: Object.values(session.participants || []),
    questionExpiry: session.questionExpiry || null,
    questionState: session.questionState || 'waiting',
});

// ── Handler Registration ─────────────────────────────────────────────────────

const registerSessionHandler = (io, socket) => {
    const user = socket.data.user;

    // ── participant:join ─────────────────────────────────────────────────────
    // Emitted by any client (host or participant) to enter a lobby room.
    // Uses the existing quiz.service.joinRoom under the hood for full validation.
    socket.on('participant:join', async ({ sessionCode, sessionId } = {}) => {
        try {
            if (!sessionCode && !sessionId) {
                return socket.emit('session:error', { message: 'sessionCode is required' });
            }

            const result = await quizService.joinRoom({
                io,
                socket,
                roomCode: sessionCode,
                sessionId,
            });

            if (result.error) {
                return socket.emit('session:error', { message: result.error });
            }

            socket.join(result.roomCode);
            socket.data.roomCode = result.roomCode;

            // Emit full state snapshot to the joining socket (late-join sync)
            socket.emit('session:state', buildSessionStateSnapshot(result.session, result.roomCode));

            // Debounced broadcast of updated participant list to the whole room
            const participants = Object.values(result.session.participants || {});
            debouncedParticipantUpdate(io, result.roomCode, participants);

            logger.debug('participant:join', { userId: user?._id, roomCode: result.roomCode });
        } catch (err) {
            logger.error('session.handler participant:join error', { error: err.message, stack: err.stack });
            socket.emit('session:error', { message: 'Failed to join session' });
        }
    });

    // ── participant:leave ────────────────────────────────────────────────────
    socket.on('participant:leave', async ({ sessionCode } = {}) => {
        try {
            const roomCode = sessionCode || socket.data.roomCode;
            if (!roomCode) return;

            const session = await sessionStore.getSession(roomCode);
            if (session && session.participants?.[user?._id]) {
                delete session.participants[user._id];
                await sessionStore.setSession(roomCode, session);

                const participants = Object.values(session.participants);
                debouncedParticipantUpdate(io, roomCode, participants);
            }

            socket.leave(roomCode);
            socket.data.roomCode = null;

            logger.debug('participant:leave', { userId: user?._id, roomCode });
        } catch (err) {
            logger.error('session.handler participant:leave error', { error: err.message });
        }
    });

    // ── session:start ────────────────────────────────────────────────────────
    // Host emits this to transition the session from LOBBY → LIVE.
    // Mode is stored in the session at quiz creation time; the host can  
    // optionally override it here before launch.
    socket.on('session:start', async ({ sessionCode, sessionId, mode } = {}) => {
        try {
            if (user?.role !== 'host' && user?.role !== 'admin') {
                return socket.emit('session:error', { message: 'Only the host can start the session' });
            }

            const result = await quizService.startQuizSession({
                io,
                roomCode: sessionCode,
                sessionId,
                user,
                mode,
            });

            if (result.error) {
                return socket.emit('session:error', { message: result.error });
            }

            // Broadcast session:start to every client in the room with
            // enough context for them to switch to quiz UI.
            io.to(result.roomCode).emit('session:start', {
                sessionCode: result.roomCode,
                sessionId: result.sessionId,
                mode: result.session?.mode || mode || 'auto',
            });

            logger.info('session:start broadcast', { roomCode: result.roomCode, mode });
        } catch (err) {
            logger.error('session.handler session:start error', { error: err.message, stack: err.stack });
            socket.emit('session:error', { message: 'Failed to start session' });
        }
    });

    // ── session:syncState ────────────────────────────────────────────────────
    // A client can request a fresh state snapshot (e.g. after reconnect).
    socket.on('session:syncState', async ({ sessionCode } = {}) => {
        try {
            const roomCode = sessionCode || socket.data.roomCode;
            if (!roomCode) return;

            const session = await sessionStore.getSession(roomCode);
            if (!session) {
                return socket.emit('session:error', { message: 'Session not found' });
            }

            socket.emit('session:state', buildSessionStateSnapshot(session, roomCode));
        } catch (err) {
            logger.error('session.handler session:syncState error', { error: err.message });
        }
    });

    // ── session:modeToggle ───────────────────────────────────────────────────
    // Host can toggle mode even while in the lobby (before launch).
    socket.on('session:modeToggle', async ({ sessionCode, mode } = {}) => {
        try {
            if (user?.role !== 'host' && user?.role !== 'admin') {
                return socket.emit('session:error', { message: 'Unauthorized' });
            }

            const roomCode = sessionCode || socket.data.roomCode;
            if (!roomCode) return;

            const validModes = ['auto', 'tutor'];
            if (!validModes.includes(mode)) {
                return socket.emit('session:error', { message: `Invalid mode: ${mode}` });
            }

            const session = await sessionStore.getSession(roomCode);
            if (!session) {
                return socket.emit('session:error', { message: 'Session not found' });
            }

            session.mode = mode;
            await sessionStore.setSession(roomCode, session);

            // Notify all clients in the room about the mode change
            io.to(roomCode).emit('session:modeChanged', { mode });

            logger.debug('session:modeToggle', { roomCode, mode, userId: user?._id });
        } catch (err) {
            logger.error('session.handler session:modeToggle error', { error: err.message });
        }
    });

    // ── Host disconnect: pause session ───────────────────────────────────────
    socket.on('disconnect', async () => {
        try {
            const roomCode = socket.data.roomCode;
            if (!roomCode || (user?.role !== 'host' && user?.role !== 'admin')) return;

            const session = await sessionStore.getSession(roomCode);
            if (!session || session.status !== 'live') return;

            // Auto-pause on host disconnect to prevent a "runaway" quiz
            session.isPaused = true;
            session.pausedAt = Date.now();
            session.timeLeftOnPause = Math.max(0, (session.questionExpiry || Date.now()) - Date.now());
            await sessionStore.setSession(roomCode, session);

            io.to(roomCode).emit('quiz_paused', {
                message: 'Host disconnected — quiz paused',
                hostDisconnected: true,
            });

            logger.warn('Host disconnected — session auto-paused', {
                roomCode,
                userId: user?._id,
            });
        } catch (err) {
            logger.error('session.handler host-disconnect pause error', { error: err.message });
        }
    });
};

module.exports = registerSessionHandler;
