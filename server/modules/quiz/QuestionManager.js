const eventBus = require('../core/EventBus');
const logger = require('../../utils/logger');
const sessionStore = require('../../services/session/session.service');
const { formatQuestion } = require('../../services/gameplay/question.service');
const { clearTimers, scheduleNextAction } = require('../../services/session/session.timer.service');

/**
 * QuestionManager
 * Handles question sequencing and timing logic
 */
class QuestionManager {
    constructor() {
        this.timers = new Map();
    }

    /**
     * Advance to the next question in a session
     */
    async nextQuestion(sessionContext) {
        const session = await sessionStore.getSession(sessionContext.roomCode);
        if (!session) return;

        session.currentQuestionIndex += 1;
        session.questionState = 'waiting';
        await sessionStore.setSession(sessionContext.roomCode, session);

        // Emit sync event for progress bar update (e.g. "Question 2/10")
        eventBus.emit('QUESTION_PROGRESS', {
            roomCode: sessionContext.roomCode,
            data: {
                current: session.currentQuestionIndex,
                total: session.questions.length
            }
        });

        // Delay before broadcasting actual question text
        const delay = session.interQuestionDelay || 1500;
        scheduleNextAction(sessionContext.roomCode, 'broadcast', delay);
    }

    /**
     * Broadcast a question to all participants
     */
    async broadcastQuestion(sessionContext) {
        const session = await sessionStore.getSession(sessionContext.roomCode);
        if (!session || session.status === 'completed') return;

        const questions = session.questions || [];
        if (session.currentQuestionIndex >= questions.length) {
            return sessionContext.end();
        }

        const question = questions[session.currentQuestionIndex];
        session.questionStartTime = Date.now();
        session.questionState = 'live';

        const isTutorMode = session.mode === 'tutor';
        if (isTutorMode) {
            session.questionExpiry = null;
        } else {
            session.questionExpiry = Date.now() + (question.timeLimit * 1000);
        }

        await sessionStore.setSession(sessionContext.roomCode, session);

        const formatted = formatQuestion(question, session.currentQuestionIndex, questions.length, session.questionExpiry);
        
        // Observer Pattern: Notify system of new question
        eventBus.emit('QUESTION_START', {
            roomCode: sessionContext.roomCode,
            data: formatted
        });

        if (!isTutorMode) {
            eventBus.emit('TIMER_START', {
                roomCode: sessionContext.roomCode,
                data: {
                    duration: question.timeLimit,
                    expiry: session.questionExpiry
                }
            });
            scheduleNextAction(sessionContext.roomCode, 'advance', question.timeLimit * 1000);
        }
    }
}

module.exports = new QuestionManager();
