/**
 * useSocketStore.js
 *
 * Singleton Socket.IO connection manager (Zustand store).
 *
 * Responsibilities:
 *  - Maintain a single socket connection for the entire app lifetime
 *  - Register all global event listeners EXACTLY ONCE per socket instance
 *  - Route incoming events to the correct domain store (realtime, UI)
 *  - Expose join / leave helpers with idempotency guards
 *
 * Rules:
 *  - Socket updates ONLY go to useQuizRealtimeStore
 *  - useQuizUIStore NEVER handles socket logic
 *  - Client NEVER calculates leaderboard, timer, or answer stats
 */
import { create } from 'zustand';
import { useAuthStore } from './useAuthStore';
import { getSocket, connectSocket, disconnectSocket as closeSocket } from '../sockets/socketClient';
import { SOCKET_EVENTS } from '../sockets/socketEvents';
import { socketEventBus } from '../sockets/socketEventBus';
import apiClient from '../services/apiClient';

/** Guard: once listeners are attached to a socket instance, we track it here */
let _listenersBoundToSocketId = null;

const bindGlobalListeners = (socket, set, get) => {
    // Same socket — already bound, nothing to do
    if (_listenersBoundToSocketId === socket.id) return;

    // New socket instance (reconnect with new ID or fresh connection):
    // remove all stale listeners first to guarantee clean state.
    // This prevents accumulation of duplicate handlers across reconnects.
    socket.removeAllListeners();
    _listenersBoundToSocketId = socket.id;

    console.log('[SocketStore] Binding global listeners to socket:', socket.id);

    // ── Connection lifecycle ───────────────────────────────────────────────
    socket.on(SOCKET_EVENTS.CONNECT, () => {
        console.log('[SocketStore] Connected:', socket.id);
        set({ connected: true, connectionState: 'connected', lastError: null });

        const { joinedRoomCode, joinedSessionId } = get();
        if (joinedRoomCode) {
            // Use rejoin_quiz on reconnect so the server restores question + timer state.
            // The server falls back to a fresh join_quiz if the reconnection window expired.
            console.log('[SocketStore] Rejoining room after reconnect:', joinedRoomCode);
            socket.emit('rejoin_quiz', {
                roomCode: joinedRoomCode,
                sessionId: joinedSessionId,
            });
        }
    });

    socket.on(SOCKET_EVENTS.CONNECT_ERROR, (err) => {
        console.error('[SocketStore] Connection error:', err.message);
        set({ connectionState: 'error', connected: false, lastError: err.message });
    });

    socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
        console.warn('[SocketStore] Disconnected:', reason);
        set({ connected: false, connectionState: 'disconnected' });
        // Reset the listener guard so they re-bind on the next connect
        _listenersBoundToSocketId = null;
    });

    socket.on(SOCKET_EVENTS.ERROR, (err) => {
        console.error('[SocketStore] Socket error event:', err);
    });

    // ── Join flow ──────────────────────────────────────────────────────────
    socket.on(SOCKET_EVENTS.JOIN_SUCCESS, (data) => {
        console.log('[SocketStore] join_success received:', data);
        set({ joinedRoomCode: data.roomCode, lastError: null });
        if (data.roomCode) {
            socketEventBus.emit(SOCKET_EVENTS.JOIN_SUCCESS, data);
        }
    });

    socket.on(SOCKET_EVENTS.JOIN_ERROR, (data) => {
        console.error('[SocketStore] join_error received:', data.message);
        set({ lastError: data.message });
        socketEventBus.emit(SOCKET_EVENTS.JOIN_ERROR, data);
    });

    // ── Participant updates ────────────────────────────────────────────────
    const handleParticipants = (payload) => {
        socketEventBus.emit(SOCKET_EVENTS.PARTICIPANTS_UPDATE, payload);
    };
    socket.on(SOCKET_EVENTS.PARTICIPANTS_UPDATE, handleParticipants);
    socket.on(SOCKET_EVENTS.PARTICIPANTS_UPDATE_LEGACY, handleParticipants);
    socket.on(SOCKET_EVENTS.WAITING_ROOM_UPDATE, handleParticipants);
    socket.on('session:updateParticipants', handleParticipants);

    // ── Room / session state ───────────────────────────────────────────────
    socket.on(SOCKET_EVENTS.ROOM_STATE, (state) => {
        console.log('[SocketStore] room_state received');
        socketEventBus.emit(SOCKET_EVENTS.ROOM_STATE, state);
    });

    socket.on(SOCKET_EVENTS.SESSION_STATE, (state) => {
        console.log('[SocketStore] session:state received, status:', state?.status);
        socketEventBus.emit(SOCKET_EVENTS.SESSION_STATE, state);
    });

    socket.on(SOCKET_EVENTS.SESSION_REDIRECT, ({ roomCode, sessionId }) => {
        console.log('[SocketStore] session_redirect → new room:', roomCode);
        set({ joinedRoomCode: roomCode, joinedSessionId: sessionId || null });
        socketEventBus.emit(SOCKET_EVENTS.SESSION_REDIRECT, { roomCode, sessionId });
    });

    // ── Session transitions ────────────────────────────────────────────────
    const handleSessionStart = () => {
        console.log('[SocketStore] session:start / start_quiz received');
        socketEventBus.emit(SOCKET_EVENTS.SESSION_START);
    };
    socket.on(SOCKET_EVENTS.SESSION_START, handleSessionStart);
    socket.on('start_quiz', handleSessionStart); // legacy

    // ── Live quiz events ───────────────────────────────────────────────────
    socket.on(SOCKET_EVENTS.NEW_QUESTION, (q) => {
        if (import.meta.env.DEV) console.log('[SocketStore] new_question — index:', q?.index, '/', q?.total);
        socketEventBus.emit(SOCKET_EVENTS.NEW_QUESTION, q);
    });

    // Safe sync (no UI reset — preserves selectedOption / myResult)
    socket.on(SOCKET_EVENTS.QUESTION_SYNC, (q) => {
        if (import.meta.env.DEV) console.log('[SocketStore] question:sync — expiry in', q?.expiry ? Math.round((q.expiry - Date.now()) / 1000) + 's' : 'n/a');
        socketEventBus.emit(SOCKET_EVENTS.QUESTION_SYNC, q);
    });

    socket.on(SOCKET_EVENTS.TIMER_START, (payload) => {
        if (import.meta.env.DEV) {
            const skew = payload?.expiry ? Math.round((payload.expiry - Date.now()) / 1000) : '?';
            console.log('[SocketStore] timer:start — expiry in', skew, 's, duration:', payload?.duration);
        }
        socketEventBus.emit(SOCKET_EVENTS.TIMER_START, payload);
    });

    socket.on(SOCKET_EVENTS.TIMER_UPDATE, (payload) => {
        socketEventBus.emit(SOCKET_EVENTS.TIMER_UPDATE, payload);
    });

    socket.on(SOCKET_EVENTS.TIMER_TICK, (payload) => {
        socketEventBus.emit(SOCKET_EVENTS.TIMER_TICK, payload);
    });

    socket.on(SOCKET_EVENTS.ANSWER_RESULT, (r) => {
        console.log('[SocketStore] answer:result received, correct:', r?.correct);
        socketEventBus.emit(SOCKET_EVENTS.ANSWER_RESULT, r);
    });

    // Both canonical names for leaderboard updates
    const handleLeaderboard = (l) => {
        if (import.meta.env.DEV) console.log('[SocketStore] leaderboard update, entries:', Array.isArray(l) ? l.length : '?');
        socketEventBus.emit(SOCKET_EVENTS.LEADERBOARD_UPDATE, l);
    };
    socket.on(SOCKET_EVENTS.LEADERBOARD_UPDATE, handleLeaderboard);   // update_leaderboard
    socket.on('leaderboard:update', handleLeaderboard);                // spec alias

    socket.on(SOCKET_EVENTS.QUIZ_FINISHED, (data) => {
        console.log('[SocketStore] quiz_finished received');
        socketEventBus.emit(SOCKET_EVENTS.QUIZ_FINISHED, data);
    });

    // Host ended quiz gracefully (End Session button)
    socket.on(SOCKET_EVENTS.QUIZ_ENDED_BY_HOST, (data) => {
        console.log('[SocketStore] quiz_ended_by_host received');
        socketEventBus.emit(SOCKET_EVENTS.QUIZ_ENDED_BY_HOST, data);
        socketEventBus.emit(SOCKET_EVENTS.QUIZ_FINISHED, data); // also mark as finished
    });

    // Host force-aborted session
    socket.on(SOCKET_EVENTS.QUIZ_ABORTED, ({ message } = {}) => {
        console.log('[SocketStore] quiz_aborted received');
        socketEventBus.emit(SOCKET_EVENTS.QUIZ_ABORTED, message);
    });

    socket.on(SOCKET_EVENTS.PAUSE_QUIZ, ({ message } = {}) => {
        socketEventBus.emit(SOCKET_EVENTS.PAUSE_QUIZ, message);
    });

    socket.on(SOCKET_EVENTS.RESUME_QUIZ, ({ expiry } = {}) => {
        socketEventBus.emit(SOCKET_EVENTS.RESUME_QUIZ, expiry);
    });

    // Answer stats — server is source of truth
    socket.on(SOCKET_EVENTS.ANSWER_STATS, (stats) => {
        socketEventBus.emit(SOCKET_EVENTS.ANSWER_STATS, stats);
    });

    socket.on(SOCKET_EVENTS.FASTEST_USER, (user) => {
        socketEventBus.emit(SOCKET_EVENTS.FASTEST_USER, user);
    });

    socket.on('answer_result', (r) => {
        socketEventBus.emit(SOCKET_EVENTS.ANSWER_RESULT, r);
    });

    // ── Reconnect: restore full session state after network drop ──────────
    socket.on('rejoin_success', (data) => {
        console.log('[SocketStore] rejoin_success — restoring state, status:', data?.sessionStatus);
        socketEventBus.emit(SOCKET_EVENTS.REJOIN_SUCCESS, data);
    });
};

