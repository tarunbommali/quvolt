import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { socketEventBus } from '../../sockets/socketEventBus';
import { SOCKET_EVENTS } from '../../sockets/socketEvents';
import { useQuizUIStore } from './useQuizUIStore';

// ── Module-scoped timer (Fix 1: no window.* collision) ───────────────────────
// A single interval per browser tab, safely scoped to this ES module.
// Multiple tabs each have their own module instance → no collision.
let _questionTimerInterval = null;

const clearQuestionTimer = () => {
    if (_questionTimerInterval !== null) {
        clearInterval(_questionTimerInterval);
        _questionTimerInterval = null;
    }
};

const startQuestionTimer = (expiry) => {
    clearQuestionTimer();
    if (!expiry) return;
    _questionTimerInterval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
        useQuizRealtimeStore.getState().setTimeLeft(remaining);
        if (remaining <= 0) clearQuestionTimer();
    }, 500);
};

// ── Clock drift correction (Fix 2) ───────────────────────────────────────────
// Returns the server-adjusted expiry based on client/server clock offset.
// serverTime is the server's Date.now() at the moment of emission.
const adjustExpiry = (expiry, serverTime) => {
    if (!expiry) return null;
    if (!serverTime) return expiry;
    // drift > 0: client clock is ahead of server → subtract from expiry
    // drift < 0: client clock is behind server → add to expiry
    const drift = Date.now() - serverTime;
    return expiry - drift;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const normalizeParticipants = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.participants)) return payload.participants;
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
};

const normalizeLeaderboard = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.leaderboard)) return payload.leaderboard;
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
};

const hasRenderableQuestionPayload = (question) => {
    if (!question || typeof question !== 'object') return false;
    const hasText      = typeof question.text === 'string' && question.text.trim().length > 0;
    const hasOptions   = Array.isArray(question.options) && question.options.length > 0;
    const hasTimeLimit = Number.isFinite(Number(question.timeLimit)) && Number(question.timeLimit) > 0;
    const hasIndex     = Number.isFinite(Number(question.index));
    const hasTotal     = Number.isFinite(Number(question.total)) && Number(question.total) > 0;
    return hasText && hasOptions && hasTimeLimit && hasIndex && hasTotal;
};

// ── Initial State ─────────────────────────────────────────────────────────────
const initialState = {
    status:      'waiting',
    mode:        'waiting',
    sessionMode: null,       // 'auto' | 'tutor'
    currentQuestion:      null,
    participants:         [],
    answerStats:          null,
    fastestUser:          null,
    answers:              {},
    timer:                0,
    timeLeft:             0,
    leaderboard:          [],
    myResult:             null,
    expiry:               null,
    quizTitle:            '',
    errorMessage:         null,
    abortMessage:         null,
    sessionCode:          null,
    sessionId:            null,
    isPaused:             false,
    // Fix 4: sequence guard — reject events with seq ≤ lastSeq
    _lastSequenceNumber:  0,
};

