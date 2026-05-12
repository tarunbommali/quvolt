const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const requireRole = require('../middleware/requireRole');
const hostController = require('../controllers/host.controller');

const router = express.Router();

router.post('/register', [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Enter a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('orgName').notEmpty().withMessage('Organization name is required'),
    body('domains').isArray({ min: 1 }).withMessage('Select at least one domain'),
    body('hostRole').notEmpty().withMessage('Host role is required'),
    body('audienceSize').notEmpty().withMessage('Audience size is required'),
    body('quizType').notEmpty().withMessage('Quiz type is required'),
    body('agreements.termsAccepted').custom((value) => value === true).withMessage('Terms must be accepted'),
    validate,
], hostController.registerHost);

router.get('/me', requireRole(['host', 'admin']), hostController.getMyHostProfile);

router.put('/me', requireRole(['host', 'admin']), [
    body('domains').optional().isArray(),
    validate,
], hostController.upsertMyHostProfile);

router.get('/admin/insights', requireRole(['admin']), hostController.getAdminHostInsights);
router.get('/admin/list', requireRole(['admin']), hostController.getAdminHosts);

module.exports = router;
