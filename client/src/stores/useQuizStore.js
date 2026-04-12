import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
    getMyProfile,
    getMyQuizzes,
    getOrganizerHistory,
    getQuizByCode,
    getQuizLeaderboard,
    getSubjectLeaderboard,
    getUserHistory,
} from '../services/api';
import { useAuthStore } from './useAuthStore';

const CACHE_TTL_MS = {
    quizzes: 5 * 60 * 1000,
    history: 3 * 60 * 1000,
    quizByCode: 2 * 60 * 1000,
    leaderboard: 30 * 1000,
    subjectLeaderboard: 60 * 1000,
    profile: 10 * 60 * 1000,
};

const TRANSIENT_KEYS = [
    'quizzesCache',
    'historyCache',
    'quizByCodeCache',
    'quizLeaderboardCache',
    'subjectLeaderboardCache',
    'profileCache',
];

const inflightQuizzes = {};
const inflightHistory = {};
const inflightQuizByCode = {};
const inflightQuizLeaderboard = {};
const inflightSubjectLeaderboard = {};
const inflightProfile = {};

const readCache = (cacheMap, key, ttl, force = false) => {
    if (force) return null;
    const entry = cacheMap[key];
    if (!entry) return null;

    if (Date.now() - entry.timestamp > ttl) {
        return null;
    }

    return entry.value;
};

const setCache = (cacheMap, key, value) => ({
    ...cacheMap,
    [key]: { value, timestamp: Date.now() },
});

const createEmptyRealtimeState = () => ({
    status: 'waiting',
    mode: 'waiting',
    currentQuestion: null,
    participants: [],
    answerStats: null,
    fastestUser: null,
    answers: {},
    timer: 0,
    timeLeft: 0,
    leaderboard: [],
    myResult: null,
    expiry: null,
    quizTitle: '',
    selectedOption: null,
    errorMessage: null,
    abortMessage: null,
    view: 'loading',
    activeQuiz: null,
    sessionCode: null,
    sessionId: null,
    isPaused: false,
});

const normalizeParticipants = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.participants)) return payload.participants;
    return [];
};

const hasRenderableQuestionPayload = (question) => {
    if (!question || typeof question !== 'object') return false;
    const hasId = Boolean(question._id);
    const hasText = typeof question.text === 'string' && question.text.trim().length > 0;
    const hasOptions = Array.isArray(question.options) && question.options.length > 0;
    return (hasId || hasText) && hasOptions;
};