// ── Store ─────────────────────────────────────────────────────────────────────
export const useQuizRealtimeStore = create()(devtools((set, get) => ({
    ...initialState,

    // ── Basic setters ───────────────────────────────────────────────────────
    setSessionMode:  (sessionMode)  => set({ sessionMode }),
    setStatus:       (status)       => set({ status }),
    setCurrentQuestion: (q)         => set({ currentQuestion: q }),
    setParticipants: (participants) => set({ participants: normalizeParticipants(participants) }),
    setAnswerStats:  (answerStats)  => set({ answerStats: answerStats || null }),
    setFastestUser:  (fastestUser)  => set({ fastestUser: fastestUser || null }),
    setAnswers:      (answers)      => set({ answers: answers || {} }),
    setTimeLeft:     (timeLeft)     => set({ timeLeft, timer: timeLeft }),
    setLeaderboard:  (leaderboard)  => set({ leaderboard: normalizeLeaderboard(leaderboard) }),
    setMyResult:     (myResult)     => set({ myResult }),
    setExpiry:       (expiry)       => set({ expiry }),
    setIsPaused:     (isPaused)     => set({ isPaused }),
    setSessionId:    (sessionId)    => set({ sessionId }),
    setSessionCode:  (sessionCode)  => set({ sessionCode }),
    setQuizTitle:    (quizTitle)    => set({ quizTitle: quizTitle || '' }),
    setErrorMessage: (errorMessage) => set({ errorMessage }),
    setAbortMessage: (abortMessage) => set({ abortMessage }),

    // ── Sequence guard (Fix 4) ──────────────────────────────────────────────
    // Returns true if we should accept this event, false if stale.
    _acceptSequence: (incoming) => {
        if (typeof incoming?.sequenceNumber !== 'number') return true; // no seq → always accept
        if (incoming.sequenceNumber <= get()._lastSequenceNumber) {
            if (import.meta.env.DEV) {
                console.warn('[RealtimeStore] Stale event dropped, seq:', incoming.sequenceNumber, '≤', get()._lastSequenceNumber);
            }
            return false;
        }
        set({ _lastSequenceNumber: incoming.sequenceNumber });
        return true;
    },

    // ── Room state (applied on join / sync) ─────────────────────────────────
    applyRoomState: (state) => {
        const clientStatus = state?.status || get().status;

        const updates = {
            status: clientStatus === 'completed' ? 'finished' : clientStatus,
        };
        const hasQuestionPayload = hasRenderableQuestionPayload(state?.currentQuestion);

        if (state?.title)                    updates.quizTitle    = state.title;
        if (Array.isArray(state?.leaderboard)) updates.leaderboard = state.leaderboard;
        if (state?.participants)             updates.participants  = normalizeParticipants(state.participants);
        if (state?.answerStats)              updates.answerStats   = state.answerStats;
        if (state?.fastestUser !== undefined) updates.fastestUser  = state.fastestUser;

        if (hasQuestionPayload) {
            // Prefer server expiry from snapshot; apply drift correction if serverTime present
            const snapExpiry = adjustExpiry(
                state.expiry ?? state.currentQuestion?.expiry,
                state.serverTime
            );

            updates.currentQuestion = state.currentQuestion;
            updates.expiry    = snapExpiry ?? get().expiry;
            updates.timeLeft  = snapExpiry ? Math.max(0, Math.floor((snapExpiry - Date.now()) / 1000)) : (state.timeLeft ?? get().timeLeft);
            updates.timer     = updates.timeLeft;
            updates.status    = 'playing';
            updates.mode      = 'playing';

            if (!updates.answerStats) {
                const optionCounts = {};
                for (const opt of state.currentQuestion.options || []) optionCounts[opt] = 0;
                updates.answerStats = {
                    questionId:   state.currentQuestion._id || null,
                    optionCounts,
                    totalAnswers: 0,
                    fastestUser:  null,
                };
            }

            // Start local countdown from drift-corrected expiry (late-join safety net)
            if (snapExpiry) startQuestionTimer(snapExpiry);
        }

        if (state?.sessionId !== undefined) updates.sessionId = state.sessionId;
        if (state?.isPaused  !== undefined) updates.isPaused  = state.isPaused;
        set(updates);
    },

    // ── Full new question (fresh question — resets selection & myResult) ─────
    applyNewQuestion: (question) => {
        if (!get()._acceptSequence(question)) return;

        if (import.meta.env.DEV) {
            console.log('[RealtimeStore] NEW_QUESTION', question?.index, '/', question?.total, question?.text?.substring(0, 40));
        }

        // Reset MCQ selection state in UI store
        useQuizUIStore.getState().setSelectedOption(null);

        // Drift-corrected expiry (Fix 2)
        const expiry   = adjustExpiry(question?.expiry, question?.serverTime);
        const timeLeft = expiry
            ? Math.max(0, Math.floor((expiry - Date.now()) / 1000))
            : (question?.timeLimit || 0);

        const normalizedQuestion = {
            ...question,
            text:    question?.text    || 'Untitled Question',
            options: Array.isArray(question?.options) ? question.options : [],
            total:   Number(question?.total || 0),
        };

        set({
            currentQuestion:     normalizedQuestion,
            timeLeft,
            timer:               timeLeft,
            expiry,
            currentQuestionIndex: Number(question?.index || 0),
            answerStats: {
                questionId:   question?._id || null,
                optionCounts: Object.fromEntries(normalizedQuestion.options.map((o) => [o, 0])),
                totalAnswers: 0,
                fastestUser:  null,
            },
            fastestUser: null,
            myResult:    null,
            status:      'playing',
            mode:        'playing',
        });

        // Module-scoped local countdown (Fix 1)
        startQuestionTimer(expiry);
    },

    // ── Sync (Fix 3): safe re-sync — preserves selection & result ───────────
    // Triggered by 'question:sync' which republishCurrentQuestion emits.
    applyQuestionSync: (question) => {
        if (!get()._acceptSequence(question)) return;

        // Drift-corrected expiry
        const expiry = adjustExpiry(question?.expiry, question?.serverTime);

        if (import.meta.env.DEV) {
            console.log('[RealtimeStore] QUESTION_SYNC (no UI reset), expiry in',
                expiry ? Math.round((expiry - Date.now()) / 1000) + 's' : 'n/a');
        }

        const updates = { expiry };
        if (expiry) {
            updates.timeLeft = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
            updates.timer    = updates.timeLeft;
            // Restart local countdown with corrected expiry (no selected-option reset)
            startQuestionTimer(expiry);
        }

        // Update question fields only if we don't yet have a question rendered
        if (!get().currentQuestion && hasRenderableQuestionPayload(question)) {
            const normalizedQuestion = {
                ...question,
                text:    question?.text    || 'Untitled Question',
                options: Array.isArray(question?.options) ? question.options : [],
                total:   Number(question?.total || 0),
            };
            updates.currentQuestion     = normalizedQuestion;
            updates.status              = 'playing';
            updates.mode                = 'playing';
            updates.currentQuestionIndex = Number(question?.index || 0);
        }

        set(updates);
    },

    // ── Quiz finished ────────────────────────────────────────────────────────
    applyQuizFinished: (data) => {
        clearQuestionTimer(); // Fix 1: always clean up
        const updates = { status: 'finished', mode: 'finished' };
        if (Array.isArray(data?.leaderboard)) updates.leaderboard = data.leaderboard;
        if (Array.isArray(data?.topWinners))  updates.leaderboard = data.topWinners;
        set(updates);
    },

    applyQuizPaused:  (message) => set({ isPaused: true, errorMessage: message }),

    applyQuizResumed: (expiry)  => set({ isPaused: false, expiry: expiry || get().expiry }),

    // ── Abort ────────────────────────────────────────────────────────────────
    applyQuizAborted: (message = 'Admin aborted the quiz.') => {
        clearQuestionTimer();
        set({ ...initialState, errorMessage: message, abortMessage: message });
    },

    // ── Full reset ───────────────────────────────────────────────────────────
    resetRealtimeState: () => {
        clearQuestionTimer();
        set(initialState);
    },
}), { name: 'quizRealtimeStore' }));

