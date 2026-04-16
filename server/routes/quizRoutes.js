const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const analyticsService = require('../services/analytics/analytics.service');
const validate = require('../middleware/validate');
const {
    createQuiz,
    addQuestion,
    getQuizByCode,
    getMyQuizzes,
    getUserHistory,
    gethostStats,
    getSubjectLeaderboard,
    getQuizLeaderboard,
    updateQuiz,
    deleteQuiz,
    updateQuestion,
    deleteQuestion,
    startQuizSession,
    startLiveSession,
    abortSession,
    pauseSession,
    resumeSession,
    nextQuestion,
    revealAnswer,
    endQuizSession,
    getAnswerStats,
    scheduleQuiz,
    joinScheduledSession,
    getMyScheduledJoins,
    getSessionResults,
    getSessionParticipants,
    exportSessionParticipants,
    getQuizSessions,
    updateQuizFullState,
} = require('../controllers/quizController');

const quizService = require('../services/quiz/quiz.service');
const requireRole = require('../middleware/requireRole');
const { requireQuizOwnership } = require('../middleware/auth');

const joinLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many join attempts. Please try again shortly.' },
});

const createQuizValidators = [
    requireRole(['host', 'admin']),
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('type').isIn(['quiz', 'subject']).withMessage('Invalid quiz type'),
    body('mode').optional().isIn(['auto', 'teaching', 'tutor']).withMessage('Invalid quiz mode'),
    body('accessType').optional().isIn(['public', 'private']).withMessage('Invalid access type'),
    body('allowedEmails').optional().isArray().withMessage('allowedEmails must be an array'),
    body('allowedEmails.*').optional().isEmail().withMessage('Each allowed email must be valid'),
    body('quizCategory').optional({ nullable: true }).isIn(['regular', 'internal', 'external', 'subject-syllabus', 'hackathon', 'interview']).withMessage('Invalid quiz category'),
    body('price').custom((value, { req }) => {
        if (req.body.isPaid && (value === undefined || value < 0)) {
            throw new Error('Valid price is required for paid quizzes');
        }
        return true;
    }),
    validate
];


router.post('/templates/new', createQuizValidators, createQuiz);
router.post('/', createQuizValidators, createQuiz);
router.get('/templates', requireRole(['host', 'admin']), getMyQuizzes);
router.get('/subject/:subjectId/leaderboard', requireRole(['host', 'admin', 'participant']), getSubjectLeaderboard);
router.get('/host/history', requireRole(['host', 'admin']), gethostStats);
router.get('/user/history', requireRole(['participant', 'host', 'admin']), getUserHistory);

// Participant scheduled-session routes
router.get('/user/scheduled-joins', requireRole(['participant', 'host', 'admin']), getMyScheduledJoins);
router.post('/join-scheduled/:roomCode', joinLimiter, requireRole(['participant', 'host', 'admin']), joinScheduledSession);

// Session results
router.get('/session/:sessionCode/results', requireRole(['host', 'admin']), getSessionResults);
router.get('/session/:sessionCode/participants', requireRole(['host', 'admin']), getSessionParticipants);
router.get('/session/:sessionCode/participants/export', requireRole(['host', 'admin']), exportSessionParticipants);
router.get('/session/:sessionCode/stats', requireRole(['host', 'admin', 'participant']), getAnswerStats);
router.get('/templates/:templateId/sessions', requireRole(['host', 'admin']), requireQuizOwnership, getQuizSessions);
router.post('/templates/:templateId/session', requireRole(['host', 'admin']), requireQuizOwnership, startQuizSession);

// Quiz CRUD
router.put('/:id', requireRole(['host', 'admin']), updateQuiz);
router.put('/:id/full-state', requireRole(['host', 'ad min']), updateQuizFullState);
router.post('/:id/start', requireRole(['host', 'admin']), requireQuizOwnership, startQuizSession);
router.post('/:id/start-live', requireRole(['host', 'admin']), requireQuizOwnership, startLiveSession);
router.post('/:id/abort', requireRole(['host', 'admin']), requireQuizOwnership, abortSession);
router.post('/:id/pause', requireRole(['host', 'admin']), requireQuizOwnership, pauseSession);
router.post('/:id/resume', requireRole(['host', 'admin']), requireQuizOwnership, resumeSession);
router.post('/:id/next-question', requireRole(['host', 'admin']), requireQuizOwnership, nextQuestion);
router.post('/:id/reveal-answer', requireRole(['host', 'admin']), requireQuizOwnership, revealAnswer);
router.post('/:id/end', requireRole(['host', 'admin']), requireQuizOwnership, endQuizSession);
router.post('/:id/complete', requireRole(['host', 'admin']), requireQuizOwnership, endQuizSession);
router.post('/:id/schedule', requireRole(['host', 'admin']), requireQuizOwnership, scheduleQuiz);
router.get('/:id/sessions', requireRole(['host', 'admin']), requireQuizOwnership, getQuizSessions);
router.delete('/:id', requireRole(['host', 'admin']), requireQuizOwnership, deleteQuiz);

router.post('/:id/questions', [
    requireRole(['host', 'admin']),
    body('text').trim().notEmpty().withMessage('Question text is required'),
    body('options').isArray({ min: 4, max: 4 }).withMessage('Exactly 4 options are required'),
    body('correctOption').isInt({ min: 0, max: 3 }).withMessage('Correct option must be between 0 and 3'),
    validate
], addQuestion);
router.put('/:quizId/questions/:questionId', requireRole(['host', 'admin']), updateQuestion);
router.delete('/:quizId/questions/:questionId', requireRole(['host', 'admin']), deleteQuestion);

router.get('/:id/leaderboard', requireRole(['host', 'admin', 'participant']), getQuizLeaderboard);

// Room code lookup
router.get('/:roomCode', requireRole(['host', 'admin', 'participant']), getQuizByCode);

module.exports = router;
