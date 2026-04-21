/**
 * quiz.socket.js
 *
 * Root socket registration module.  Wires together all sub-handlers:
 *   - session.handler  → lobby / join / start / sync lifecycle
 *   - question.handler → question:start, question:next, answer:submit
 *   - timer.handler    → timer:request (server-driven timer events)
 *
 * Legacy event names (join_room, start_quiz, …) are kept for backward
 * compatibility with existing client code until a full migration is done.
 */

const quizService = require('../services/quiz/quiz.service');
const logger = require('../utils/logger');
const registerSessionHandler = require('./handlers/session.handler');
const registerQuestionHandler = require('./handlers/question.handler');
const { registerTimerHandler } = require('./handlers/timer.handler');
const { initTimerPublisher } = require('../services/timer/timer.publisher');
const { initSessionPublisher, publishSessionStart, publishSessionRedirect, publishQuizPaused } = require('../services/session/session.publisher');
const { initGameplayPublisher, publishNewQuestion, publishAnswerResult, publishLeaderboardUpdate } = require('../services/gameplay/gameplay.publisher');

const registerQuizSocket = (io, socket) => {
    // ── Initialize Infra Layers ──────────────────────────────────────────────
    initTimerPublisher(io);
    initSessionPublisher(io);
    initGameplayPublisher(io);

    // ── New handlers (spec-compliant event names) ─────────────────────────────
    registerSessionHandler(io, socket);
    registerQuestionHandler(io, socket);
    registerTimerHandler(io, socket);

    // ── Legacy handlers (backward-compatible) ─────────────────────────────────
    
    socket.on('start_quiz', async ({ roomCode, sessionId, mode }) => {
        try {
            const result = await quizService.startQuizSession({ io, roomCode, sessionId, user: socket.data.user, mode: mode || 'auto' });
            if (result.error) return socket.emit('error', result.error);

            socket.join(result.roomCode);
            const waitingRoomCode = result.waitingRoomCode || roomCode;

            if (waitingRoomCode && waitingRoomCode !== result.roomCode) {
                publishSessionRedirect(waitingRoomCode, { roomCode: result.roomCode, sessionId: result.sessionId });
            }

            publishSessionStart(result.roomCode, {
                sessionCode: result.roomCode,
                sessionId: result.sessionId,
                mode: result.session.mode,
            });

            socket.emit('session_redirect', { roomCode: result.roomCode, sessionId: result.sessionId });

            setTimeout(() => {
                quizService.broadcastQuestionEnhanced(io, result.roomCode).catch((err) => {
                    logger.error('broadcastQuestionEnhanced failed on start', { roomCode: result.roomCode, error: err.message });
                });
            }, 300);
        } catch (error) {
            logger.error('Socket start_quiz error', { roomCode, sessionId, error: error.message });
            socket.emit('error', 'Failed to start quiz');
        }
    });

    socket.on('pause_quiz', async ({ quizId, sessionCode, roomCode }) => {
        try {
            const result = await quizService.pauseQuizSession({ io, quizId, sessionCode: sessionCode || roomCode, user: socket.data.user });
            if (result.error) return socket.emit('error', result.error);

            publishQuizPaused(sessionCode || roomCode, { roomCode: sessionCode || roomCode });
        } catch (error) {
            logger.error('Socket pause_quiz error', { quizId, sessionCode, error: error.message });
        }
    });

    socket.on('resume_quiz', async ({ quizId, sessionCode }) => {
        try {
            const result = await quizService.resumeQuizSession({ io, quizId, sessionCode, user: socket.data.user });
            if (result.error) return socket.emit('error', result.error);
        } catch (error) {
            logger.error('Socket resume_quiz error', { quizId, sessionCode, error: error.message });
        }
    });

    socket.on('next_question', async ({ quizId, sessionId, sessionCode, roomCode }) => {
        try {
            const result = await quizService.advanceQuizQuestion({
                io,
                quizId,
                sessionCode: sessionCode || roomCode,
                sessionId,
                user: socket.data.user,
            });
            if (result.error) return socket.emit('error', result.error);
        } catch (error) {
            logger.error('Socket next_question error', { quizId, sessionId, sessionCode, error: error.message });
        }
    });

    socket.on('reveal_answer', async ({ roomCode, sessionCode }) => {
        try {
            const user = socket.data.user;
            if (user?.role !== 'host' && user?.role !== 'admin') {
                return socket.emit('error', 'Unauthorized');
            }

            const room = roomCode || sessionCode;
            const result = await quizService.revealAnswer({ io, roomCode: room, user });
            if (result.error) return socket.emit('error', result.error);
        } catch (error) {
            logger.error('Socket reveal_answer error', { error: error.message });
        }
    });

    socket.on('end_quiz', async ({ quizId, sessionCode, roomCode }) => {
        try {
            const user = socket.data.user;
            if (user?.role !== 'host' && user?.role !== 'admin') {
                return socket.emit('error', 'Unauthorized');
            }

            const result = await quizService.endQuizSession({ io, quizId, sessionCode: sessionCode || roomCode, user });
            if (result.error) return socket.emit('error', result.error);
        } catch (error) {
            logger.error('Socket end_quiz error', { error: error.message });
        }
    });

    socket.on('submit_answer', async ({ roomCode, sessionId, questionId, selectedOption }) => {
        try {
            const result = await quizService.submitAnswer({ io, socket, roomCode, sessionId, questionId, selectedOption });
            if (result.error) return socket.emit('error', result.error);
            if (result.ignored) {
                publishAnswerResult(socket, { ignored: true, message: 'Already submitted.' });
                return;
            }

            publishAnswerResult(socket, {
                isCorrect: result.isCorrect,
                correctAnswer: result.correctAnswer,
                score: result.score,
                totalScore: result.totalScore,
                streak: result.streak,
                bestStreak: result.bestStreak,
                timeTaken: result.timeTaken ?? 0,
            });

            publishLeaderboardUpdate(result.room, result.leaderboard);
        } catch (error) {
            logger.error('Socket submit_answer error', { roomCode, error: error.message });
            socket.emit('error', 'Failed to submit answer');
        }
    });
};

module.exports = registerQuizSocket;