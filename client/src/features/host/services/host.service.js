import api from '../../../services/apiClient';

export const gethostAnalyticsSummary = (userId) =>
    api.get('/analytics/summary', { params: userId ? { userId } : undefined }).then(r => r.data);

export const getUserAnalytics = (userId) =>
    api.get(userId ? `/analytics/user/${userId}` : '/analytics/user').then(r => r.data);

export const gethostHistory = () =>
    api.get('/quiz/host/history').then(r => r.data);

export const getSessionParticipants = (sessionCode) =>
    api.get(`/quiz/session/${sessionCode}/participants`).then(r => r.data);

export const getQuizAnalytics = (quizId) =>
    api.get(`/analytics/quiz/${quizId}`).then(r => r.data);

// Also re-exporting some quiz methods used by host controllers
export const createQuiz = (title, type, parentId, options) =>
    api.post('/quiz/templates/new', { title, type, parentId, ...options }).then(r => r.data);

export const updateQuiz = (id, payload) =>
    api.put(`/quiz/${id}`, payload).then(r => r.data);

export const deleteQuiz = (id) =>
    api.delete(`/quiz/${id}`).then(r => r.data);

export const addQuestion = (quizId, data) =>
    api.post(`/quiz/${quizId}/questions`, data).then(r => r.data);

// Utility methods moved from legacy api.js
export const getMyScheduledJoins = () =>
    api.get('/quiz/user/scheduled-joins').then(r => r.data);

export const isTransientApiError = (error) => {
    return error.code === 'ECONNABORTED' || error.message?.includes('timeout') || error.response?.status >= 500;
};

// AI & Advanced State
export const generateAIQuiz = (payload) =>
    api.post('/ai/generate-quiz', payload).then(r => r.data);

export const saveQuizFullState = (quizId, payload) =>
    api.put(`/quiz/${quizId}/full-state`, payload).then(r => r.data);

export const getTemplateSessions = (templateId) =>
    api.get(`/quiz/templates/${templateId}/sessions`).then(r => r.data);

export const startLiveSession = (id) =>
    api.post(`/quiz/${id}/start-live`, {}, { timeout: 30000 }).then(r => r.data);

export const abortSession = (id, sessionCode) =>
    api.post(`/quiz/${id}/abort`, { sessionCode }).then(r => r.data);

export const getSessionState = (code) =>
    api.get(`/quiz/session/${code}/state`).then(r => r.data);

