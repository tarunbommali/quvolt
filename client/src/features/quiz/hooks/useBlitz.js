import { useState, useCallback } from 'react';
import api from '../../../services/apiClient';

/**
 * Hook for managing Blitz Session state and actions.
 */
export const useBlitz = () => {
    const [session, setSession] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const startBlitz = useCallback(async ({ type, quizId, folderId }) => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.post('/blitz/start', { type, quizId, folderId });
            setSession(response.data.data);
            return response.data.data;
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to start blitz');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const joinBlitz = useCallback(async (sessionId) => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.post(`/blitz/${sessionId}/join`);
            setSession(response.data.data);
            return response.data.data;
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to join blitz');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchLeaderboard = useCallback(async (sessionId, mode = 'single') => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get(`/blitz/${sessionId}/leaderboard?mode=${mode}`);
            setLeaderboard(response.data.data);
            return response.data.data;
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch leaderboard');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const recordQuizResult = useCallback(async ({ sessionId, quizId, score, unitId, folderId }) => {
        try {
            await api.post('/blitz/record', { sessionId, quizId, score, unitId, folderId });
        } catch (err) {
            console.error('[useBlitz] Failed to record result:', err);
        }
    }, []);

    const updateBlitzStatus = useCallback(async (sessionId, status) => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.patch(`/blitz/${sessionId}/status`, { status });
            setSession(response.data.data);
            return response.data.data;
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update status');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        session,
        leaderboard,
        loading,
        error,
        startBlitz,
        joinBlitz,
        fetchLeaderboard,
        recordQuizResult,
        updateBlitzStatus,
    };
};
