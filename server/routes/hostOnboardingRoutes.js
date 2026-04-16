const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const requireRole = require('../middleware/requireRole');
const {
    registerHost,
    getMyHostProfile,
    upsertMyHostProfile,
    getAdminHostInsights,
    getAdminHosts,
} = require('../controllers/hostOnboardingController');

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
    body('agreements.commissionAccepted').custom((value) => value === true).withMessage('Commission agreement must be accepted'),
    body('agreements.payoutPolicyAccepted').custom((value) => value === true).withMessage('Payout policy must be accepted'),
    validate,
], registerHost);

router.get('/me', requireRole(['host', 'admin']), getMyHostProfile);

router.put('/me', requireRole(['host', 'admin']), [
    body('domains').optional().isArray(),
    validate,
], upsertMyHostProfile);

router.get('/admin/insights', requireRole(['admin']), getAdminHostInsights);
router.get('/admin/list', requireRole(['admin']), getAdminHosts);

module.exports = router;