export const useSocketStore = create((set, get) => ({
    connected: false,
    connectionState: 'disconnected',
    lastError: null,
    joinedRoomCode: null,
    joinedSessionId: null,

    /** Expose raw socket for components that still use useSocketStore().socket */
    get socket() { return getSocket(); },

    /**
     * Connect to the Socket.IO server.
     * Safe to call multiple times — returns existing socket if already connected.
     */
    connectSocket: (token) => {
        const existing = getSocket();
        if (existing) {
            // Re-bind listeners if the socket reconnected with a new id
            bindGlobalListeners(existing, set, get);
            return existing;
        }

        const authToken = token || useAuthStore.getState().token;
        const socket = connectSocket(authToken);
        if (!socket) return null;

        set({ connectionState: 'connecting' });
        bindGlobalListeners(socket, set, get);
        return socket;
    },

    disconnectSocket: () => {
        _listenersBoundToSocketId = null;
        closeSocket();
        set({ connected: false, connectionState: 'disconnected', joinedRoomCode: null });
    },

    /**
     * Join a quiz room.
     * Idempotent — skips the emit if already in the same room.
     */
    joinRoom: (roomCode, sessionId, preferredLanguage) => {
        const code = (roomCode || '').toUpperCase();
        if (!code) return;

        const { joinedRoomCode, joinedSessionId } = get();

        // Prevent redundant joins
        if (joinedRoomCode === code && joinedSessionId === sessionId) {
            console.log('[SocketStore] Already in room, skipping join:', code);
            return;
        }

        set({ joinedRoomCode: code, joinedSessionId: sessionId || null });

        const socket = getSocket();
        if (socket?.connected) {
            console.log('[SocketStore] Emitting join_quiz for room:', code);
            socket.emit(SOCKET_EVENTS.JOIN_QUIZ, { roomCode: code, sessionId, preferredLanguage });
        } else {
            console.warn('[SocketStore] Socket not connected — join will be retried on connect');
        }
    },

    /**
     * Participant: submit an answer.
     */
    submitAnswer: (roomCode, sessionId, questionId, selectedOption) => {
        const socket = getSocket();
        if (!socket?.connected) {
            console.warn('[SocketStore] Cannot submit answer: socket not connected');
            return;
        }

        const payload = {
            sessionCode: roomCode,
            sessionId,
            questionId,
            selectedOption,
            timestamp: Date.now(),
        };

        console.log('[SocketStore] Emitting answer:submit', payload);
        socket.emit('answer:submit', payload);
    },

    /**
     * Host: start a quiz session.
     */
    startQuizBroadcast: (roomCode, sessionId) => {
        const socket = getSocket();
        if (socket?.connected) {
            console.log('[SocketStore] Emitting session:start for', roomCode);
            socket.emit('session:start', { sessionCode: roomCode, sessionId });
        } else {
            console.warn('[SocketStore] Cannot start: socket not connected');
        }
    },

    /**
     * Force a full state reconciliation from the server REST API.
     * Called when a sequence number gap is detected.
     */
    requestStateReconciliation: async () => {
        const { joinedRoomCode } = get();
        const socket = getSocket();
        if (!joinedRoomCode || !socket?.connected) return;

        try {
            const response = await apiClient.get(`/quiz/session/${joinedRoomCode}/state`);
            if (response.data.success) {
                const state = response.data.data;
                socketEventBus.emit(SOCKET_EVENTS.SESSION_STATE, state);
                set({ lastError: null });
            }
        } catch {
            set({ lastError: 'Failed to sync state' });
        }
    },
}));
