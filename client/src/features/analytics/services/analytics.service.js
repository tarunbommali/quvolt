import api from '../../../services/apiClient';

/**
 * analytics.service.js
 * Client-side analytics API service.
 */

/**
 * GET /api/analytics/sessions/recent?limit=N
 * Returns the N most recent sessions with sessionId for the dashboard picker.
 */
export const fetchRecentSessions = (limit = 10) =>
    api.get('/analytics/sessions/recent', { params: { limit } }).then((r) => r.data);

/**
 * GET /api/analytics/full/:sessionId
 * Unified plan-aware endpoint — backend returns what the user's plan allows.
 * Returns { session, questions, audience, plan }.
 */
export const fetchFullAnalytics = (sessionId) =>
    api.get(`/analytics/full/${sessionId}`).then((r) => r.data);

// ─── Individual endpoints kept for direct use / fallback ────────────────────

export const fetchSessionAnalytics = (sessionId) =>
    api.get(`/analytics/session/${sessionId}`).then((r) => r.data);

export const fetchQuestionInsights = (sessionId) =>
    api.get(`/analytics/questions/${sessionId}`).then((r) => r.data);

export const fetchAudienceInsights = (sessionId) =>
    api.get(`/analytics/audience/${sessionId}`).then((r) => r.data);

