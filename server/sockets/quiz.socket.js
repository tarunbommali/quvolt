const quizService = require('../services/quiz/quiz.service');
const logger = require('../utils/logger');

const registerQuizSocket = (io, socket) => {
    socket.on('join_room', async ({ roomCode, sessionId }) => {
        try {
            const result = await quizService.joinRoom({ io, socket, roomCode, sessionId });
            if (result.error) return socket.emit('error', result.error);

            socket.join(result.roomCode);
            socket.emit('room_state', result.state);
            io.to(result.roomCode).emit('participants_update', result.state.participants);
        } catch (error) {
            logger.error('Socket join_room error', { roomCode, sessionId, error: error.message, stack: error.stack });
            socket.emit('error', 'Join failed');
        }
    });

    socket.on('start_quiz', async ({ roomCode, sessionId, mode }) => {
        try {
            const result = await quizService.startQuizSession({ io, roomCode, sessionId, user: socket.data.user, mode: mode || 'auto' });
            if (result.error) return socket.emit('error', result.error);

            socket.join(result.roomCode);
            const waitingRoomCode = result.waitingRoomCode || roomCode;

            if (waitingRoomCode && waitingRoomCode !== result.roomCode) {
                io.to(waitingRoomCode).emit('session_redirect', { roomCode: result.roomCode, sessionId: result.sessionId });
                io.to(waitingRoomCode).emit('start_quiz', { roomCode: result.roomCode, sessionId: result.sessionId });
            }

            io.to(result.roomCode).emit('start_quiz', { roomCode: result.roomCode, sessionId: result.sessionId, mode: result.session.mode });
            socket.emit('session_redirect', { roomCode: result.roomCode, sessionId: result.sessionId });

            // STEP 2: Wait briefly to ensure participants have joined the new room before broadcasting
            setTimeout(() => {
                quizService.broadcastQuestionEnhanced(io, result.roomCode).catch((err) => {
                    logger.error('broadcastQuestionEnhanced failed on start', { roomCode: result.roomCode, error: err.message, stack: err.stack });
                });
            }, 300);
        } catch (error) {
            logger.error('Socket start_quiz error', { roomCode, sessionId, error: error.message, stack: error.stack });
            socket.emit('error', 'Failed to start quiz');
        }
    });

    socket.on('pause_quiz', async ({ quizId, sessionCode, roomCode }) => {
        try {
            // STEP 3: Fix pause to work anytime (even before answers)
            const result = await quizService.pauseQuizSession({ io, quizId, sessionCode: sessionCode || roomCode, user: socket.data.user });
            if (result.error) return socket.emit('error', result.error);

            // Emit pause event to all participants
            io.to(sessionCode || roomCode).emit('quiz_paused', { roomCode: sessionCode || roomCode });
        } catch (error) {
            logger.error('Socket pause_quiz error', { quizId, sessionCode, error: error.message, stack: error.stack });
        }
    });

    socket.on('resume_quiz', async ({ quizId, sessionCode }) => {
        try {
            const result = await quizService.resumeQuizSession({ io, quizId, sessionCode, user: socket.data.user });
            if (result.error) return socket.emit('error', result.error);
        } catch (error) {
            logger.error('Socket resume_quiz error', { quizId, sessionCode, error: error.message, stack: error.stack });
        }
    });

    socket.on('next_question', async ({ quizId, sessionId, sessionCode, roomCode }) => {
        try {
            // STEP 7: Different behavior for auto vs tutor mode
            const result = await quizService.advanceQuizQuestion({
                io,
                quizId,
                sessionCode: sessionCode || roomCode,
                sessionId,
                user: socket.data.user,
            });
            if (result.error) return socket.emit('error', result.error);
        } catch (error) {
            logger.error('Socket next_question error', { quizId, sessionId, sessionCode, error: error.message, stack: error.stack });
        }
    });

    // STEP 8: New host control events
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
            logger.error('Socket reveal_answer error', { error: error.message, stack: error.stack });
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
            logger.error('Socket end_quiz error', { error: error.message, stack: error.stack });
        }
    });

    socket.on('submit_answer', async ({ roomCode, sessionId, questionId, selectedOption }) => {
        try {
            const result = await quizService.submitAnswer({ io, socket, roomCode, sessionId, questionId, selectedOption });
            if (result.error) return socket.emit('error', result.error);
            if (result.ignored) {
                socket.emit('answer_result', { ignored: true, message: 'Answer already submitted for this question.' });
                return;
            }

            socket.emit('answer_result', {
                isCorrect: result.isCorrect,
                correctAnswer: result.correctAnswer,
                score: result.score,
                totalScore: result.totalScore,
                streak: result.streak,
                bestStreak: result.bestStreak,
            });
            io.to(result.room).emit('update_leaderboard', result.leaderboard);
        } catch (error) {
            logger.error('Socket submit_answer error', { roomCode, sessionId, error: error.message, stack: error.stack });
            socket.emit('error', 'Failed to submit answer');
        }
    });

    socket.on('disconnect', async () => {
        try {
            await quizService.leaveRoom({ io, socket });
        } catch (error) {
            logger.error('Socket disconnect leaveRoom error', { error: error.message });
        }
    });
};

module.exports = registerQuizSocket;