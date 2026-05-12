const logger = require('../../utils/logger');
const sessionStore = require('../session/session.service');
const { SESSION_STATUS, assertTransition } = require('../../utils/sessionStateMachine');
const { clearTimers, scheduleNextAction } = require('../session/session.timer.service');
const Quiz = require('../../models/Quiz');
const QuizSession = require('../../models/QuizSession');
const { 
    publishNewQuestion, 
    publishQuestionSync,
    publishQuizFinished, 
    publishLeaderboardUpdate, 
    publishAnswerStats, 
    publishFastestUser 
} = require('./gameplay.publisher');
const { 
    publishTimerStart, 
    publishTimerTick, 
    publishTimerEnd 
} = require('../timer/timer.publisher');

const shuffleArray = (items) => {
    const array = [...items];
    for (let i = array.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

const createQuestionStats = (question) => {
    const optionCounts = {};
    for (const option of question?.options || []) {
        optionCounts[String(option)] = 0;
    }

    return {
        questionId: question?._id?.toString?.() || null,
        optionCounts,
        totalAnswers: 0,
        fastestUser: null,
    };
};

const serializeQuestionStats = (stats) => {
    if (!stats) return null;

    return {
        questionId: stats.questionId || null,
        optionCounts: { ...(stats.optionCounts || {}) },
        totalAnswers: stats.totalAnswers || 0,
        fastestUser: stats.fastestUser ? { ...stats.fastestUser } : null,
    };
};

const formatQuestion = (question, index, total, expiry) => {
    if (!question) return null;

    // Handle both Mongoose documents and plain objects
    const rawOptions = question.options || [];
    const options = question.shuffleOptions
        ? shuffleArray([...rawOptions])
        : [...rawOptions];

    const formatted = {
        _id: question._id?.toString?.() || question._id,
        text: question.text || 'Untitled Question',
        options: options.length > 0 ? options : ['Option A', 'Option B'], // Fallback for data corruption
        translations: (question.translations instanceof Map
            ? Object.fromEntries(question.translations)
            : question.translations?.toJSON?.() || question.translations || {}), // [I18N] Ensure Map → plain object
        timeLimit: question.timeLimit || 30,
        mediaUrl: question.mediaUrl || null,
        questionType: question.questionType || 'multiple-choice',
        index: Number(index),
        total: Number(total || 0),
        expiry: expiry ? Number(expiry) : null,
    };

    logger.debug('[QUESTION] Formatted payload', { 
        id: formatted._id, 
        index: formatted.index, 
        optionsCount: formatted.options.length 
    });
    
    return formatted;
};

const broadcastQuestionEnhanced = async (io, roomCode) => {
    const session = await sessionStore.getSession(roomCode);
    if (!session) {
        logger.error('broadcastQuestionEnhanced: session not found', { roomCode });
        return;
    }

    // ── Fix 5: State machine guard ────────────────────────────────────────────
    // Reject illegal transitions: COMPLETED sessions must never broadcast again.
    if (session.status === SESSION_STATUS.COMPLETED) {
        logger.warn('[broadcastQuestionEnhanced] Rejected — session already COMPLETED', { roomCode });
        return;
    }

    const questions = session.questions || [];
    await clearTimers(roomCode);

    logger.info(`Broadcasting question ${session.currentQuestionIndex} of ${questions.length}`, { roomCode });

    if (session.currentQuestionIndex >= questions.length) {
        logger.info('Quiz finished - no more questions', { roomCode });
        
        try {
            assertTransition(session.status, SESSION_STATUS.COMPLETED, 'session');
        } catch (error) {
            logger.error('Invalid transition to completed state', { roomCode, error: error.message });
            return;
        }

        session.status = SESSION_STATUS.COMPLETED;
        session.questionState = 'waiting';
        await sessionStore.setSession(roomCode, session);

        const topWinners = Object.values(session.leaderboard || {})
            .sort((a, b) => b.score - a.score || a.time - b.time)
            .slice(0, 10)
            .map((participant, index) => ({
                name: participant.name,
                score: participant.score,
                time: participant.time,
                rank: index + 1,
            }));

        const statePersistence = require('../session/statePersistence');
        
        try {
            await statePersistence.executeInTransaction(async (dbSession) => {
                await QuizSession.findOneAndUpdate(
                    { sessionCode: roomCode },
                    { 
                        status: SESSION_STATUS.COMPLETED, 
                        endedAt: new Date(), 
                        topWinners, 
                        participantCount: Object.keys(session.participants || {}).length 
                    },
                    { session: dbSession }
                );

                if (session.quizId) {
                    await Quiz.findByIdAndUpdate(
                        session.quizId,
                        {
                            status: SESSION_STATUS.COMPLETED,
                            lastSessionCode: roomCode,
                            lastSessionStatus: 'completed',
                            lastSessionEndedAt: new Date(),
                            lastSessionMessage: '',
                        },
                        { session: dbSession }
                    );
                }
                
                return { roomCode };
            }, {
                operation: 'completeQuizSession',
                roomCode
            });
        } catch (error) {
            logger.error('Failed to persist quiz completion', { roomCode, error: error.message });
        }

        publishQuizFinished(roomCode, { status: 'completed', topWinners });
        publishTimerEnd(roomCode);

        setTimeout(() => sessionStore.deleteSession(roomCode), 10 * 60 * 1000);
        return;
    }

    const question = questions[session.currentQuestionIndex];
    if (!question) {
        logger.error('Question not found at index', { roomCode, index: session.currentQuestionIndex });
        return;
    }

    session.questionStartTime = Date.now();
    session.currentQuestionStats = createQuestionStats(question);
    session.questionState = 'live';

    const isTutorMode = session.mode === 'tutor' || session.mode === 'teaching';

    if (isTutorMode) {
        session.questionExpiry = null;
    } else {
        session.questionExpiry = Date.now() + (question.timeLimit * 1000);
    }

    await sessionStore.setSession(roomCode, session);

    const formattedQuestion = formatQuestion(question, session.currentQuestionIndex, questions.length, session.questionExpiry);
    
    if (!formattedQuestion || !formattedQuestion.text) {
        logger.error('[QUESTION] Failed to format question — payload invalid', { 
            roomCode, index: session.currentQuestionIndex 
        });
        return;
    }

    logger.info('[QUESTION] Broadcasting new_question', { 
        roomCode, 
        index: formattedQuestion.index, 
        total: formattedQuestion.total,
        text: formattedQuestion.text.substring(0, 20) + '...'
    });
    
    publishNewQuestion(roomCode, formattedQuestion);

    const sortedLeaderboard = Object.values(session.leaderboard || {})
        .sort((a, b) => b.score - a.score || a.time - b.time)
        .slice(0, 10);
        
    publishLeaderboardUpdate(roomCode, sortedLeaderboard);
    publishAnswerStats(roomCode, serializeQuestionStats(session.currentQuestionStats));
    publishFastestUser(roomCode, null);

    if (!isTutorMode) {
        publishTimerStart(roomCode, question.timeLimit, session.questionExpiry);

        const timeLimitMs = question.timeLimit * 1000;
        logger.info('[TIMER] Starting', { roomCode, questionIndex: session.currentQuestionIndex, expiry: session.questionExpiry, timeLimit: question.timeLimit });
        scheduleNextAction(roomCode, 'advance', timeLimitMs);

        const TICK_INTERVAL_MS = 1000;
        let ticksRemaining = Math.floor(timeLimitMs / TICK_INTERVAL_MS);
        const tickInterval = setInterval(() => {
            ticksRemaining -= 1;
            if (ticksRemaining <= 0 || Date.now() >= session.questionExpiry) {
                clearInterval(tickInterval);
                return;
            }
            publishTimerTick(roomCode, Math.max(0, Math.floor((session.questionExpiry - Date.now()) / 1000)), session.questionExpiry);
        }, TICK_INTERVAL_MS);
        tickInterval.unref?.();
    }
};

/**
 * Safe re-publish of the current question to all room participants.
 * Called when the session is ALREADY live (e.g. socket session:start fires after HTTP start).
 * Does NOT reset timers — only re-emits existing state so late socket-connectors catch up.
 */
const republishCurrentQuestion = async (io, roomCode) => {
    const session = await sessionStore.getSession(roomCode);
    if (!session) {
        logger.warn('[republishCurrentQuestion] session not found', { roomCode });
        return;
    }
    if (session.questionState !== 'live') {
        logger.info('[republishCurrentQuestion] questionState not live — skipping re-publish', { roomCode, questionState: session.questionState });
        return;
    }

    const questions = session.questions || [];
    const question  = questions[session.currentQuestionIndex ?? 0];
    if (!question) return;

    const formatted = formatQuestion(question, session.currentQuestionIndex, questions.length, session.questionExpiry);
    if (!formatted?.text) return;

    if (process.env.NODE_ENV !== 'production') {
        logger.debug('[republishCurrentQuestion] re-emitting existing question', {
            roomCode,
            index: formatted.index,
            expiry: session.questionExpiry,
        });
    }

    // Re-emit via question:sync (NOT new_question) to avoid:
    //   - UI flash / animation reset
    //   - Selected option being cleared
    //   - Duplicate timer start cascades
    publishQuestionSync(roomCode, formatted);

    // Re-publish timer using existing expiry (no new timers started)
    if (session.questionExpiry) {
        publishTimerStart(roomCode, question.timeLimit || 30, session.questionExpiry);
    }

    // Re-publish leaderboard + stats so the host console updates
    const sortedLeaderboard = Object.values(session.leaderboard || {})
        .sort((a, b) => b.score - a.score || a.time - b.time)
        .slice(0, 10);
    publishLeaderboardUpdate(roomCode, sortedLeaderboard);
    publishAnswerStats(roomCode, serializeQuestionStats(session.currentQuestionStats));
};

module.exports = {
    shuffleArray,
    createQuestionStats,
    serializeQuestionStats,
    formatQuestion,
    broadcastQuestionEnhanced,
    republishCurrentQuestion,
};
