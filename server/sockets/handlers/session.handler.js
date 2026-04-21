const logger = require('../../utils/logger');
const sessionStore = require('../../services/session/session.service');
const quizService = require('../../services/quiz/quiz.service');
const crypto = require('crypto');
const { formatQuestion, republishCurrentQuestion } = require('../../services/gameplay/question.service');
const { 
    publishJoinSuccess, 
    publishSessionState, 
    publishParticipantUpdate, 
    publishSessionStart,
    publishSessionRedirect,
    publishSessionModeChange,
    publishQuizPaused,
    publishRejoinSuccess
} = require('../../services/session/session.publisher');
const { publishNewQuestion, publishLeaderboardUpdate, publishAnswerStats } = require('../../services/gameplay/gameplay.publisher');
const { publishTimerStart } = require('../../services/timer/timer.publisher');

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a lightweight session:state snapshot for late-joiners.
 * Includes the current question when the session is already live.
 */
const buildSessionStateSnapshot = (session, roomCode) => {
    const snapshot = {
        sessionCode: roomCode,
        status: session.status,
        mode: session.mode || 'auto',
        currentQuestionIndex: session.currentQuestionIndex ?? 0,
        isPaused: session.isPaused || false,
        participantCount: Object.keys(session.participants || {}).length,
        participants: Object.values(session.participants || []),
        questionExpiry: session.questionExpiry || null,
        questionState: session.questionState || 'waiting',
    };

    // Include active question for participants who join while session is live
    if (session.status === 'live' && session.questionState === 'live') {
        const questions = session.questions || [];
        const q = questions[session.currentQuestionIndex ?? 0];
        if (q) {
            snapshot.currentQuestion = formatQuestion(
                q,
                session.currentQuestionIndex,
                questions.length,
                session.questionExpiry
            );
            if (session.questionExpiry) {
                snapshot.timeLeft = Math.max(0, Math.floor((session.questionExpiry - Date.now()) / 1000));
                snapshot.expiry = session.questionExpiry;
            }
        }
    }

    return snapshot;
};

// ── Handler Registration ─────────────────────────────────────────────────────

