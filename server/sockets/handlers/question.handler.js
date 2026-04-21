const logger = require('../../utils/logger');
const quizService = require('../../services/quiz/quiz.service');

/**
 * question.handler.js
 *
 * Handles the "live quiz" phase events: question:start, question:pause,
 * question:next, and answer:submit / answer:result.
 *
 * These map directly onto the spec's required event names while delegating
 * all heavy lifting to quiz.service (which already carries the full business
 * logic).  Socket handlers here stay thin — validate → delegate → emit.
 */
const registerQuestionHandler = (io, socket) => {
    const user = socket.data.user;

    // ── question:start ────────────────────────────────────────────────────────
    // Explicitly kick off the first/current question (tutor mode — after an
    // answer reveal).  In auto mode the backend timer drives this automatically.
    socket.on('question:start', async ({ sessionCode, roomCode } = {}) => {
        try {
            if (user?.role !== 'host' && user?.role !== 'admin') {
                return socket.emit('session:error', { message: 'Unauthorized' });
            }

            const room = roomCode || sessionCode || socket.data.roomCode;
            if (!room) return socket.emit('session:error', { message: 'sessionCode is required' });

            await quizService.broadcastQuestionEnhanced(io, room);

            logger.debug('question:start', { roomCode: room, userId: user?._id });
        } catch (err) {
            logger.error('question.handler question:start', { error: err.message });
            socket.emit('session:error', { message: 'Failed to start question' });
        }
    });

    // ── question:pause ────────────────────────────────────────────────────────
    socket.on('question:pause', async ({ sessionCode, quizId } = {}) => {
        try {
            if (user?.role !== 'host' && user?.role !== 'admin') {
                return socket.emit('session:error', { message: 'Unauthorized' });
            }

            const result = await quizService.pauseQuizSession({
                io,
                quizId,
                sessionCode: sessionCode || socket.data.roomCode,
                user,
            });

            if (result.error) {
                return socket.emit('session:error', { message: result.error });
            }

            logger.debug('question:pause', { sessionCode, userId: user?._id });
        } catch (err) {
            logger.error('question.handler question:pause', { error: err.message });
        }
    });

    // ── question:next ─────────────────────────────────────────────────────────
    // Tutor-mode: host manually advances to the next question.
    socket.on('question:next', async ({ sessionCode, quizId, sessionId } = {}) => {
        try {
            if (user?.role !== 'host' && user?.role !== 'admin') {
                return socket.emit('session:error', { message: 'Unauthorized' });
            }

            const result = await quizService.advanceQuizQuestion({
                io,
                quizId,
                sessionCode: sessionCode || socket.data.roomCode,
                sessionId,
                user,
            });

            if (result.error) {
                return socket.emit('session:error', { message: result.error });
            }

            logger.debug('question:next', { sessionCode, userId: user?._id });
        } catch (err) {
            logger.error('question.handler question:next', { error: err.message });
            socket.emit('session:error', { message: 'Failed to advance question' });
        }
    });

    // ── answer:submit (+ legacy submit_answer) ────────────────────────────
    // timeTaken from client is ignored — server re-calculates from questionStartTime.
    // acquireAnswerLock (inside submitAnswer) ensures only the FIRST submission
    // per userId+question is accepted; duplicates return { ignored: true }.
    const handleAnswerSubmit = async ({ sessionCode, roomCode, questionId, selectedOption, timeTaken: _hint } = {}) => {
        try {
            const room = roomCode || sessionCode || socket.data.roomCode;
            if (!room) return socket.emit('session:error', { message: 'sessionCode is required' });

            const result = await quizService.submitAnswer({
                io,
                socket,
                roomCode: room,
                sessionId: null,
                questionId,
                selectedOption,
            });

            if (result.error) {
                return socket.emit('session:error', { message: result.error });
            }

            if (result.ignored) {
                return socket.emit('answer:result', {
                    ignored: true,
                    message: 'Answer already submitted for this question.',
                });
            }

            socket.emit('answer:result', {
                correct: result.isCorrect,
                correctOption: result.correctAnswer,
                timeTaken: result.timeTaken ?? _hint ?? 0,
                score: result.score,
                totalScore: result.totalScore,
                streak: result.streak,
                bestStreak: result.bestStreak,
            });

            // NOTE: leaderboard broadcast is handled (and batched) inside answer.service.js

            logger.debug('answer:submit processed', {
                userId: user?._id,
                roomCode: room,
                isCorrect: result.isCorrect,
            });
        } catch (err) {
            logger.error('question.handler answer:submit', { error: err.message, stack: err.stack });
            socket.emit('session:error', { message: 'Failed to submit answer' });
        }
    };

    socket.on('answer:submit', handleAnswerSubmit);
    socket.on('submit_answer', handleAnswerSubmit); // legacy alias — same anti-cheat path

    // ── question:update ───────────────────────────────────────────────────────
    // Host can broadcast an explicit question:update notification (e.g. after
    // timer corrections).  Rarely used but part of the sync spec.
    socket.on('question:update', async ({ sessionCode } = {}) => {
        try {
            if (user?.role !== 'host' && user?.role !== 'admin') return;
            const room = sessionCode || socket.data.roomCode;
            if (!room) return;
            await quizService.broadcastQuestionEnhanced(io, room);
        } catch (err) {
            logger.error('question.handler question:update', { error: err.message });
        }
    });

    // ── host:next-question ────────────────────────────────────────────────────
    // Spec-required event name for host to manually advance to next question
    // (Requirements 2.4, 2.5)
    socket.on('host:next-question', async ({ sessionCode, quizId, sessionId } = {}) => {
        try {
            if (user?.role !== 'host' && user?.role !== 'admin') {
                return socket.emit('session:error', { message: 'Unauthorized' });
            }

            const result = await quizService.advanceQuizQuestion({
                io,
                quizId,
                sessionCode: sessionCode || socket.data.roomCode,
                sessionId,
                user,
            });

            if (result.error) {
                return socket.emit('session:error', { message: result.error });
            }

            logger.debug('host:next-question', { sessionCode, userId: user?._id });
        } catch (err) {
            logger.error('question.handler host:next-question', { error: err.message });
            socket.emit('session:error', { message: 'Failed to advance question' });
        }
    });

    // ── host:pause ────────────────────────────────────────────────────────────
    // Spec-required event name for host to pause the quiz
    // (Requirements 2.4, 2.5)
    socket.on('host:pause', async ({ sessionCode, quizId } = {}) => {
        try {
            if (user?.role !== 'host' && user?.role !== 'admin') {
                return socket.emit('session:error', { message: 'Unauthorized' });
            }

            const result = await quizService.pauseQuizSession({
                io,
                quizId,
                sessionCode: sessionCode || socket.data.roomCode,
                user,
            });

            if (result.error) {
                return socket.emit('session:error', { message: result.error });
            }

            logger.debug('host:pause', { sessionCode, userId: user?._id });
        } catch (err) {
            logger.error('question.handler host:pause', { error: err.message });
        }
    });

    // ── host:resume ───────────────────────────────────────────────────────────
    // Spec-required event name for host to resume the quiz
    // (Requirements 2.4, 2.5)
    socket.on('host:resume', async ({ sessionCode, quizId } = {}) => {
        try {
            if (user?.role !== 'host' && user?.role !== 'admin') {
                return socket.emit('session:error', { message: 'Unauthorized' });
            }

            const result = await quizService.resumeQuizSession({
                io,
                quizId,
                sessionCode: sessionCode || socket.data.roomCode,
                user,
            });

            if (result.error) {
                return socket.emit('session:error', { message: result.error });
            }

            logger.debug('host:resume', { sessionCode, userId: user?._id });
        } catch (err) {
            logger.error('question.handler host:resume', { error: err.message });
        }
    });
};

module.exports = registerQuestionHandler;