export const useQuizStore = create()(devtools((set, get) => ({
    ...createEmptyRealtimeState(),

    quizzesCache: {},
    historyCache: {},
    quizByCodeCache: {},
    quizLeaderboardCache: {},
    subjectLeaderboardCache: {},
    profileCache: {},
    // inflight moved to module-level

    clearUserData: () => {
        // Clear all API cache maps
        set(Object.fromEntries(TRANSIENT_KEYS.map((key) => [key, {}])));
        // Also reset real-time quiz state â€” prevents stale state leaking
        // to the next user who logs in on the same device.
        set(createEmptyRealtimeState());
    },

    connectSocket: () => {
        // Obsolete, handled by useSocketStore.
        // Provided as stub to prevent crashes during migration if components still call it.
    },

    disconnectSocket: () => {
        // Obsolete stub
    },

    setView: (view) => set({ view, mode: view }),
    setActiveQuiz: (activeQuiz) => set({ activeQuiz }),
    setSessionCode: (sessionCode) => set({ sessionCode }),
    setStatus: (status) => set({ status }),
    setCurrentQuestion: (currentQuestion) => set({ currentQuestion }),
    setParticipants: (participants) => set({ participants: normalizeParticipants(participants) }),
    setAnswerStats: (answerStats) => set({ answerStats: answerStats || null }),
    setFastestUser: (fastestUser) => set({ fastestUser: fastestUser || null }),
    setAnswers: (answers) => set({ answers: answers || {} }),
    setTimeLeft: (timeLeft) => set({ timeLeft, timer: timeLeft }),
    setLeaderboard: (leaderboard) => set({ leaderboard: leaderboard || [] }),
    setMyResult: (myResult) => set({ myResult }),
    setExpiry: (expiry) => set({ expiry }),
    setIsPaused: (isPaused) => set({ isPaused }),
    setSessionId: (sessionId) => set({ sessionId }),
    setQuizTitle: (quizTitle) => set({ quizTitle: quizTitle || '' }),
    setSelectedOption: (selectedOption) => set({ selectedOption }),
    setErrorMessage: (errorMessage) => set({ errorMessage }),
    setAbortMessage: (abortMessage) => set({ abortMessage }),

    applyRoomState: (state) => {
        const updates = {
            status: state?.status || get().status,
        };
        const hasQuestionPayload = hasRenderableQuestionPayload(state?.currentQuestion);

        if (state?.title) updates.quizTitle = state.title;
        if (Array.isArray(state?.leaderboard)) updates.leaderboard = state.leaderboard;
        if (Array.isArray(state?.participants)) updates.participants = state.participants;
        if (state?.answerStats) updates.answerStats = state.answerStats;
        if (state?.fastestUser !== undefined) updates.fastestUser = state.fastestUser;

        if (hasQuestionPayload) {
            updates.currentQuestion = state.currentQuestion;
            updates.timeLeft = state.timeLeft ?? get().timeLeft;
            updates.timer = state.timeLeft ?? get().timeLeft;
            updates.expiry = state.expiry ?? get().expiry;
            updates.status = 'playing';
            updates.mode = 'playing';
            if (!updates.answerStats) {
                const optionCounts = {};
                for (const option of state.currentQuestion.options || []) {
                    optionCounts[option] = 0;
                }
                updates.answerStats = { questionId: state.currentQuestion._id || null, optionCounts, totalAnswers: 0, fastestUser: null };
            }
        }

        if (state?.sessionId) updates.sessionId = state.sessionId;
        if (state?.isPaused !== undefined) updates.isPaused = state.isPaused;
        set(updates);
    },

    applyNewQuestion: (question) => {
        set({
            currentQuestion: question,
            timeLeft: question?.timeLimit || 0,
            timer: question?.timeLimit || 0,
            expiry: question?.expiry || null,
            answerStats: {
                questionId: question?._id || null,
                optionCounts: Object.fromEntries((question?.options || []).map((option) => [option, 0])),
                totalAnswers: 0,
                fastestUser: null,
            },
            fastestUser: null,
            myResult: null,
            selectedOption: null,
            status: 'playing',
            mode: 'playing',
        });
    },

    applyQuizFinished: () => {
        set({
            status: 'finished',
            mode: 'finished',
            view: 'results',
        });
    },

    applyQuizPaused: (message) => {
        set({ isPaused: true, errorMessage: message });
    },

    applyQuizResumed: (expiry) => {
        set({ isPaused: false, expiry: expiry || get().expiry });
    },

    applyQuizAborted: (message = 'Admin aborted the quiz.') => {
        set({
            status: 'upcoming',
            mode: 'waiting',
            currentQuestion: null,
            timeLeft: 0,
            timer: 0,
            expiry: null,
            leaderboard: [],
            participants: [],
            answerStats: null,
            fastestUser: null,
            selectedOption: null,
            myResult: null,
            errorMessage: message,
            abortMessage: message,
            view: 'loading',
        });
    },

    resetRealtimeState: () => {
        // Preserve active quiz context during page transitions (launch/invite/live)
        // so route-state hydration is not lost before loaders run.
        const preservedActiveQuiz = get().activeQuiz;
        set({
            ...createEmptyRealtimeState(),
            activeQuiz: preservedActiveQuiz,
        });
    },

    getQuizzesForParent: async (parentId = 'none', options = {}) => {
        const { force = false } = options;
        const userKey = useAuthStore.getState().user?._id || 'anonymous';
        const cacheKey = `${userKey}:${parentId}`;
        const state = get();

        const cached = readCache(state.quizzesCache, cacheKey, CACHE_TTL_MS.quizzes, force);
        if (cached) return cached;

        if (inflightQuizzes[cacheKey]) return inflightQuizzes[cacheKey];

        const request = getMyQuizzes(parentId)
            .then((data) => {
                set((current) => ({
                    quizzesCache: setCache(current.quizzesCache, cacheKey, data),
                }));
                return data;
            })
            .finally(() => {
                delete inflightQuizzes[cacheKey];
            });

        inflightQuizzes[cacheKey] = request;

        return request;
    },

    setQuizzesForParent: (parentId, quizzes) => {
        const userKey = useAuthStore.getState().user?._id || 'anonymous';
        const cacheKey = `${userKey}:${parentId}`;
        set((current) => ({
            quizzesCache: setCache(current.quizzesCache, cacheKey, quizzes),
        }));
    },

    prefetchQuizForParent: async (parentId = 'none') => {
        await get().getQuizzesForParent(parentId);
    },

    getHistoryForRole: async (role, options = {}) => {
        const { force = false } = options;
        const userKey = useAuthStore.getState().user?._id || 'anonymous';
        const cacheKey = `${userKey}:${role}`;
        const state = get();

        const cached = readCache(state.historyCache, cacheKey, CACHE_TTL_MS.history, force);
        if (cached) return cached;

        if (inflightHistory[cacheKey]) return inflightHistory[cacheKey];

        const request = (role === 'organizer' ? getOrganizerHistory() : getUserHistory())
            .then((data) => {
                set((current) => ({
                    historyCache: setCache(current.historyCache, cacheKey, data),
                }));
                return data;
            })
            .finally(() => {
                delete inflightHistory[cacheKey];
            });

        inflightHistory[cacheKey] = request;

        return request;
    },

    setHistoryForRole: (role, history) => {
        const userKey = useAuthStore.getState().user?._id || 'anonymous';
        const cacheKey = `${userKey}:${role}`;
        set((current) => ({
            historyCache: setCache(current.historyCache, cacheKey, history),
        }));
    },

    prefetchHistoryForRole: async (role) => {
        await get().getHistoryForRole(role);
    },

    getQuizByCodeCached: async (roomCode, options = {}) => {
        const { force = false } = options;
        const userKey = useAuthStore.getState().user?._id || 'anonymous';
        const code = (roomCode || '').toUpperCase();
        const cacheKey = `${userKey}:${code}`;
        const state = get();

        const cached = readCache(state.quizByCodeCache, cacheKey, CACHE_TTL_MS.quizByCode, force);
        if (cached) return cached;

        if (inflightQuizByCode[cacheKey]) return inflightQuizByCode[cacheKey];

        const request = getQuizByCode(code)
            .then((data) => {
                set((current) => ({
                    quizByCodeCache: setCache(current.quizByCodeCache, cacheKey, data),
                }));
                return data;
            })
            .finally(() => {
                delete inflightQuizByCode[cacheKey];
            });

        inflightQuizByCode[cacheKey] = request;

        return request;
    },

    setQuizByCodeCached: (roomCode, quiz) => {
        const userKey = useAuthStore.getState().user?._id || 'anonymous';
        const code = (roomCode || '').toUpperCase();
        const cacheKey = `${userKey}:${code}`;
        set((current) => ({
            quizByCodeCache: setCache(current.quizByCodeCache, cacheKey, quiz),
        }));
    },

    getQuizLeaderboardCached: async (quizId, options = {}) => {
        const { force = false } = options;
        const userKey = useAuthStore.getState().user?._id || 'anonymous';
        const cacheKey = `${userKey}:${quizId}`;
        const state = get();

        const cached = readCache(state.quizLeaderboardCache, cacheKey, CACHE_TTL_MS.leaderboard, force);
        if (cached) return cached;

        if (inflightQuizLeaderboard[cacheKey]) return inflightQuizLeaderboard[cacheKey];

        const request = getQuizLeaderboard(quizId)
            .then((data) => {
                set((current) => ({
                    quizLeaderboardCache: setCache(current.quizLeaderboardCache, cacheKey, data),
                }));
                return data;
            })
            .finally(() => {
                delete inflightQuizLeaderboard[cacheKey];
            });

        inflightQuizLeaderboard[cacheKey] = request;

        return request;
    },

    prefetchQuizLeaderboard: async (quizId) => {
        if (!quizId) return;
        await get().getQuizLeaderboardCached(quizId);
    },

    getSubjectLeaderboardCached: async (subjectId, options = {}) => {
        const { force = false } = options;
        const userKey = useAuthStore.getState().user?._id || 'anonymous';
        const cacheKey = `${userKey}:${subjectId}`;
        const state = get();

        const cached = readCache(state.subjectLeaderboardCache, cacheKey, CACHE_TTL_MS.subjectLeaderboard, force);
        if (cached) return cached;

        if (inflightSubjectLeaderboard[cacheKey]) return inflightSubjectLeaderboard[cacheKey];

        const request = getSubjectLeaderboard(subjectId)
            .then((data) => {
                set((current) => ({
                    subjectLeaderboardCache: setCache(current.subjectLeaderboardCache, cacheKey, data),
                }));
                return data;
            })
            .finally(() => {
                delete inflightSubjectLeaderboard[cacheKey];
            });

        inflightSubjectLeaderboard[cacheKey] = request;

        return request;
    },

    getProfileCached: async (options = {}) => {
        const { force = false } = options;
        const userKey = useAuthStore.getState().user?._id || 'anonymous';
        const cacheKey = `${userKey}:profile`;
        const state = get();

        const cached = readCache(state.profileCache, cacheKey, CACHE_TTL_MS.profile, force);
        if (cached) return cached;

        if (inflightProfile[cacheKey]) return inflightProfile[cacheKey];

        const request = getMyProfile()
            .then((data) => {
                set((current) => ({
                    profileCache: setCache(current.profileCache, cacheKey, data),
                }));
                return data;
            })
            .finally(() => {
                delete inflightProfile[cacheKey];
            });

        inflightProfile[cacheKey] = request;

        return request;
    },

    setProfileCached: (profile) => {
        const userKey = useAuthStore.getState().user?._id || 'anonymous';
        const cacheKey = `${userKey}:profile`;
        set((current) => ({
            profileCache: setCache(current.profileCache, cacheKey, profile),
        }));
    },

    invalidateUserData: () => {
        get().clearUserData();
    },
}), { name: 'quizStore' }));