const registerSessionHandler = (io, socket) => {
    const user = socket.data.user;
    const joinRateLimits = new Map();

    /**
     * Core join logic (shared by join_quiz, join_room, participant:join)
     */
    const handleJoin = async ({ sessionCode, roomCode, sessionId, quizId } = {}) => {
        const traceId = crypto.randomUUID();
        try {
            // ── Join Storm Protection ──────────────────────────────────────────
            const now = Date.now();
            const attempts = joinRateLimits.get(socket.id) || [];
            const recentAttempts = attempts.filter(t => now - t < 5000);
            
            if (recentAttempts.length >= 3) {
                logger.warn('[JOIN] Rate limit exceeded', { userId: user?._id, socketId: socket.id, traceId });
                return socket.emit('join_error', { message: 'Too many join attempts. Please wait.' });
            }
            recentAttempts.push(now);
            joinRateLimits.set(socket.id, recentAttempts);

            const finalCode = (sessionCode || roomCode || '').toUpperCase();
            if (!finalCode && !sessionId) return socket.emit('join_error', { message: 'roomCode is required' });

            const result = await quizService.joinRoom({ io, socket, roomCode: finalCode, sessionId });
            if (result.error) return socket.emit('join_error', { message: result.error });

            socket.join(result.roomCode);
            socket.data.roomCode = result.roomCode;

            // 🔥 Use Publisher for responses and broadcasts
            publishJoinSuccess(socket, result.roomCode, {
                roomCode: result.roomCode,
                sessionId: result.session?.sessionId || null,
                session: buildSessionStateSnapshot(result.session, result.roomCode),
                user: { id: user?._id, name: user?.name, role: user?.role }
            });

            const participants = Object.values(result.session.participants || {});
            publishParticipantUpdate(result.roomCode, participants);

            logger.info('[JOIN] Success', { userId: user?._id, roomCode: result.roomCode, traceId });
        } catch (err) {
            logger.error('[ERROR] session.handler join', { error: err.message, stack: err.stack });
            socket.emit('join_error', { message: 'Failed to join session' });
        }
    };

    socket.on('join_quiz', handleJoin);
    socket.on('join_room', handleJoin);
    socket.on('participant:join', handleJoin);

    /**
     * Rejoin after network drop
     */
    socket.on('rejoin_quiz', async ({ roomCode, sessionCode, sessionId } = {}) => {
        try {
            const finalCode = (roomCode || sessionCode || '').toUpperCase();
            const { handleParticipantReconnection } = require('../../services/session/sessionRecovery');
            
            socket.join(finalCode);
            socket.data.roomCode = finalCode;

            const reconnectData = await handleParticipantReconnection(socket, finalCode, user);
            if (!reconnectData.reconnected) return handleJoin({ roomCode: finalCode, sessionId });

            const session = await sessionStore.getSession(finalCode);
            publishRejoinSuccess(socket, finalCode, {
                sessionCode: finalCode,
                sessionStatus: reconnectData.sessionStatus,
                isPaused: reconnectData.isPaused,
                currentQuestion: reconnectData.currentQuestion,
                userStats: reconnectData.userStats,
                timerExpiry: session?.questionExpiry || null,
            });

            if (session) {
                publishSessionState(socket, finalCode, buildSessionStateSnapshot(session, finalCode));
            }
        } catch (err) {
            logger.error('rejoin_quiz error', { error: err.message });
            socket.emit('join_error', { message: 'Failed to rejoin session' });
        }
    });

    /**
     * Participant explicitly leaves
     */
    socket.on('participant:leave', async ({ sessionCode } = {}) => {
        try {
            const roomCode = sessionCode || socket.data.roomCode;
            if (!roomCode) return;

            const session = await sessionStore.getSession(roomCode);
            if (session && session.participants?.[user?._id]) {
                delete session.participants[user._id];
                await sessionStore.setSession(roomCode, session);
                publishParticipantUpdate(roomCode, Object.values(session.participants));
            }

            socket.leave(roomCode);
            socket.data.roomCode = null;
        } catch (err) {
            logger.error('participant:leave error', { error: err.message });
        }
    });

    /**
     * Host starts the session via socket (called after HTTP start-live).
     * Re-broadcasts the first question to ensure all connected participants receive it.
     */
    socket.on('session:start', async ({ sessionCode, sessionId, mode } = {}) => {
        try {
            if (user?.role !== 'host' && user?.role !== 'admin') return;

            const result = await quizService.startQuizSession({ io, roomCode: sessionCode, sessionId, user, mode });
            if (result.error) return socket.emit('session:error', { message: result.error });

            const resolvedMode = result.session?.mode || mode || 'auto';
            publishSessionStart(result.roomCode, {
                sessionCode: result.roomCode,
                sessionId: result.sessionId,
                mode: resolvedMode,
            });

            const waitingRoomCode = result.quiz?.roomCode;
            if (waitingRoomCode && waitingRoomCode !== result.roomCode) {
                publishSessionRedirect(waitingRoomCode, { roomCode: result.roomCode, sessionId: result.sessionId });
            }

            // ── Idempotent broadcast: avoid duplicate timer resets ─────────────
            // If the session question is already LIVE (HTTP start already fired),
            // re-publish existing state WITHOUT resetting timers.
            // Otherwise do a full broadcast (starts new timers for Q0).
            setTimeout(async () => {
                try {
                    const session = await sessionStore.getSession(result.roomCode);
                    if (session?.questionState === 'live') {
                        // Safe re-publish — no timer reset
                        await republishCurrentQuestion(io, result.roomCode);
                    } else {
                        // Session waiting for first question — full broadcast
                        await quizService.broadcastQuestionEnhanced(io, result.roomCode);
                    }
                } catch (err) {
                    logger.error('[session:start] broadcast failed', { roomCode: result.roomCode, error: err.message });
                }
            }, 400);
        } catch (err) {
            logger.error('session:start error', { error: err.message });
        }
    });

    /**
     * Sync request
     */
    socket.on('session:syncState', async ({ sessionCode } = {}) => {
        const roomCode = sessionCode || socket.data.roomCode;
        const session = await sessionStore.getSession(roomCode);
        if (session) publishSessionState(socket, roomCode, buildSessionStateSnapshot(session, roomCode));
    });

    /**
     * Host toggles mode
     */
    socket.on('session:modeToggle', async ({ sessionCode, mode } = {}) => {
        if (user?.role !== 'host' && user?.role !== 'admin') return;
        const roomCode = sessionCode || socket.data.roomCode;
        const session = await sessionStore.getSession(roomCode);
        if (session) {
            session.mode = mode;
            await sessionStore.setSession(roomCode, session);
            publishSessionModeChange(roomCode, mode);
        }
    });

    /**
     * Cleanup and auto-pause on disconnect
     */
    socket.on('disconnect', async () => {
        try {
            await quizService.leaveRoom({ io, socket });
            const roomCode = socket.data.roomCode;
            if (!roomCode) return;

            const session = await sessionStore.getSession(roomCode);
            if ((user?.role === 'host' || user?.role === 'admin') && session?.status === 'live') {
                session.isPaused = true;
                await sessionStore.setSession(roomCode, session);
                publishQuizPaused(roomCode, { message: 'Host disconnected', hostDisconnected: true });
            }
        } catch (err) {
            logger.error('disconnect cleanup error', { error: err.message });
        }
    });
};

module.exports = registerSessionHandler;
