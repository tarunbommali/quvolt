import api from '../../../services/apiClient';

export const getQuizByCode = (code) =>
    api.get(`/quiz/code/${code}`).then(r => r.data);

export const getUserHistory = () =>
    api.get('/quiz/user/history').then(r => r.data);

export const joinQuizSession = (code) =>
    api.post(`/quiz/${code}/join`).then(r => r.data);

export const getQuizLeaderboard = (quizId) =>
    api.get(`/quiz/${quizId}/leaderboard`).then(r => r.data);

export const getSubjectLeaderboard = (subjectId) =>
    api.get(`/quiz/subject/${subjectId}/leaderboard`).then(r => r.data);
