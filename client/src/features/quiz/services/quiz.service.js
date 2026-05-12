import api from '../../../services/apiClient';

const unwrapApiBody = (response) => {
    const body = response?.data;
    if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
        return body.data;
    }
    return body;
};

// --- Templates & Creation ---
export const getMyQuizzes = (parentId) =>
    api.get('quiz/templates', { params: { parentId } }).then(r => r.data);

export const getQuizById = (id) =>
    api.get(`/quiz/${id}`).then(r => r.data);

export const createQuiz = (title, type, parentId, options = {}) =>
    api.post('/quiz/templates/new', {
        title,
        type,
        parentId,
        mode: options.mode,
        accessType: options.accessType,
        allowedEmails: options.allowedEmails,
    }).then(r => r.data);

export const updateQuiz = (id, payload) =>
    api.put(`/quiz/${id}`, payload).then(r => r.data);

export const deleteQuiz = (id) =>
    api.delete(`/quiz/${id}`).then(r => r.data);

// --- Sessions ---
export const startQuizSession = (templateId) =>
    api.post(`/quiz/templates/${templateId}/session`).then(unwrapApiBody);

export const startLiveSession = (id) =>
    api.post(`/quiz/${id}/start-live`, {}, { timeout: 30000 }).then(unwrapApiBody);

export const nextQuestion = (id, sessionCode) =>
    api.post(`/quiz/${id}/next-question`, { sessionCode }).then(unwrapApiBody);

export const pauseQuizSession = (id, sessionCode) =>
    api.post(`/quiz/${id}/pause`, { sessionCode }).then(unwrapApiBody);

export const resumeQuizSession = (id, sessionCode) =>
    api.post(`/quiz/${id}/resume`, { sessionCode }).then(unwrapApiBody);

// --- Questions ---
export const addQuestion = (quizId, questionData) =>
    api.post(`/quiz/${quizId}/questions`, questionData).then(r => r.data);

export const updateQuestion = (quizId, questionId, questionData) =>
    api.put(`/quiz/${quizId}/questions/${questionId}`, questionData).then(r => r.data);

export const deleteQuestion = (quizId, questionId) =>
    api.delete(`/quiz/${quizId}/questions/${questionId}`).then(r => r.data);

export const getMyScheduledJoins = () =>
    api.get('/quiz/user/scheduled-joins').then(r => r.data);

export const isTransientApiError = (error) => {
    return error.code === 'ECONNABORTED' || error.message?.includes('timeout') || error.response?.status >= 500;
};

export const scheduleQuiz = (id, payload) =>
    api.post(`/quiz/${id}/schedule`, payload).then(r => r.data);

export default api;

