/**
 * socketEvents.js
 *
 * Authoritative list of all Socket.IO event names used in the app.
 *
 * Client → Server (emitted by client):
 *   JOIN_QUIZ, ANSWER_SUBMIT, SESSION_START
 *
 * Server → Client (received by client):
 *   JOIN_SUCCESS, JOIN_ERROR, WAITING_ROOM_UPDATE,
 *   NEW_QUESTION, ANSWER_RESULT, LEADERBOARD_UPDATE, QUIZ_FINISHED
 *
 * Legacy events are kept for backward compatibility.
 */
export const SOCKET_EVENTS = {
  // ── Connection lifecycle ──────────────────────────────────────────────────
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  RECONNECT: 'reconnect',
  RECONNECT_ATTEMPT: 'reconnect_attempt',
  RECONNECT_ERROR: 'reconnect_error',
  ERROR: 'error',

  // ── Join flow (canonical spec) ────────────────────────────────────────────
  /** Client emits this to request joining a quiz room */
  JOIN_QUIZ: 'join_quiz',
  /** Server responds with success + room state */
  JOIN_SUCCESS: 'join_success',
  /** Server responds when access is denied */
  JOIN_ERROR: 'join_error',
  /** Server broadcasts when participant list changes in waiting room */
  WAITING_ROOM_UPDATE: 'waiting_room_update',
  /** Client emits to reconnect mid-session after network drop */
  REJOIN_QUIZ: 'rejoin_quiz',
  /** Server responds with restored session state */
  REJOIN_SUCCESS: 'rejoin_success',

  // ── Quiz flow (canonical spec) ────────────────────────────────────────────
  /** Server emits a new question payload */
  NEW_QUESTION: 'new_question',
  /** Server emits answer feedback to the submitting participant */
  ANSWER_RESULT: 'answer:result',
  /** Server broadcasts updated leaderboard to the room */
  LEADERBOARD_UPDATE: 'update_leaderboard',
  /** Server emits when the quiz is finished */
  QUIZ_FINISHED: 'quiz_finished',

  // ── Legacy / backward-compat room events ─────────────────────────────────
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  ROOM_STATE: 'room_state',
  SESSION_REDIRECT: 'session_redirect',

  // ── Participants ──────────────────────────────────────────────────────────
  USER_JOINED: 'user_joined',
  USER_LEFT: 'user_left',
  PARTICIPANTS_UPDATE: 'participants:update',
  PARTICIPANTS_UPDATE_LEGACY: 'participants_update',

  // ── Session lifecycle ─────────────────────────────────────────────────────
  SESSION_START: 'session:start',
  SESSION_END: 'session:end',
  SESSION_STATE: 'session:state',
  SESSION_SYNC: 'session:syncState',
  SESSION_ERROR: 'session:error',
  QUESTION_UPDATE: 'question:update',
  /** Server emits for safe re-sync (no UI reset) via republishCurrentQuestion */
  QUESTION_SYNC: 'question:sync',

  // ── Timer (server-driven, client display-only) ────────────────────────────
  TIMER_TICK: 'timer:tick',
  TIMER_TICK_LEGACY: 'timer_tick',
  TIMER_START: 'timer:start',
  TIMER_UPDATE: 'timer:update',
  TIMER_END: 'timer:end',

  // ── Answer submission ─────────────────────────────────────────────────────
  /** Legacy submit event name (server handles both) */
  ANSWER_SUBMIT_LEGACY: 'submit_answer',

  // ── Stats ─────────────────────────────────────────────────────────────────
  ANSWER_STATS: 'answer_stats',
  FASTEST_USER: 'fastest_user',

  // ── Control (host) ────────────────────────────────────────────────────────
  PAUSE_QUIZ: 'quiz_paused',
  RESUME_QUIZ: 'quiz_resumed',
  NEXT_QUESTION: 'next_question',
  /** Server emits when the host manually ends the session (graceful) */
  QUIZ_ENDED_BY_HOST: 'quiz_ended_by_host',
  /** Server emits when the session is aborted (force stop) */
  QUIZ_ABORTED: 'quiz_aborted',

  // ── Perf ──────────────────────────────────────────────────────────────────
  COMPRESSED_MESSAGE: 'compressed_message',
};

