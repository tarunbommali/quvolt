const Quiz = require('../../models/Quiz');
const QuizSession = require('../../models/QuizSession');
const axios = require('axios');
const logger = require('../../utils/logger');
const { SESSION_STATUS } = require('../../utils/sessionStateMachine');

// Dependency Injection / Circular Dependency Control
const lifecycle = require('../session/session.lifecycle.service');
const join = require('../session/session.join.service');
const answer = require('../gameplay/answer.service');
const question = require('../gameplay/question.service');
const timer = require('../session/session.timer.service');
const realtime = require('../session/session.realtime.service');

const utils = require('./quiz.utils.service');

const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:5001';
const ALLOWED_QUIZ_CATEGORIES = ['regular', 'internal', 'external', 'subject-syllabus', 'hackathon', 'interview'];

const advanceQuizQuestion = async ({ io, quizId, sessionCode, user }) => {
    const context = await utils.resolveQuizActionContext({ user, quizId, sessionCode });
    if (context.error) return context;

    const { roomCode } = context;
    const sessionStore = require('../session/session.service');
    const session = await sessionStore.getSession(roomCode);
    
    if (!session || session.isPaused) return { error: 'Session not found or paused', statusCode: 409 };

    session.currentQuestionIndex += 1;
    await sessionStore.setSession(roomCode, session);

    await question.broadcastQuestionEnhanced(io, roomCode);
    return { roomCode, message: 'Advanced to next question' };
};

module.exports = {
    // Data Logic (Delegated to Utils to break circularity)
    ALLOWED_QUIZ_CATEGORIES,
    buildQuizAccessQuery: utils.buildQuizAccessQuery,
    buildhostScopeQuery: utils.buildhostScopeQuery,
    findQuizAndActiveSession: utils.findQuizAndActiveSession,
    resolveQuizActionContext: utils.resolveQuizActionContext,
    ensureParticipantHasPaidAccess: utils.ensureParticipantHasPaidAccess,

    // Lifecycle (Delegated)
    startQuizSession: lifecycle.startQuizSession,
    pauseQuizSession: lifecycle.pauseQuizSession,
    resumeQuizSession: lifecycle.resumeQuizSession,
    endQuizSession: lifecycle.endQuizSession,
    abortQuizSession: lifecycle.abortQuizSession,
    rebootQuizzes: lifecycle.rebootQuizzes,
    revealAnswer: lifecycle.revealAnswer,

    // Join/Leave (Delegated)
    joinRoom: join.joinRoom,
    leaveRoom: join.leaveRoom,
    mergeParticipantMaps: join.mergeParticipantMaps,

    // Gameplay (Delegated)
    submitAnswer: answer.submitAnswer,
    calculateAnswerStats: answer.calculateAnswerStats,
    broadcastQuestionEnhanced: question.broadcastQuestionEnhanced,
    republishCurrentQuestion: question.republishCurrentQuestion,
    formatQuestion: question.formatQuestion,
    shuffleArray: question.shuffleArray,

    // Timer (Delegated)
    startDistributedTimerWorker: timer.startDistributedTimerWorker,
    advanceQuizQuestion, // Kept here as it's a bridge between session and question

    // Realtime (Delegated)
    emitWithCompression: realtime.emitWithCompression,
};