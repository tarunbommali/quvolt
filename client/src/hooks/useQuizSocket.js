/**
 * useQuizSocket.js
 *
 * Component-level hook that subscribes to quiz socket events for the
 * DURATION of a component's mount.
 *
 * Rules:
 *  - Listeners are registered ONCE on mount and cleaned up on unmount
 *  - Global events (participants, leaderboard, timer) are already handled
 *    in useSocketStore; this hook handles COMPONENT-SPECIFIC callbacks only
 *  - The hook does NOT emit join_quiz — that is the responsibility of the
 *    component (via useSocketStore.joinRoom) to avoid race conditions
 *  - Callbacks must be stable references (useCallback from parent) to
 *    prevent unnecessary listener churn
 */
import { useEffect, useRef } from 'react';
import { getSocket } from '../sockets/socketClient';
import { SOCKET_EVENTS } from '../sockets/socketEvents';

/**
 * @param {Object} options
 * @param {string}   options.roomId              - The room code (uppercase)
 * @param {Function} [options.onQuestionUpdate]  - Called with new question payload
 * @param {Function} [options.onUserJoined]      - Called with participant list payload
 * @param {Function} [options.onUserLeft]        - Called when a user leaves
 * @param {Function} [options.onLeaderboardUpdate] - Called with leaderboard array
 * @param {Function} [options.onStatusUpdate]    - Called when session status changes
 * @param {Function} [options.onJoinError]       - Called when server denies access
 * @param {Function} [options.onJoinSuccess]     - Called when join is confirmed
 */
export const useQuizSocket = ({
  roomId,
  onQuestionUpdate,
  onUserJoined,
  onUserLeft,
  onLeaderboardUpdate,
  onStatusUpdate,
  onJoinError,
  onJoinSuccess,
}) => {
  // Keep stable callback refs to avoid removing / re-adding listeners on renders
  const callbackRefs = useRef({});
  callbackRefs.current = {
    onQuestionUpdate,
    onUserJoined,
    onUserLeft,
    onLeaderboardUpdate,
    onStatusUpdate,
    onJoinError,
    onJoinSuccess,
  };

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !roomId) return;

    // ── Stable wrapper functions (created once per mount) ─────────────────
    const handleQuestion = (payload) => {
      callbackRefs.current.onQuestionUpdate?.(payload);
    };

    const handleParticipants = (payload) => {
      const normalized = Array.isArray(payload) ? payload : (payload?.participants || payload?.items || []);
      callbackRefs.current.onUserJoined?.(normalized);
    };

    const handleUserLeft = (payload) => {
      callbackRefs.current.onUserLeft?.(payload);
    };

    const handleLeaderboard = (payload) => {
      const normalized = Array.isArray(payload) ? payload : (payload?.leaderboard || payload?.items || []);
      callbackRefs.current.onLeaderboardUpdate?.(normalized);
    };

    const handleStatusUpdate = (payload) => {
      callbackRefs.current.onStatusUpdate?.(payload);
    };

    const handleJoinError = (payload) => {
      console.warn('[useQuizSocket] join_error received:', payload?.message);
      callbackRefs.current.onJoinError?.(payload);
    };

    const handleJoinSuccess = (payload) => {
      console.log('[useQuizSocket] join_success received for room:', payload?.roomCode);
      callbackRefs.current.onJoinSuccess?.(payload);
    };

    // ── Register listeners ONCE ────────────────────────────────────────────
    socket.on(SOCKET_EVENTS.NEW_QUESTION, handleQuestion);
    socket.on(SOCKET_EVENTS.PARTICIPANTS_UPDATE, handleParticipants);
    socket.on(SOCKET_EVENTS.WAITING_ROOM_UPDATE, handleParticipants);
    socket.on(SOCKET_EVENTS.PARTICIPANTS_UPDATE_LEGACY, handleParticipants);
    socket.on(SOCKET_EVENTS.USER_LEFT, handleUserLeft);
    socket.on(SOCKET_EVENTS.LEADERBOARD_UPDATE, handleLeaderboard);
    socket.on(SOCKET_EVENTS.SESSION_START, handleStatusUpdate);
    socket.on(SOCKET_EVENTS.JOIN_ERROR, handleJoinError);
    socket.on(SOCKET_EVENTS.JOIN_SUCCESS, handleJoinSuccess);

    // Re-join on reconnect (socket.io internal event on the Manager)
    const handleReconnect = () => {
      console.log('[useQuizSocket] Reconnected — re-joining room:', roomId);
      socket.emit(SOCKET_EVENTS.JOIN_QUIZ, { roomCode: roomId });
    };
    socket.io.on('reconnect', handleReconnect);

    // ── Cleanup: remove every listener registered above ───────────────────
    return () => {
      socket.off(SOCKET_EVENTS.NEW_QUESTION, handleQuestion);
      socket.off(SOCKET_EVENTS.PARTICIPANTS_UPDATE, handleParticipants);
      socket.off(SOCKET_EVENTS.WAITING_ROOM_UPDATE, handleParticipants);
      socket.off(SOCKET_EVENTS.PARTICIPANTS_UPDATE_LEGACY, handleParticipants);
      socket.off(SOCKET_EVENTS.USER_LEFT, handleUserLeft);
      socket.off(SOCKET_EVENTS.LEADERBOARD_UPDATE, handleLeaderboard);
      socket.off(SOCKET_EVENTS.SESSION_START, handleStatusUpdate);
      socket.off(SOCKET_EVENTS.JOIN_ERROR, handleJoinError);
      socket.off(SOCKET_EVENTS.JOIN_SUCCESS, handleJoinSuccess);
      socket.io.off('reconnect', handleReconnect);
    };
    // roomId is the only dependency — callbacks are accessed via stable ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);
};
