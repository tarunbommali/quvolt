/**
 * useQuizSession.js
 *
 * Unified hook for managing a live quiz session.  Abstracts all socket
 * interactions so pages/components remain free of raw socket.emit() calls.
 *
 * Listens to both legacy event names (join_room, new_question …) and the new
 * spec-compliant event names (participant:join, question:start, answer:submit …)
 * so the codebase can migrate incrementally.
 *
 * Usage:
 *   const session = useQuizSession({ sessionCode, role: 'participant' | 'host' });
 *   session.submitAnswer({ questionId, selectedOption });
 *   session.nextQuestion();
 */

import { useEffect, useCallback } from 'react';
import { useSocketStore } from '../stores/useSocketStore';
import { useQuizStore } from '../stores/useQuizStore';

/**
 * @param {object} options
 * @param {string}  options.sessionCode  – Room / session code
 * @param {string}  [options.sessionId]  – Optional DB session id
 * @param {'host'|'participant'} options.role
 */
const useQuizSession = ({ sessionCode, sessionId, role = 'participant' } = {}) => {
    const socket = useSocketStore((state) => state.socket);
    const connected = useSocketStore((state) => state.connected);
    const connectSocket = useSocketStore((state) => state.connectSocket);
    const joinRoom = useSocketStore((state) => state.joinRoom);

    const sessionMode = useQuizStore((state) => state.sessionMode);
    const currentQuestion = useQuizStore((state) => state.currentQuestion);
    const isPaused = useQuizStore((state) => state.isPaused);
    const status = useQuizStore((state) => state.status);
    const participants = useQuizStore((state) => state.participants);
    const leaderboard = useQuizStore((state) => state.leaderboard);
    const myResult = useQuizStore((state) => state.myResult);
    const timeLeft = useQuizStore((state) => state.timeLeft);
    const expiry = useQuizStore((state) => state.expiry);
    const answerStats = useQuizStore((state) => state.answerStats);
    const selectedOption = useQuizStore((state) => state.selectedOption);

    // ── Connection lifecycle ─────────────────────────────────────────────────
    useEffect(() => {
        if (!sessionCode) return;
        if (!socket || !connected) connectSocket();
    }, [sessionCode, socket, connected, connectSocket]);

    useEffect(() => {
        if (!sessionCode || !socket || !connected) return;
        // Use spec-compliant join event; socket store also handles legacy join_room
        socket.emit('participant:join', { sessionCode: sessionCode.toUpperCase(), sessionId });
    }, [sessionCode, sessionId, socket, connected]);

    // ── Timer sync from server-driven expiry ─────────────────────────────────
    const setTimeLeft = useQuizStore((state) => state.setTimeLeft);
    const setExpiry = useQuizStore((state) => state.setExpiry);

    useEffect(() => {
        if (!expiry) return;
        const interval = setInterval(() => {
            const remaining = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
            setTimeLeft(remaining);
            if (remaining === 0) clearInterval(interval);
        }, 500);
        return () => clearInterval(interval);
    }, [expiry, setTimeLeft]);

    // ── Actions: Host ────────────────────────────────────────────────────────

    const startSession = useCallback((mode) => {
        if (!socket || role !== 'host') return;
        socket.emit('session:start', {
            sessionCode: sessionCode?.toUpperCase(),
            sessionId,
            mode: mode || sessionMode || 'auto',
        });
    }, [socket, sessionCode, sessionId, sessionMode, role]);

    const pauseQuestion = useCallback(() => {
        if (!socket || role !== 'host') return;
        socket.emit('question:pause', { sessionCode: sessionCode?.toUpperCase() });
    }, [socket, sessionCode, role]);

    const nextQuestion = useCallback(() => {
        if (!socket || role !== 'host') return;
        socket.emit('question:next', { sessionCode: sessionCode?.toUpperCase(), sessionId });
    }, [socket, sessionCode, sessionId, role]);

    const setSessionMode = useCallback((mode) => {
        if (!socket || role !== 'host') return;
        socket.emit('session:modeToggle', { sessionCode: sessionCode?.toUpperCase(), mode });
    }, [socket, sessionCode, role]);

    const endSession = useCallback(() => {
        if (!socket || role !== 'host') return;
        socket.emit('end_quiz', { sessionCode: sessionCode?.toUpperCase() });
    }, [socket, sessionCode, role]);

    const requestTimerSync = useCallback(() => {
        if (!socket) return;
        socket.emit('timer:request', { sessionCode: sessionCode?.toUpperCase() });
    }, [socket, sessionCode]);

    // ── Actions: Participant ─────────────────────────────────────────────────

    const submitAnswer = useCallback(({ questionId, selectedOption: option }) => {
        if (!socket) return;
        const startTime = currentQuestion?.questionStartTime ?? Date.now();
        const timeTaken = Math.round((Date.now() - startTime) / 1000);

        // Emit via spec-compliant event; useSocketStore also handles legacy submit_answer
        socket.emit('answer:submit', {
            sessionCode: sessionCode?.toUpperCase(),
            questionId,
            selectedOption: option,
            timeTaken,
        });
    }, [socket, sessionCode, currentQuestion]);

    const leaveSession = useCallback(() => {
        if (!socket) return;
        socket.emit('participant:leave', { sessionCode: sessionCode?.toUpperCase() });
    }, [socket, sessionCode]);

    const syncState = useCallback(() => {
        if (!socket) return;
        socket.emit('session:syncState', { sessionCode: sessionCode?.toUpperCase() });
    }, [socket, sessionCode]);

    return {
        // Connection state
        connected,

        // Session state
        status,
        sessionMode,
        participants,
        leaderboard,
        isPaused,

        // Question state
        currentQuestion,
        answerStats,
        myResult,
        selectedOption,

        // Timer state (display only — server drives the logic)
        timeLeft,
        expiry,

        // Host actions
        startSession,
        pauseQuestion,
        nextQuestion,
        setSessionMode,
        endSession,

        // Participant actions
        submitAnswer,
        leaveSession,

        // Shared
        syncState,
        requestTimerSync,

        // Raw socket for escape hatch
        socket,
    };
};

export default useQuizSession;