// ── Socket Event Subscriptions ────────────────────────────────────────────────
// These listeners bind the decoupled socket event bus to the domain store.

socketEventBus.on(SOCKET_EVENTS.JOIN_SUCCESS, (data) => {
    if (data.roomCode) useQuizRealtimeStore.getState().setSessionCode(data.roomCode);
});

socketEventBus.on(SOCKET_EVENTS.JOIN_ERROR, (data) => {
    useQuizRealtimeStore.getState().setErrorMessage(data.message || 'Access denied');
});

socketEventBus.on(SOCKET_EVENTS.PARTICIPANTS_UPDATE, (payload) => {
    if (import.meta.env.DEV) console.log('[RealtimeStore] PARTICIPANTS_UPDATE count:', Array.isArray(payload) ? payload.length : (payload?.participants?.length ?? '?'));
    useQuizRealtimeStore.getState().setParticipants(payload);
});

socketEventBus.on(SOCKET_EVENTS.ROOM_STATE, (state) => {
    if (state?.roomCode) useQuizRealtimeStore.getState().setSessionCode(state.roomCode);
    useQuizRealtimeStore.getState().applyRoomState(state);
});

socketEventBus.on(SOCKET_EVENTS.SESSION_STATE, (state) => {
    if (state?.sessionCode) useQuizRealtimeStore.getState().setSessionCode(state.sessionCode);
    useQuizRealtimeStore.getState().applyRoomState(state);
});

socketEventBus.on(SOCKET_EVENTS.SESSION_REDIRECT, ({ roomCode }) => {
    useQuizRealtimeStore.getState().setSessionCode(roomCode);
});

socketEventBus.on(SOCKET_EVENTS.SESSION_START, () => {
    useQuizRealtimeStore.getState().setStatus('live');
});

// Full new question (resets UI)
socketEventBus.on(SOCKET_EVENTS.NEW_QUESTION, (q) => {
    useQuizRealtimeStore.getState().applyNewQuestion(q);
});

// Question sync (no UI reset — preserves selection/result)
socketEventBus.on(SOCKET_EVENTS.QUESTION_SYNC, (q) => {
    useQuizRealtimeStore.getState().applyQuestionSync(q);
});

