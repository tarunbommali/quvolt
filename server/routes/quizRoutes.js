const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const analyticsService = require('../services/analytics/analytics.service');
const validate = require('../middleware/validate');
const quizController = require('../controllers/quiz.controller');
const questionController = require('../controllers/question.controller');
const sessionController = require('../controllers/session.controller');
const sessionControllerOop = require('../controllers/session.controller.oop');
const analyticsController = require('../controllers/analytics.controller');
const accessController = require('../controllers/access.controller');

const quizService = require('../services/quiz/quiz.service');
const requireRole = require('../middleware/requireRole');
const { requireQuizOwnership, checkQuizAccess } = require('../middleware/auth');
const { checkPermission } = require('../middleware/checkPermission');

const joinLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many join attempts. Please try again shortly.' },
});

const createQuizValidators = [
    requireRole(['host', 'admin']),
    checkPermission('create_quiz'), // Requirement 8.1: Enforce create_quiz permission
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('type').isIn(['quiz', 'subject']).withMessage('Invalid quiz type'),
    body('mode').optional().isIn(['auto', 'teaching', 'tutor']).withMessage('Invalid quiz mode'),
    body('accessType').optional().isIn(['public', 'private', 'shared']).withMessage('Invalid access type'),
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


router.post('/templates/new', createQuizValidators, quizController.createQuiz);
router.post('/', createQuizValidators, quizController.createQuiz);
router.get('/templates', requireRole(['host', 'admin']), quizController.getMyQuizzes);
router.get('/subject/:subjectId/leaderboard', requireRole(['host', 'admin', 'participant']), analyticsController.getSubjectLeaderboard);
router.get('/host/history', requireRole(['host', 'admin']), analyticsController.gethostStats);
router.get('/user/history', requireRole(['participant', 'host', 'admin']), analyticsController.getUserHistory);

// Participant scheduled-session routes
router.get('/user/scheduled-joins', requireRole(['participant', 'host', 'admin']), sessionController.getMyScheduledJoins);
router.post('/join-scheduled/:roomCode', joinLimiter, requireRole(['participant', 'host', 'admin']), sessionController.joinScheduledSession);

// Session results
router.get('/session/:sessionCode/results', requireRole(['host', 'admin']), analyticsController.getSessionResults);
router.get('/session/:sessionCode/participants', requireRole(['host', 'admin']), analyticsController.getSessionParticipants);
router.get('/session/:sessionCode/participants/export', requireRole(['host', 'admin']), analyticsController.exportSessionParticipants);
router.get('/session/:sessionCode/stats', requireRole(['host', 'admin', 'participant']), sessionController.getAnswerStats);
router.get('/session/:code/state', requireRole(['host', 'admin', 'participant']), sessionController.getSessionState);

// Session access control (Requirements 10.3, 10.5)
router.put('/session/:sessionCode/access', [
    requireRole(['host', 'admin']),
    body('accessType').optional().isIn(['inherit', 'public', 'private', 'shared']).withMessage('Invalid access type'),
    body('allowedEmails').optional().isArray().withMessage('allowedEmails must be an array'),
    body('allowedEmails.*').optional().isEmail().withMessage('Each allowed email must be valid'),
    body('sharedWith').optional().isArray().withMessage('sharedWith must be an array'),
    body('sharedWith.*').optional().isMongoId().withMessage('Each sharedWith ID must be a valid MongoDB ID'),
    validate
], accessController.updateSessionAccessPolicy);

router.get('/templates/:templateId/sessions', requireRole(['host', 'admin']), requireQuizOwnership, quizController.getQuizSessions);
router.post('/templates/:templateId/session', [
    requireRole(['host', 'admin']),
    requireQuizOwnership,
    body('accessType').optional().isIn(['inherit', 'public', 'private', 'shared']).withMessage('Invalid access type'),
    body('allowedEmails').optional().isArray().withMessage('allowedEmails must be an array'),
    body('allowedEmails.*').optional().isEmail().withMessage('Each allowed email must be valid'),
    body('sharedWith').optional().isArray().withMessage('sharedWith must be an array'),
    body('sharedWith.*').optional().isMongoId().withMessage('Each sharedWith ID must be a valid MongoDB ID'),
    validate
], sessionController.startQuizSession);

// Quiz CRUD
router.put('/:id', requireRole(['host', 'admin']), quizController.updateQuiz);
router.put('/:id/full-state', requireRole(['host', 'admin']), requireQuizOwnership, questionController.updateQuizFullState);
router.post('/:id/start', [
    requireRole(['host', 'admin']),
    requireQuizOwnership,
    body('accessType').optional().isIn(['inherit', 'public', 'private', 'shared']).withMessage('Invalid access type'),
    body('allowedEmails').optional().isArray().withMessage('allowedEmails must be an array'),
    body('allowedEmails.*').optional().isEmail().withMessage('Each allowed email must be valid'),
    body('sharedWith').optional().isArray().withMessage('sharedWith must be an array'),
    body('sharedWith.*').optional().isMongoId().withMessage('Each sharedWith ID must be a valid MongoDB ID'),
    validate
], sessionController.startQuizSession);
router.post('/:id/start-live', requireRole(['host', 'admin']), requireQuizOwnership, sessionControllerOop.startLiveSession);
router.post('/:id/abort', requireRole(['host', 'admin']), requireQuizOwnership, sessionController.abortSession);
router.post('/:id/pause', requireRole(['host', 'admin']), requireQuizOwnership, sessionControllerOop.pauseSession);
router.post('/:id/resume', requireRole(['host', 'admin']), requireQuizOwnership, sessionControllerOop.resumeSession);
router.post('/:id/next-question', requireRole(['host', 'admin']), requireQuizOwnership, sessionController.nextQuestion);
router.post('/:id/reveal-answer', requireRole(['host', 'admin']), requireQuizOwnership, sessionController.revealAnswer);
router.post('/:id/end', requireRole(['host', 'admin']), requireQuizOwnership, sessionControllerOop.endSession);
router.post('/:id/complete', requireRole(['host', 'admin']), requireQuizOwnership, sessionControllerOop.endSession);
router.post('/:id/schedule', [
    requireRole(['host', 'admin']),
    requireQuizOwnership,
    body('scheduledAt').notEmpty().withMessage('scheduledAt is required'),
    body('accessType').optional().isIn(['inherit', 'public', 'private', 'shared']).withMessage('Invalid access type'),
    body('allowedEmails').optional().isArray().withMessage('allowedEmails must be an array'),
    body('allowedEmails.*').optional().isEmail().withMessage('Each allowed email must be valid'),
    body('sharedWith').optional().isArray().withMessage('sharedWith must be an array'),
    body('sharedWith.*').optional().isMongoId().withMessage('Each sharedWith ID must be a valid MongoDB ID'),
    validate
], sessionController.scheduleQuiz);
router.get('/:id/sessions', requireRole(['host', 'admin']), requireQuizOwnership, quizController.getQuizSessions);
router.delete('/:id', requireRole(['host', 'admin']), requireQuizOwnership, quizController.deleteQuiz);

// Access grant management endpoints (Requirements 8.6, 8.7)
router.post('/:id/access/grant', [
    requireRole(['host', 'admin']),
    requireQuizOwnership,
    body('userId').optional().isMongoId().withMessage('Invalid user ID'),
    body('email').optional().isEmail().withMessage('Invalid email'),
    validate
], accessController.grantQuizAccess);
router.delete('/:id/access/revoke/:userId', requireRole(['host', 'admin']), requireQuizOwnership, accessController.revokeQuizAccess);
router.get('/:id/access', requireRole(['host', 'admin']), requireQuizOwnership, accessController.getQuizAccessList);

router.post('/:id/questions', [
    requireRole(['host', 'admin']),
    body('text').trim().notEmpty().withMessage('Question text is required'),
    body('options').isArray({ min: 4, max: 4 }).withMessage('Exactly 4 options are required'),
    body('correctOption').isInt({ min: 0, max: 3 }).withMessage('Correct option must be between 0 and 3'),
    validate
], questionController.addQuestion);
router.put('/:quizId/questions/:questionId', requireRole(['host', 'admin']), questionController.updateQuestion);
router.delete('/:quizId/questions/:questionId', requireRole(['host', 'admin']), questionController.deleteQuestion);

router.get('/:id/leaderboard', requireRole(['host', 'admin', 'participant']), checkQuizAccess, analyticsController.getQuizLeaderboard);

// Room code lookup - Requirements 8.3, 8.4, 8.5: Check access policy
router.get('/:roomCode', requireRole(['host', 'admin', 'participant']), checkQuizAccess, quizController.getQuizByCode);

module.exports = router;
