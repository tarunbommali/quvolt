const logger = require('../../utils/logger');
const sessionStore = require('./session.service');

const activeTimers = new Map();
let globalIoRef = null;

const getGlobalIo = () => globalIoRef;
const setGlobalIo = (io) => {
    globalIoRef = io;
};

const { publishTimerEnd, publishTimerUpdate } = require('../timer/timer.publisher');

const clearTimers = async (roomCode) => {
    ['advance', 'broadcast', 'tutor_review'].forEach(action => {
        const key = `${roomCode}:${action}`;
        if (activeTimers.has(key)) {
            clearTimeout(activeTimers.get(key));
            activeTimers.delete(key);
        }
        sessionStore.clearDistributedTimer(key).catch(() => {});
    });
};

const scheduleNextAction = (roomCode, action, delayMs) => {
    const key = `${roomCode}:${action}`;
    if (activeTimers.has(key)) {
        clearTimeout(activeTimers.get(key));
    }
    const timeout = setTimeout(async () => {
        activeTimers.delete(key);
        try {
            const session = await sessionStore.getSession(roomCode);
            if (!session || session.isPaused) {
                logger.debug(`Skipping action ${action} - session not found or paused`, { roomCode });
                return;
            }

            if (action === 'advance') {
                publishTimerEnd(roomCode);
                
                session.currentQuestionIndex += 1;
                await sessionStore.setSession(roomCode, session);
                logger.info(`Advanced to question ${session.currentQuestionIndex}`, { roomCode });
                
                const delay = session.interQuestionDelay ?? 1500;
                scheduleNextAction(roomCode, 'broadcast', delay);
            } else if (action === 'broadcast') {
                logger.info(`Broadcasting question ${session.currentQuestionIndex}`, { roomCode });
                // Circular dependency avoidance: require here or move logic
                const { broadcastQuestionEnhanced } = require('../gameplay/question.service');
                const io = require('./session.timer.service').getGlobalIo(); 
                if (io) await broadcastQuestionEnhanced(io, roomCode);
            } else if (action === 'tutor_review') {
                const { SESSION_STATUS } = require('../../utils/sessionStateMachine');
                if (['waiting', 'live'].includes(session.status)) {
                    session.questionState = 'review';
                    await sessionStore.setSession(roomCode, session);
                    const io = require('./session.timer.service').getGlobalIo();
                    if (io) io.to(roomCode).emit('question_review_mode', { message: 'Answer phase ended' });
                }
            }
        } catch (error) {
            logger.error(`Timer action ${action} failed`, { roomCode, error: error.message, stack: error.stack });
        }
    }, delayMs);
    logger.debug(`Scheduled next action '${action}' for room ${roomCode} in ${delayMs}ms`);
    activeTimers.set(key, timeout);
};

const startDistributedTimerWorker = (io) => {
    globalIoRef = io;
};

module.exports = {
    clearTimers,
    scheduleNextAction,
    startDistributedTimerWorker,
    getGlobalIo,
    setGlobalIo,
};
