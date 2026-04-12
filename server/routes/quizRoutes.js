const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const {
    createQuiz,
    addQuestion,
    getQuizByCode,
    getMyQuizzes,
    getUserHistory,
    getOrganizerStats,
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
const { protect, authorize, requireQuizOwnership } = require('../middleware/auth');

const joinLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many join attempts. Please try again shortly.' },
});

router.post('/', [
    protect,
    authorize('organizer', 'admin'),
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
], createQuiz);
router.get('/my-quizzes', protect, authorize('organizer', 'admin'), getMyQuizzes);
router.get('/subject/:subjectId/leaderboard', protect, getSubjectLeaderboard);
router.get('/organizer/history', protect, authorize('organizer', 'admin'), getOrganizerStats);
router.get('/user/history', protect, getUserHistory);

// Participant scheduled-session routes (specific paths before /:id/* wildcard)
router.get('/user/scheduled-joins', protect, getMyScheduledJoins);
router.post('/join-scheduled/:roomCode', joinLimiter, protect, joinScheduledSession);

// Session results (must be before /:id/* to avoid Express matching 'session' as :id)
router.get('/session/:sessionCode/results', protect, authorize('organizer', 'admin'), getSessionResults);
router.get('/session/:sessionCode/participants', protect, authorize('organizer', 'admin'), getSessionParticipants);
router.get('/session/:sessionCode/participants/export', protect, authorize('organizer', 'admin'), exportSessionParticipants);
router.get('/session/:sessionCode/stats', protect, getAnswerStats);

// Quiz CRUD (wildcard /:id routes — must be after all specific prefixed routes)
router.put('/:id', protect, authorize('organizer', 'admin'), updateQuiz);
router.put('/:id/full-state', protect, authorize('organizer', 'admin'), updateQuizFullState);
router.post('/:id/start', protect, authorize('organizer', 'admin'), requireQuizOwnership, startQuizSession);
router.post('/:id/start-live', protect, authorize('organizer', 'admin'), requireQuizOwnership, startLiveSession);
router.post('/:id/abort', protect, authorize('organizer', 'admin'), requireQuizOwnership, abortSession);
router.post('/:id/pause', protect, authorize('organizer', 'admin'), requireQuizOwnership, pauseSession);
router.post('/:id/resume', protect, authorize('organizer', 'admin'), requireQuizOwnership, resumeSession);
router.post('/:id/next-question', protect, authorize('organizer', 'admin'), requireQuizOwnership, nextQuestion);
router.post('/:id/reveal-answer', protect, authorize('organizer', 'admin'), requireQuizOwnership, revealAnswer);
router.post('/:id/end', protect, authorize('organizer', 'admin'), requireQuizOwnership, endQuizSession);
router.post('/:id/complete', protect, authorize('organizer', 'admin'), requireQuizOwnership, endQuizSession);
router.post('/:id/schedule', protect, authorize('organizer', 'admin'), requireQuizOwnership, scheduleQuiz);
router.get('/:id/sessions', protect, authorize('organizer', 'admin'), requireQuizOwnership, getQuizSessions);
router.delete('/:id', protect, authorize('organizer', 'admin'), requireQuizOwnership, deleteQuiz);

router.post('/:id/questions', [
    protect,
    authorize('organizer', 'admin'),
    body('text').trim().notEmpty().withMessage('Question text is required'),
    body('options').isArray({ min: 4, max: 4 }).withMessage('Exactly 4 options are required'),
    body('correctOption').isInt({ min: 0, max: 3 }).withMessage('Correct option must be between 0 and 3'),
    validate
], addQuestion);
router.put('/:quizId/questions/:questionId', protect, authorize('organizer', 'admin'), updateQuestion);
router.delete('/:quizId/questions/:questionId', protect, authorize('organizer', 'admin'), deleteQuestion);

router.get('/:id/leaderboard', protect, getQuizLeaderboard);

// Room code lookup — last wildcard (catch-all for participant join flow)
router.get('/:roomCode', protect, getQuizByCode);

module.exports = router;