// ── Timer events (drift-corrected) ────────────────────────────────────────────
socketEventBus.on(SOCKET_EVENTS.TIMER_START, ({ duration, expiry, serverTime } = {}) => {
    // Fix 2: apply drift correction so all clients share the same reference time
    const correctedExpiry = adjustExpiry(expiry, serverTime)
        ?? (Date.now() + (duration || 0) * 1000);
    const timeLeft = Math.max(0, Math.floor((correctedExpiry - Date.now()) / 1000));

    if (import.meta.env.DEV) {
        const rawDrift = serverTime ? Date.now() - serverTime : 0;
        console.log('[RealtimeStore] TIMER_START — corrected expiry in', timeLeft, 's | raw drift:', rawDrift, 'ms');
    }

    const store = useQuizRealtimeStore.getState();
    store.setExpiry(correctedExpiry);
    store.setTimeLeft(timeLeft);
    // Restart local countdown with drift-corrected expiry
    startQuestionTimer(correctedExpiry);
});

socketEventBus.on(SOCKET_EVENTS.TIMER_UPDATE, ({ timeLeft, expiry, serverTime } = {}) => {
    const store = useQuizRealtimeStore.getState();
    const correctedExpiry = adjustExpiry(expiry, serverTime);
    if (correctedExpiry) {
        store.setTimeLeft(Math.max(0, Math.floor((correctedExpiry - Date.now()) / 1000)));
    } else if (timeLeft !== undefined) {
        store.setTimeLeft(timeLeft);
    }
});

socketEventBus.on(SOCKET_EVENTS.TIMER_TICK, ({ timeLeft, expiry, serverTime } = {}) => {
    const store = useQuizRealtimeStore.getState();
    const correctedExpiry = adjustExpiry(expiry, serverTime);
    if (correctedExpiry) {
        store.setTimeLeft(Math.max(0, Math.floor((correctedExpiry - Date.now()) / 1000)));
    } else if (timeLeft !== undefined) {
        store.setTimeLeft(timeLeft);
    }
});

// ── Answer / Leaderboard ──────────────────────────────────────────────────────
socketEventBus.on(SOCKET_EVENTS.ANSWER_RESULT, (r) => {
    useQuizRealtimeStore.getState().setMyResult(r);
});

socketEventBus.on(SOCKET_EVENTS.LEADERBOARD_UPDATE, (l) => {
    if (import.meta.env.DEV) console.log('[RealtimeStore] LEADERBOARD_UPDATE entries:', Array.isArray(l) ? l.length : '?');
    useQuizRealtimeStore.getState().setLeaderboard(Array.isArray(l) ? l : (l?.leaderboard || []));
});

socketEventBus.on(SOCKET_EVENTS.ANSWER_STATS, (stats) => {
    useQuizRealtimeStore.getState().setAnswerStats(stats);
});

socketEventBus.on(SOCKET_EVENTS.FASTEST_USER, (user) => {
    useQuizRealtimeStore.getState().setFastestUser(user);
});

// ── Quiz lifecycle ────────────────────────────────────────────────────────────
socketEventBus.on(SOCKET_EVENTS.QUIZ_FINISHED, (data) => {
    useQuizRealtimeStore.getState().applyQuizFinished(data);
});

socketEventBus.on(SOCKET_EVENTS.QUIZ_ENDED_BY_HOST, (data) => {
    if (import.meta.env.DEV) console.log('[RealtimeStore] QUIZ_ENDED_BY_HOST');
    useQuizRealtimeStore.getState().applyQuizFinished(data);
});

socketEventBus.on(SOCKET_EVENTS.QUIZ_ABORTED, (message) => {
    if (import.meta.env.DEV) console.log('[RealtimeStore] QUIZ_ABORTED');
    useQuizRealtimeStore.getState().applyQuizAborted(message);
});

socketEventBus.on(SOCKET_EVENTS.PAUSE_QUIZ, (message) => {
    useQuizRealtimeStore.getState().applyQuizPaused(message);
});

socketEventBus.on(SOCKET_EVENTS.RESUME_QUIZ, (expiry) => {
    useQuizRealtimeStore.getState().applyQuizResumed(expiry);
});

// ── Rejoin ────────────────────────────────────────────────────────────────────
socketEventBus.on(SOCKET_EVENTS.REJOIN_SUCCESS, (data) => {
    const store = useQuizRealtimeStore.getState();
    if (data.sessionStatus) store.setStatus(data.sessionStatus);
    if (data.currentQuestion) {
        // Use applyNewQuestion — it will start the timer and reset UI
        store.applyNewQuestion(data.currentQuestion);
    }
    if (data.userStats)   store.setLeaderboard(data.userStats ? [data.userStats] : []);
    if (data.sessionCode) store.setSessionCode(data.sessionCode);
    if (data.isPaused !== undefined) store.setIsPaused(data.isPaused);
});
