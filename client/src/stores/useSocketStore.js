import { create } from 'zustand';
import { io } from 'socket.io-client';
import { getAccessToken, getSocketUrl } from '../services/api';
import { useQuizStore } from './useQuizStore';

export const useSocketStore = create((set, get) => ({
    socket: null,
    connected: false,
    connectionState: 'disconnected',
    lastError: null,
    joinedRoomCode: null,
    joinedSessionId: null,
    lastEventByName: {},

    shouldProcessEvent: (eventName, payload) => {
        const now = Date.now();
        const fingerprint = `${eventName}:${JSON.stringify(payload || {})}`;
        const previous = get().lastEventByName[eventName];

        if (previous && previous.fingerprint === fingerprint && now - previous.timestamp < 250) {
            return false;
        }

        set((state) => ({
            lastEventByName: {
                ...state.lastEventByName,
                [eventName]: { fingerprint, timestamp: now },
            },
        }));

        return true;
    },

    connectSocket: (token) => {
        const existing = get().socket;
        if (existing) return existing;

        const authToken = token || getAccessToken();
        if (!authToken) return null;

        set({ connectionState: 'connecting', lastError: null });

        const socket = io(getSocketUrl(), {
            auth: { token: authToken },
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            withCredentials: true,
            transports: ['websocket'],
            path: '/socket.io',
        });

        socket.on('connect', () => {
            set({ connected: true, connectionState: 'connected', lastError: null });

            const { joinedRoomCode, joinedSessionId } = get();
            if (joinedRoomCode || joinedSessionId) {
                socket.emit('join_room', { roomCode: joinedRoomCode, sessionId: joinedSessionId });
            }
        });
        socket.on('disconnect', () => set({ connected: false, connectionState: 'disconnected' }));
        socket.io.on('reconnect_attempt', () => set({ connectionState: 'reconnecting' }));
        socket.io.on('error', (err) => set({ connectionState: 'disconnected', lastError: err?.message || 'Socket error' }));
        socket.io.on('reconnect_error', (err) => set({ connectionState: 'reconnecting', lastError: err?.message || 'Reconnect failed' }));
        socket.on('connect_error', (err) => {
            set({ connectionState: 'disconnected', lastError: err?.message || 'Connection failed' });
        });

        socket.on('room_state', (state) => {
            if (!get().shouldProcessEvent('room_state', state)) return;
            if (state?.roomCode) {
                useQuizStore.getState().setSessionCode(state.roomCode);
            }
            if (state?.sessionId) {
                useQuizStore.getState().setSessionId(state.sessionId);
            }
            useQuizStore.getState().applyRoomState(state);
        });
        socket.on('answer_stats', (answerStats) => {
            if (!get().shouldProcessEvent('answer_stats', answerStats)) return;
            useQuizStore.getState().setAnswerStats(answerStats);
        });
        socket.on('fastest_user', (fastestUser) => {
            if (!get().shouldProcessEvent('fastest_user', fastestUser)) return;
            useQuizStore.getState().setFastestUser(fastestUser);
        });
        socket.on('participants_update', (participants) => {
            if (!get().shouldProcessEvent('participants_update', participants)) return;
            useQuizStore.getState().setParticipants(participants);
        });
        socket.on('new_question', (question) => {
            if (!get().shouldProcessEvent('new_question', question)) return;
            useQuizStore.getState().applyNewQuestion(question);
        });
        socket.on('timer_tick', (timeLeft) => {
            useQuizStore.getState().setTimeLeft(timeLeft);
        });
        socket.on('answer_result', (result) => {
            useQuizStore.getState().setMyResult(result);
        });
        socket.on('update_leaderboard', (leaderboard) => {
            if (!get().shouldProcessEvent('update_leaderboard', leaderboard)) return;
            useQuizStore.getState().setLeaderboard(leaderboard);
        });
        socket.on('quiz_finished', () => {
            useQuizStore.getState().applyQuizFinished();
        });
        socket.on('quiz_aborted', ({ message }) => {
            useQuizStore.getState().applyQuizAborted(message);
        });
        socket.on('start_quiz', ({ roomCode, sessionId, mode }) => {
            if (roomCode) {
                useQuizStore.getState().setSessionCode(roomCode);
            }
            if (sessionId) {
                useQuizStore.getState().setSessionId(sessionId);
            }
            // Store the authoritative session mode from the server
            if (mode) {
                useQuizStore.getState().setSessionMode(mode);
            }
            useQuizStore.getState().setStatus('live');
            useQuizStore.getState().setView('live');
        });
        socket.on('session_redirect', ({ roomCode, sessionId }) => {
            if (roomCode) {
                set({ joinedRoomCode: roomCode, joinedSessionId: sessionId || null });
                useQuizStore.getState().setSessionCode(roomCode);
                if (sessionId) {
                    useQuizStore.getState().setSessionId(sessionId);
                }
                socket.emit('join_room', { roomCode, sessionId });
            }
        });
        socket.on('quiz_paused', ({ message }) => {
            useQuizStore.getState().applyQuizPaused(message);
        });
        socket.on('quiz_resumed', ({ expiry }) => {
            useQuizStore.getState().applyQuizResumed(expiry);
        });
        socket.on('trigger_next_question', () => {
            const { sessionCode, sessionId } = useQuizStore.getState();
            socket.emit('next_question', { roomCode: sessionCode, sessionId });
        });
        socket.on('error', (err) => {
            useQuizStore.getState().setErrorMessage(err?.message || err);
            set({ lastError: err?.message || err });
        });

        set({ socket });
        return socket;
    },

    disconnectSocket: () => {
        const { socket } = get();
        if (socket) {
            socket.removeAllListeners();
            socket.disconnect();
        }
        set({
            socket: null,
            connected: false,
            connectionState: 'disconnected',
            lastError: null,
            joinedRoomCode: null,
            joinedSessionId: null,
            lastEventByName: {},
        });
    },

    joinRoom: (roomCode, sessionId) => {
        const { socket } = get();
        if (socket && (roomCode || sessionId)) {
            set({ joinedRoomCode: roomCode || null, joinedSessionId: sessionId || null });
            socket.emit('join_room', { roomCode, sessionId });
        }
    },

    startQuizBroadcast: (roomCode, sessionId) => {
        const { socket } = get();
        if (socket && roomCode) {
            socket.emit('start_quiz', { roomCode, sessionId });
        }
    },

    submitAnswer: (roomCode, sessionId, questionId, selectedOption) => {
        const { socket } = get();
        if (socket && (roomCode || sessionId) && questionId) {
            socket.emit('submit_answer', { roomCode, sessionId, questionId, selectedOption });
        }
    },

    reconnectSocket: (token) => {
        get().disconnectSocket();
        return get().connectSocket(token);
    },

    triggerNextQuestion: (sessionId) => {
        const { socket } = get();
        if (socket && sessionId) {
            socket.emit('next_question', { sessionId });
        }
    },

}));
