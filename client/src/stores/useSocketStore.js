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

        const authToken = token || getAccessToken();
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
                // Decompress the message
                const { event, data, metadata } = payload;
                
                console.debug('[Socket] Received compressed message', {
                    event,
                    originalSize: metadata?.originalSize,
                    compressedSize: metadata?.compressedSize,
                });

                // Decompress using pako or similar (client-side decompression)
                // For now, we'll assume the server sends base64-encoded gzipped data
                // In a real implementation, you'd use pako.inflate or similar
                
                // Emit the decompressed data to the appropriate handler
                socket.emit(event, data);
            } catch (error) {
                console.error('[Socket] Failed to decompress message', error);
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
        socket.on('participants_update', (participants) => {
            if (!get().shouldProcessEvent('participants_update', participants)) return;
            useQuizStore.getState().setParticipants(participants);
        });
        socket.on('new_question', (question) => {
            if (!get().shouldProcessEvent('new_question', question)) return;
            if (!get().checkSequenceNumber(question)) return; // Check sequence number
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
        socket.on('quiz_finished', (payload) => {
            if (!get().checkSequenceNumber(payload)) return; // Check sequence number
            useQuizStore.getState().applyQuizFinished();
        });
        socket.on('quiz_ended_by_host', () => {
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
        socket.on('quiz_paused', (payload) => {
            if (!get().checkSequenceNumber(payload)) return; // Check sequence number
            useQuizStore.getState().applyQuizPaused(payload?.message);
        });
        socket.on('quiz_resumed', (payload) => {
            if (!get().checkSequenceNumber(payload)) return; // Check sequence number
            useQuizStore.getState().applyQuizResumed(payload?.expiry);
        });
        socket.on('trigger_next_question', () => {
            const { sessionCode, sessionId } = useQuizStore.getState();
            socket.emit('next_question', { roomCode: sessionCode, sessionId });
        });
        socket.on('error', (err) => {
            useQuizStore.getState().setErrorMessage(err?.message || err);
            set({ lastError: err?.message || err });
        });

        // ── Spec-compliant event handlers ─────────────────────────────────────
        // These mirror the event names defined in the real-time session spec.
        // Legacy events above are kept for backward compatibility.

        socket.on('session:start', ({ sessionCode, sessionId, mode } = {}) => {
            if (sessionCode) useQuizStore.getState().setSessionCode(sessionCode);
            if (sessionId) useQuizStore.getState().setSessionId(sessionId);
            if (mode) useQuizStore.getState().setSessionMode(mode);
            useQuizStore.getState().setStatus('live');
            useQuizStore.getState().setView('live');
        });

        socket.on('session:state', (snapshot = {}) => {
            if (!get().shouldProcessEvent('session:state', snapshot)) return;
            const quizStore = useQuizStore.getState();
            if (snapshot.sessionCode) quizStore.setSessionCode(snapshot.sessionCode);
            if (snapshot.mode) quizStore.setSessionMode(snapshot.mode);
            if (Array.isArray(snapshot.participants)) quizStore.setParticipants(snapshot.participants);
            if (snapshot.isPaused !== undefined) quizStore.setIsPaused(snapshot.isPaused);
        });

        socket.on('session:updateParticipants', ({ participants, count } = {}) => {
            if (!get().shouldProcessEvent('session:updateParticipants', { count })) return;
            if (Array.isArray(participants)) {
                useQuizStore.getState().setParticipants(participants);
            }
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
            lastSequenceNumber: 0, // Reset sequence number on disconnect
            missedUpdateDetected: false,
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
