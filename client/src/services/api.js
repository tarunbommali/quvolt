import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 12000);
let accessToken = null;
const TRANSIENT_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_BASE_DELAY_MS = 300;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getRetryDelayMs = (attempt, baseDelayMs = DEFAULT_RETRY_BASE_DELAY_MS) => {
    const jitter = Math.floor(Math.random() * 120);
    return Math.min(2000, baseDelayMs * 2 ** (attempt - 1)) + jitter;
};

const isRetryableMethod = (method) => {
    const verb = (method || 'get').toLowerCase();
    return verb === 'get' || verb === 'head' || verb === 'options';
};

const isTransientFailure = (error) => {
    const status = error?.response?.status;
    if (!error?.response) return true;
    return TRANSIENT_STATUS_CODES.has(status);
};

export const isTransientApiError = (error) => Boolean(error?.isTransientApiError);

export const setAccessToken = (token) => {
    accessToken = token || null;
    if (accessToken) {
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    } else {
        delete api.defaults.headers.common.Authorization;
    }
};

export const getAccessToken = () => accessToken;

const api = axios.create({
    baseURL: BASE_URL,
    timeout: API_TIMEOUT_MS,
});

// Attach the auth token to every request automatically
api.interceptors.request.use((config) => {
    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }

    if (!config.headers) {
        config.headers = {};
    }

    return config;
});

// Handle Token Refresh on 401
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error?.config;
        if (!originalRequest) {
            return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/refresh')) {
            originalRequest._retry = true;
            try {
                const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });
                setAccessToken(data.token);
                originalRequest.headers['Authorization'] = `Bearer ${data.token}`;
                return api(originalRequest);
            } catch (err) {
                setAccessToken(null);
                localStorage.removeItem('Quvolt_user');
                // Redirect to login so the user isn't left on a locked page
                if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
                    window.location.replace('/login');
                }
                return Promise.reject(err);
            }
        }

        const shouldRetry =
            !originalRequest.url?.includes('/auth/') &&
            !originalRequest.disableRetry &&
            isRetryableMethod(originalRequest.method) &&
            isTransientFailure(error);

        if (shouldRetry) {
            const retryCount = originalRequest.__retryCount || 0;
            const maxRetries = Number.isInteger(originalRequest.maxRetries)
                ? originalRequest.maxRetries
                : DEFAULT_MAX_RETRIES;

            if (retryCount < maxRetries) {
                originalRequest.__retryCount = retryCount + 1;
                const delayMs = getRetryDelayMs(originalRequest.__retryCount, originalRequest.retryBaseDelayMs);
                await wait(delayMs);
                return api(originalRequest);
            }

            error.isTransientApiError = true;
            error.retryAttempts = retryCount;
        }

        return Promise.reject(error);
    }
);

// ─── Auth ────────────────────────────────────────────────────────────────────

export const loginUser = (email, password) =>
    api.post('/auth/login', { email, password }, { withCredentials: true }).then(r => r.data);

export const registerUser = (name, email, password, role) =>
    api.post('/auth/register', { name, email, password, role }, { withCredentials: true }).then(r => r.data);

export const logoutUser = () =>
    api.post('/auth/logout', {}, { withCredentials: true }).then(() => {
        setAccessToken(null);
        localStorage.removeItem('Quvolt_user');
    });

export const refreshAccessToken = () =>
    axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true, timeout: API_TIMEOUT_MS }).then((r) => {
        const token = r.data?.token;
        setAccessToken(token);
        return token;
    });

export const getMyProfile = () =>
    api.get('/auth/me').then(r => r.data);

export const updateMyProfile = (payload) =>
    api.put('/auth/me', payload).then(r => r.data);

const unwrapApiBody = (response) => {
    const body = response?.data;
    if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
        return body.data;
    }
    return body;
};

// ─── Quiz ────────────────────────────────────────────────────────────────────

export const getMyQuizzes = (parentId) =>
    api.get('/quiz/my-quizzes', { params: { parentId } }).then(r => r.data);

export const getQuizByCode = (roomCode) =>
    api.get(`/quiz/${roomCode}`).then(r => r.data);

export const createQuiz = (title, type, parentId, isPaid, price, options = {}) =>
    api.post('/quiz', {
        title,
        type,
        parentId,
        isPaid,
        price,
        mode: options.mode,
        accessType: options.accessType,
        allowedEmails: options.allowedEmails,
    }).then(r => r.data);

export const updateQuiz = (id, payload) =>
    api.put(`/quiz/${id}`, payload).then(r => r.data);

export const saveQuizFullState = (id, payload) =>
    api.put(`/quiz/${id}/full-state`, payload).then(r => r.data);

export const startQuizSession = (id) =>
    api.post(`/quiz/${id}/start`).then(unwrapApiBody);

export const startLiveSession = (id) =>
    api.post(`/quiz/${id}/start-live`).then(unwrapApiBody);

