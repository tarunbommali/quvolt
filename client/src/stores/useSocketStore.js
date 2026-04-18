import { create } from 'zustand';
import { io } from 'socket.io-client';
import { getAccessToken, getSocketUrl } from '../services/api';
import { useQuizStore } from './useQuizStore';
import { useAuthStore } from './useAuthStore';

export const useSocketStore = create((set, get) => ({
    socket: null,
    connected: false,
    connectionState: 'disconnected',
    lastError: null,
    joinedRoomCode: null,
    joinedSessionId: null,
    lastEventByName: {},
    lastSequenceNumber: 0, // Track last received sequence number
    missedUpdateDetected: false, // Flag for missed updates

    shouldProcessEvent: (eventName, payload) => {
        // ALWAYS process mission-critical state updates to avoid sync holes
        if (['participants_update', 'room_state', 'new_question'].includes(eventName)) {
            return true;
        }

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

    checkSequenceNumber: (payload) => {
        if (!payload || typeof payload.sequenceNumber !== 'number') {
            return true; // No sequence number, process normally
        }

        const { lastSequenceNumber } = get();
        const receivedSeq = payload.sequenceNumber;

        // First message or sequence is continuous
        if (lastSequenceNumber === 0 || receivedSeq === lastSequenceNumber + 1) {
            set({ lastSequenceNumber: receivedSeq, missedUpdateDetected: false });
            return true;
        }

        // Sequence gap detected - missed updates!
        if (receivedSeq > lastSequenceNumber + 1) {
            console.warn('[Socket] Sequence gap detected', {
                expected: lastSequenceNumber + 1,
                received: receivedSeq,
                gap: receivedSeq - lastSequenceNumber - 1,
            });
            set({ lastSequenceNumber: receivedSeq, missedUpdateDetected: true });
            
            // Request state reconciliation
            get().requestStateReconciliation();
            return true; // Still process the message
        }

        // Old/duplicate message
        if (receivedSeq <= lastSequenceNumber) {
            console.debug('[Socket] Ignoring old/duplicate message', {
                current: lastSequenceNumber,
                received: receivedSeq,
            });
            return false;
        }

        return true;
    },

    requestStateReconciliation: async () => {
        const { joinedRoomCode, socket } = get();
        // No room joined yet — nothing to reconcile, exit silently
        if (!joinedRoomCode || !socket?.connected) {
            return;
        }

        console.log('[Socket] Requesting state reconciliation for', joinedRoomCode);

        try {
            // Import api dynamically to avoid circular dependency
            const { default: api } = await import('../services/api');
            const response = await api.get(`/quiz/session/${joinedRoomCode}/state`);
            
            if (response.data.success) {
                const state = response.data.data;
                console.log('[Socket] State reconciliation successful', {
                    sequenceNumber: state.sequenceNumber,
                    status: state.status,
                });

                // Apply reconciled state
                const quizStore = useQuizStore.getState();
                
                if (state.currentQuestion) {
                    quizStore.applyNewQuestion(state.currentQuestion);
                }
                
                if (state.leaderboard) {
                    quizStore.setLeaderboard(state.leaderboard);
                }
                
                if (state.participants) {
                    quizStore.setParticipants(state.participants);
                }
                
                if (state.answerStats) {
                    quizStore.setAnswerStats(state.answerStats);
                }
                
                if (state.isPaused !== undefined) {
                    quizStore.setIsPaused(state.isPaused);
                }

                // Update sequence number and clear any lingering error
                set({ 
                    lastSequenceNumber: state.sequenceNumber,
                    missedUpdateDetected: false,
                    lastError: null,
                });
            }
        } catch (error) {
            console.error('[Socket] State reconciliation failed', error);
            set({ lastError: 'Failed to sync state' });
        }
    },

    connectSocket: (token) => {
        const existing = get().socket;
        if (existing) return existing;

        const authToken = token || useAuthStore.getState().token || getAccessToken();
        if (!authToken) return null;

        set({ connectionState: 'connecting', lastError: null });

        const socket = io(getSocketUrl(), {
            auth: { token: authToken },
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            withCredentials: true,
            path: '/socket.io',
        });

        // Set socket immediately so subsequent calls to joinRoom etc. can use it or see joinedRoomCode
        set({ socket });

        socket.on('connect', () => {
            console.log('[Socket] Connected to server');
            // Clear any previous error on successful (re)connect
            set({ connected: true, connectionState: 'connected', lastError: null });

            const { joinedRoomCode, joinedSessionId } = get();
            if (joinedRoomCode || joinedSessionId) {
                socket.emit('join_room', { roomCode: joinedRoomCode, sessionId: joinedSessionId });
                
                // Request state reconciliation after reconnection to ensure we're in sync
                setTimeout(() => {
                    get().requestStateReconciliation();
                }, 500);
            }
        });
        
        // Handle compressed messages
        socket.on('compressed_message', async (payload) => {
            try {
                const { event, data, metadata } = payload;
                
                console.debug('[Socket] Received compressed message', {
                    event,
                    originalSize: metadata?.originalSize,
                    compressedSize: metadata?.compressedSize,
                });

                // In a real browser environment, we might use pako or similar.
                // For now, if it's base64 encoded and we don't have pako,
                // we'll assume it's just serialized data OR we need to warn.
                // However, we MUST NOT use socket.emit() as it sends to the server.
                
                // To trigger LOCAL listeners, we use the internal event emitter if available,
                // or we manually find the specific handler.
                // Socket.io client exposes 'on' listeners.
                
                const listeners = socket._callbacks?.[`$${event}`] || [];
                if (listeners.length > 0) {
                    listeners.forEach(handler => handler(data));
                } else {
                    // Fallback: manually trigger known store updates for critical events
                    if (event === 'new_question') {
                        useQuizStore.getState().applyNewQuestion(data);
                    } else if (event === 'participants:update' || event === 'participants_update') {
                        const participants = Array.isArray(data) ? data : data?.participants;
                        if (participants) useQuizStore.getState().setParticipants(participants);
                    } else if (event === 'room_state') {
                        useQuizStore.getState().applyRoomState(data);
                    } else if (event === 'update_leaderboard') {
                        useQuizStore.getState().setLeaderboard(data);
                    }
                }
            } catch (error) {
                console.error('[Socket] Failed to process compressed message', error);
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
            if (!get().checkSequenceNumber(state)) return; // Check sequence number
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
            if (!get().checkSequenceNumber(answerStats)) return; // Check sequence number
            useQuizStore.getState().setAnswerStats(answerStats);
        });
        socket.on('fastest_user', (fastestUser) => {
            if (!get().shouldProcessEvent('fastest_user', fastestUser)) return;
            if (!get().checkSequenceNumber(fastestUser)) return; // Check sequence number
            useQuizStore.getState().setFastestUser(fastestUser);
        });
        socket.on('session:state', (snapshot = {}) => {
            if (!get().shouldProcessEvent('session:state', snapshot)) return;
            const quizStore = useQuizStore.getState();
            
            if (snapshot.sessionCode) quizStore.setSessionCode(snapshot.sessionCode);
            if (snapshot.mode) quizStore.setSessionMode(snapshot.mode);
            if (snapshot.status) quizStore.setStatus(snapshot.status);
            if (snapshot.isPaused !== undefined) quizStore.setIsPaused(snapshot.isPaused);
            if (Array.isArray(snapshot.participants)) quizStore.setParticipants(snapshot.participants);
            
            if (snapshot.currentQuestion) {
                quizStore.applyNewQuestion(snapshot.currentQuestion);
            }
            
            if (snapshot.status === 'live' || snapshot.status === 'playing') {
                quizStore.setView('live');
            }
        });

        socket.on('session:start', async ({ sessionCode, sessionId, mode } = {}) => {
            const quizStore = useQuizStore.getState();
            if (sessionCode) quizStore.setSessionCode(sessionCode);
            if (sessionId) quizStore.setSessionId(sessionId);
            if (mode) quizStore.setSessionMode(mode);
            
            quizStore.setStatus('live');
            quizStore.setView('live');

            setTimeout(() => {
                get().requestStateReconciliation();
            }, 800);
        });

        socket.on('participants:update', (payload) => {
            const participants = Array.isArray(payload) ? payload : payload?.participants;
            if (participants) useQuizStore.getState().setParticipants(participants);
        });

        socket.on('participants_update', (payload) => {
            const participants = Array.isArray(payload) ? payload : payload?.participants;
            if (participants) useQuizStore.getState().setParticipants(participants);
        });

        socket.on('session:updateParticipants', (payload) => {
            const participants = Array.isArray(payload) ? payload : payload?.participants;
            if (participants) useQuizStore.getState().setParticipants(participants);
        });

        socket.on('new_question', (question) => {
            if (!get().shouldProcessEvent('new_question', question)) return;
            if (!get().checkSequenceNumber(question)) return; 
            useQuizStore.getState().applyNewQuestion(question);
        });

        socket.on('question:update', (question) => {
            if (!get().shouldProcessEvent('question:update', question)) return;
            useQuizStore.getState().applyNewQuestion(question);
        });

        socket.on('timer:tick', ({ timeLeft }) => {
            useQuizStore.getState().setTimeLeft(timeLeft);
        });

        socket.on('timer_tick', (timeLeft) => {
            useQuizStore.getState().setTimeLeft(timeLeft);
        });

        socket.on('answer:result', (result) => useQuizStore.getState().setMyResult(result));
        
        socket.on('update_leaderboard', (leaderboard) => {
            if (!get().shouldProcessEvent('update_leaderboard', leaderboard)) return;
            useQuizStore.getState().setLeaderboard(leaderboard);
        });

        socket.on('quiz_paused', (payload) => {
            if (!get().checkSequenceNumber(payload)) return;
            useQuizStore.getState().applyQuizPaused(payload?.message);
        });

        socket.on('quiz_resumed', (payload) => {
            if (!get().checkSequenceNumber(payload)) return;
            useQuizStore.getState().applyQuizResumed(payload?.expiry);
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

        socket.on('error', (err) => {
            useQuizStore.getState().setErrorMessage(err?.message || err);
            set({ lastError: err?.message || err });
        });

        socket.on('session:modeChanged', ({ mode } = {}) => {
            if (mode) useQuizStore.getState().setSessionMode(mode);
        });

        socket.on('session:error', ({ message } = {}) => {
            useQuizStore.getState().setErrorMessage(message || 'Session error');
            set({ lastError: message || 'Session error' });
        });

        socket.on('question:update', (question) => {
            if (!get().shouldProcessEvent('question:update', question)) return;
            useQuizStore.getState().applyNewQuestion(question);
        });

        // answer:result — spec shape: { correct, correctOption, timeTaken, score, totalScore, streak }
        socket.on('answer:result', (result = {}) => {
            // Normalize to the internal myResult shape
            useQuizStore.getState().setMyResult({
                isCorrect: result.correct,
                correctAnswer: result.correctOption,
                timeTaken: result.timeTaken,
                score: result.score,
                totalScore: result.totalScore,
                streak: result.streak,
                bestStreak: result.bestStreak,
                ignored: result.ignored || false,
            });
        });

        // Server-driven timer events — clients ONLY display, never control
        socket.on('timer:start', ({ duration, expiry } = {}) => {
            const quizStore = useQuizStore.getState();
            if (expiry) quizStore.setExpiry(expiry);
            if (duration) quizStore.setTimeLeft(duration);
        });

        socket.on('timer:update', ({ timeLeft, expiry } = {}) => {
            const quizStore = useQuizStore.getState();
            if (expiry) quizStore.setExpiry(expiry);
            if (timeLeft !== undefined) quizStore.setTimeLeft(timeLeft);
        });

        socket.on('timer:end', () => {
            useQuizStore.getState().setTimeLeft(0);
        });

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
            lastSequenceNumber: 0, // Reset sequence number on disconnect
            missedUpdateDetected: false,
        });
    },

    joinRoom: (roomCode, sessionId) => {
        const code = roomCode ? String(roomCode).toUpperCase() : null;
        const sid = sessionId || null;
        
        // Always persist target room to store so on('connect') can pick it up
        set({ joinedRoomCode: code, joinedSessionId: sid });

        const { socket } = get();
        // Use socket.connected check because emit() on disconnected socket might just buffer or drop depending on config
        if (socket && socket.connected && (code || sid)) {
            console.log('[Socket] Emitting join_room now', { code, sid });
            socket.emit('join_room', { roomCode: code, sessionId: sid });
        } else if (socket) {
            console.log('[Socket] Socket present but not connected yet, join_room will fire on connect', { code, sid });
        } else {
            console.warn('[Socket] joinRoom called but socket is null — call connectSocket() first');
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

    requestStateReconciliation: () => {
        const { socket, joinedRoomCode } = get();
        const code = joinedRoomCode || useQuizStore.getState().sessionCode;
        if (socket && code) {
            socket.emit('session:syncState', { sessionCode: code });
        }
    },

    triggerNextQuestion: (sessionId) => {
        const { socket } = get();
        if (socket && sessionId) {
            socket.emit('next_question', { sessionId });
        }
    },

}));
