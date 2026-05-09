import { create } from 'zustand';
import { useQuizRealtimeStore } from './quiz/useQuizRealtimeStore';
import { useQuizCacheStore } from './quiz/useQuizCacheStore';
import { useQuizUIStore } from './quiz/useQuizUIStore';
import { useLeaderboardStore } from './leaderboard/useLeaderboardStore';
import { useParticipantStore } from './participant/useParticipantStore';

/**
 * 🚨 MONOLITHIC STORE (LEGACY FACADE)
 * 
 * This store now acts as a bridge to modular stores to prevent breaking 
 * existing components. 
 * 
 * 👉 RECOMMENDATION: Migrate components to use domain-specific stores:
 *    - useQuizRealtimeStore
 *    - useQuizCacheStore
 *    - useQuizUIStore
 */
export const useQuizStore = create((set, get) => ({
    // --- State Accessors (Proxies to modular stores) ---
    // Note: These getters allow useQuizStore(s => s.status) to work if the store is subscribed.
    // However, for reactive updates, we need to sync state or use a combined approach.
    // For this refactor, we expose all actions.
    
    // --- ACTIONS (Delegated to modular stores) ---
    
    // Realtime Actions
    setSessionMode: (m) => useQuizRealtimeStore.getState().setSessionMode(m),
    setStatus: (s) => useQuizRealtimeStore.getState().setStatus(s),
    setCurrentQuestion: (q) => useQuizRealtimeStore.getState().setCurrentQuestion(q),
    setParticipants: (p) => {
        useQuizRealtimeStore.getState().setParticipants(p);
        useParticipantStore.getState().setParticipants(p);
    },
    setAnswerStats: (a) => useQuizRealtimeStore.getState().setAnswerStats(a),
    setFastestUser: (u) => useQuizRealtimeStore.getState().setFastestUser(u),
    setAnswers: (a) => useQuizRealtimeStore.getState().setAnswers(a),
    setTimeLeft: (t) => useQuizRealtimeStore.getState().setTimeLeft(t),
    setLeaderboard: (l) => {
        useQuizRealtimeStore.getState().setLeaderboard(l);
        useLeaderboardStore.getState().setLeaderboard(l);
    },
    setMyResult: (r) => useQuizRealtimeStore.getState().setMyResult(r),
    setExpiry: (e) => useQuizRealtimeStore.getState().setExpiry(e),
    setIsPaused: (p) => useQuizRealtimeStore.getState().setIsPaused(p),
    setSessionId: (s) => useQuizRealtimeStore.getState().setSessionId(s),
    setSessionCode: (s) => useQuizRealtimeStore.getState().setSessionCode(s),
    setQuizTitle: (t) => useQuizRealtimeStore.getState().setQuizTitle(t),
    setErrorMessage: (e) => useQuizRealtimeStore.getState().setErrorMessage(e),
    setAbortMessage: (a) => useQuizRealtimeStore.getState().setAbortMessage(a),

    applyRoomState: (s) => useQuizRealtimeStore.getState().applyRoomState(s),
    applyNewQuestion: (q) => useQuizRealtimeStore.getState().applyNewQuestion(q),
    applyQuizFinished: (data) => useQuizRealtimeStore.getState().applyQuizFinished(data),
    applyQuizPaused: (m) => useQuizRealtimeStore.getState().applyQuizPaused(m),
    applyQuizResumed: (e) => useQuizRealtimeStore.getState().applyQuizResumed(e),
    applyQuizAborted: (m) => useQuizRealtimeStore.getState().applyQuizAborted(m),
    resetRealtimeState: () => {
        useQuizRealtimeStore.getState().resetRealtimeState();
        useQuizUIStore.getState().resetUI();
    },

    // Cache Actions
    getQuizById: (id, options) => useQuizCacheStore.getState().getQuizById(id, options),
    getQuizzesForParent: (p, o) => useQuizCacheStore.getState().getQuizzesForParent(p, o),
    setQuizzesForParent: (p, q) => useQuizCacheStore.getState().setQuizzesForParent(p, q),
    prefetchQuizForParent: (p) => useQuizCacheStore.getState().prefetchQuizForParent(p),
    getHistoryForRole: (r, o) => useQuizCacheStore.getState().getHistoryForRole(r, o),
    setHistoryForRole: (r, h) => useQuizCacheStore.getState().setHistoryForRole(r, h),
    getQuizByCodeCached: (c, o) => useQuizCacheStore.getState().getQuizByCodeCached(c, o),
    getQuizLeaderboardCached: (q, o) => useQuizCacheStore.getState().getQuizLeaderboardCached(q, o),
    getSubjectLeaderboardCached: (s, o) => useQuizCacheStore.getState().getSubjectLeaderboardCached(s, o),
    getProfileCached: (o) => useQuizCacheStore.getState().getProfileCached(o),
    clearUserData: () => {
        useQuizCacheStore.getState().clearUserData();
        useQuizRealtimeStore.getState().resetRealtimeState();
    },
    invalidateUserData: () => useQuizCacheStore.getState().invalidateUserData(),

    // UI Actions
    setView: (v) => useQuizUIStore.getState().setView(v),
    setActiveQuiz: (a) => useQuizUIStore.getState().setActiveQuiz(a),
    setSelectedOption: (o) => useQuizUIStore.getState().setSelectedOption(o),

    // --- State Proxying ---
    // This is the tricky part. For selectors like useQuizStore(s => s.status) 
    // to work, we need to subscribe to the modular stores and update this facade.
}));

// Synchronize facade state with modular stores (Legacy support)
const syncStores = () => {
    // Realtime Store is the base for most fields
    useQuizRealtimeStore.subscribe((state) => {
        useQuizStore.setState({
            ...state,
            // Never let RealtimeStore overwrite these if they exist in domain stores
            participants: useParticipantStore.getState().participants,
            leaderboard: useLeaderboardStore.getState().leaderboard
        });
    });

    // Participant Store is source of truth for participants
    useParticipantStore.subscribe((state) => {
        useQuizStore.setState({ 
            participants: state.participants,
            joinedCount: state.joinedCount 
        });
    });

    // Leaderboard Store is source of truth for leaderboard
    useLeaderboardStore.subscribe((state) => {
        useQuizStore.setState({ 
            leaderboard: state.leaderboard 
        });
    });

    // UI Store for views and selections
    useQuizUIStore.subscribe((state) => {
        useQuizStore.setState(state);
    });
};

syncStores();