export const scheduleQuiz = (id, scheduledAt) =>
    api.post(`/quiz/${id}/schedule`, { scheduledAt }).then(unwrapApiBody);

export const pauseQuizSession = (id, sessionCode) =>
    api.post(`/quiz/${id}/pause`, { sessionCode }).then(unwrapApiBody);

export const resumeQuizSession = (id, sessionCode) =>
    api.post(`/quiz/${id}/resume`, { sessionCode }).then(unwrapApiBody);

export const nextQuestion = (id, sessionCode) =>
    api.post(`/quiz/${id}/next-question`, { sessionCode }).then(unwrapApiBody);

export const deleteQuiz = (id) =>
    api.delete(`/quiz/${id}`).then(r => r.data);

// Participant: register for a scheduled session
export const joinScheduledSession = (roomCode) =>
    api.post(`/quiz/join-scheduled/${roomCode}`).then(r => r.data);

// Participant: get all scheduled sessions joined
export const getMyScheduledJoins = () =>
    api.get('/quiz/user/scheduled-joins').then(r => r.data);

// ─── Questions ───────────────────────────────────────────────────────────────

export const addQuestion = (quizId, questionData) =>
    api.post(`/quiz/${quizId}/questions`, questionData).then(r => r.data);

export const updateQuestion = (quizId, questionId, questionData) =>
    api.put(`/quiz/${quizId}/questions/${questionId}`, questionData).then(r => r.data);

export const deleteQuestion = (quizId, questionId) =>
    api.delete(`/quiz/${quizId}/questions/${questionId}`).then(r => r.data);

// ─── Leaderboards & History ───────────────────────────────────────────────────

export const getQuizLeaderboard = (quizId) =>
    api.get(`/quiz/${quizId}/leaderboard`).then(r => r.data);

export const getSubjectLeaderboard = (subjectId) =>
    api.get(`/quiz/subject/${subjectId}/leaderboard`).then(r => r.data);

export const getUserHistory = () =>
    api.get('/quiz/user/history').then(r => r.data);

export const getOrganizerHistory = () =>
    api.get('/quiz/organizer/history').then(r => r.data);

export const getSessionParticipants = (sessionCode) =>
    api.get(`/quiz/session/${sessionCode}/participants`).then(r => r.data);

// ─── Analytics ───────────────────────────────────────────────────────────────

export const getQuizAnalytics = (quizId) =>
    api.get(`/analytics/quiz/${quizId}`).then(r => r.data);

export const getUserAnalytics = (userId) =>
    api.get(userId ? `/analytics/user/${userId}` : '/analytics/user').then(r => r.data);

export const getOrganizerAnalyticsSummary = (userId) =>
    api.get('/analytics/summary', { params: userId ? { userId } : undefined }).then(r => r.data);

// ─── AI Quiz Generator ───────────────────────────────────────────────────────

export const generateAIQuiz = (payload) =>
    api.post('/ai/generate-quiz', payload).then(r => r.data);

// ─── Payments ────────────────────────────────────────────────────────────────

export const createPaymentOrder = (quizId, amount) =>
    api.post('/payment/create-order', { quizId, amount }).then(r => r.data);

export const verifyPayment = (orderId, paymentId, signature, quizId) =>
    api.post('/payment/verify', { orderId, paymentId, signature, quizId }).then(r => r.data);

export const getPaymentStatus = (quizId) =>
    api.get(`/payment/status/${quizId}`).then(r => r.data);

export const getBatchPaymentStatus = (quizIds) =>
    api.post('/payment/status/batch', { quizIds }).then(r => r.data);

export const getTotalRevenue = (quizIds) =>
    api.post('/payment/revenue/total', { quizIds }).then(r => r.data);

export const getRevenueByQuiz = (quizIds) =>
    api.post('/payment/revenue/by-quiz', { quizIds }).then(r => r.data);

export const getHostPayoutSummary = () =>
    api.get('/payment/host/payout-summary').then(r => r.data);

export const getMyHostAccount = () =>
    api.get('/payment/host/account').then(r => r.data);

export const getPaymentHealth = () =>
    api.get('/payment/health', { disableRetry: true }).then(r => r.data);

// ─── Subscriptions ────────────────────────────────────────────────────────────

export const getSubscriptionPlans = () =>
    api.get('/subscription/plans').then(r => r.data);

export const getMySubscription = () =>
    api.get('/subscription/status').then(r => r.data);

export const createSubscriptionOrder = (planId) =>
    api.post('/subscription/create', { planId }).then(r => r.data);

export const verifySubscriptionPayment = (orderId, paymentId, signature, planId) =>
    api.post('/subscription/verify', { orderId, paymentId, signature, planId }).then(r => r.data);

export const cancelSubscription = (reason) =>
    api.post('/subscription/cancel', { reason }).then(r => r.data);

export const getSocketUrl = () => (BASE_URL.startsWith('http') ? BASE_URL : window.location.origin);

export default api;
