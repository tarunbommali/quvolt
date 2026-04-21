import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { getMyProfile } from '../../features/auth/services/auth.service';
import { getMyQuizzes } from '../../features/quiz/services/quiz.service';
import { gethostHistory } from '../../features/host/services/host.service';
import { 
    getQuizByCode, 
    getQuizLeaderboard, 
    getSubjectLeaderboard, 
    getUserHistory 
} from '../../features/participant/services/participant.service';
import { useAuthStore } from '../useAuthStore';

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
    if (Date.now() - entry.timestamp > ttl) return null;
    return entry.value;
};

const setCache = (cacheMap, key, value) => ({
    ...cacheMap,
    [key]: { value, timestamp: Date.now() },
});

export const useQuizCacheStore = create()(devtools((set, get) => ({
    quizzesCache: {},
    historyCache: {},
    quizByCodeCache: {},
    quizLeaderboardCache: {},
    subjectLeaderboardCache: {},
    profileCache: {},

    clearUserData: () => {
        set(Object.fromEntries(TRANSIENT_KEYS.map((key) => [key, {}])));
    },

    getQuizzesForParent: async (parentId = 'none', options = {}) => {
        const { force = false } = options;
        const userKey = useAuthStore.getState().user?._id || 'anonymous';
        const cacheKey = `${userKey}:${parentId}`;
        
        const cached = readCache(get().quizzesCache, cacheKey, CACHE_TTL_MS.quizzes, force);
        if (cached) return cached;
        if (inflightQuizzes[cacheKey]) return inflightQuizzes[cacheKey];

        const request = getMyQuizzes(parentId)
            .then((data) => {
                set((current) => ({ quizzesCache: setCache(current.quizzesCache, cacheKey, data) }));
                return data;
            })
            .finally(() => { delete inflightQuizzes[cacheKey]; });

        inflightQuizzes[cacheKey] = request;
        return request;
    },

    setQuizzesForParent: (parentId, quizzes) => {
        const userKey = useAuthStore.getState().user?._id || 'anonymous';
        const cacheKey = `${userKey}:${parentId}`;
        set((current) => ({ quizzesCache: setCache(current.quizzesCache, cacheKey, quizzes) }));
    },

    prefetchQuizForParent: async (parentId = 'none') => {
        await get().getQuizzesForParent(parentId);
    },

    getHistoryForRole: async (role, options = {}) => {
        const { force = false } = options;
        const userKey = useAuthStore.getState().user?._id || 'anonymous';
        const cacheKey = `${userKey}:${role}`;
        
        const cached = readCache(get().historyCache, cacheKey, CACHE_TTL_MS.history, force);
        if (cached) return cached;
        if (inflightHistory[cacheKey]) return inflightHistory[cacheKey];

        const request = (role === 'host' ? gethostHistory() : getUserHistory())
            .then((data) => {
                set((current) => ({ historyCache: setCache(current.historyCache, cacheKey, data) }));
                return data;
            })
            .finally(() => { delete inflightHistory[cacheKey]; });

        inflightHistory[cacheKey] = request;
        return request;
    },

    setHistoryForRole: (role, history) => {
        const userKey = useAuthStore.getState().user?._id || 'anonymous';
        const cacheKey = `${userKey}:${role}`;
        set((current) => ({ historyCache: setCache(current.historyCache, cacheKey, history) }));
    },

    getQuizByCodeCached: async (roomCode, options = {}) => {
        const { force = false } = options;
        const userKey = useAuthStore.getState().user?._id || 'anonymous';
        const code = (roomCode || '').toUpperCase();
        const cacheKey = `${userKey}:${code}`;
        
        const cached = readCache(get().quizByCodeCache, cacheKey, CACHE_TTL_MS.quizByCode, force);
        if (cached) return cached;
        if (inflightQuizByCode[cacheKey]) return inflightQuizByCode[cacheKey];

        const request = getQuizByCode(code)
            .then((data) => {
                set((current) => ({ quizByCodeCache: setCache(current.quizByCodeCache, cacheKey, data) }));
                return data;
            })
            .finally(() => { delete inflightQuizByCode[cacheKey]; });

        inflightQuizByCode[cacheKey] = request;
        return request;
    },

    getQuizLeaderboardCached: async (quizId, options = {}) => {
        const { force = false } = options;
        const userKey = useAuthStore.getState().user?._id || 'anonymous';
        const cacheKey = `${userKey}:${quizId}`;
        
        const cached = readCache(get().quizLeaderboardCache, cacheKey, CACHE_TTL_MS.leaderboard, force);
        if (cached) return cached;
        if (inflightQuizLeaderboard[cacheKey]) return inflightQuizLeaderboard[cacheKey];

        const request = getQuizLeaderboard(quizId)
            .then((data) => {
                set((current) => ({ quizLeaderboardCache: setCache(current.quizLeaderboardCache, cacheKey, data) }));
                return data;
            })
            .finally(() => { delete inflightQuizLeaderboard[cacheKey]; });

        inflightQuizLeaderboard[cacheKey] = request;
        return request;
    },

    getSubjectLeaderboardCached: async (subjectId, options = {}) => {
        const { force = false } = options;
        const userKey = useAuthStore.getState().user?._id || 'anonymous';
        const cacheKey = `${userKey}:${subjectId}`;
        
        const cached = readCache(get().subjectLeaderboardCache, cacheKey, CACHE_TTL_MS.subjectLeaderboard, force);
        if (cached) return cached;
        if (inflightSubjectLeaderboard[cacheKey]) return inflightSubjectLeaderboard[cacheKey];

        const request = getSubjectLeaderboard(subjectId)
            .then((data) => {
                set((current) => ({ subjectLeaderboardCache: setCache(current.subjectLeaderboardCache, cacheKey, data) }));
                return data;
            })
            .finally(() => { delete inflightSubjectLeaderboard[cacheKey]; });

        inflightSubjectLeaderboard[cacheKey] = request;
        return request;
    },

    getProfileCached: async (options = {}) => {
        const { force = false } = options;
        const userKey = useAuthStore.getState().user?._id || 'anonymous';
        const cacheKey = `${userKey}:profile`;
        
        const cached = readCache(get().profileCache, cacheKey, CACHE_TTL_MS.profile, force);
        if (cached) return cached;
        if (inflightProfile[cacheKey]) return inflightProfile[cacheKey];

        const request = getMyProfile()
            .then((data) => {
                set((current) => ({ profileCache: setCache(current.profileCache, cacheKey, data) }));
                return data;
            })
            .finally(() => { delete inflightProfile[cacheKey]; });

        inflightProfile[cacheKey] = request;
        return request;
    },

    invalidateUserData: () => {
        get().clearUserData();
    },
}), { name: 'quizCacheStore' }));
