const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, protectFull } = require('../middleware/auth');
const authController = require('../controllers/auth.controller');

router.post('/register', [
    body('email').isEmail().withMessage('Enter a valid email'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('name').notEmpty().withMessage('Name is required'),
    body('role').optional().isIn(['participant', 'host']).withMessage('Invalid role'),
    validate
], authController.registerUser);

router.post('/login', [
    body('email').isEmail().withMessage('Enter a valid email'),
    body('password').exists().withMessage('Password is required'),
    validate
], authController.loginUser);

router.post('/refresh', authController.refresh);
router.post('/logout', authController.logoutUser);
// protectFull: getMyProfile reads req.user.name/email/profilePhoto directly from middleware
router.get('/me', protectFull, authController.getMyProfile);
router.put('/me', protect, [
    body('name').optional().isString().trim().isLength({ min: 2, max: 80 }).withMessage('Name must be between 2 and 80 characters'),
    body('profilePhoto').optional().isString().withMessage('profilePhoto must be a string'),
    body('participantProfile').optional().isObject().withMessage('participantProfile must be an object'),
    body('participantProfile.phone').optional().isString().trim().isLength({ max: 30 }).withMessage('participantProfile.phone must be 30 characters or less'),
    body('participantProfile.city').optional().isString().trim().isLength({ max: 80 }).withMessage('participantProfile.city must be 80 characters or less'),
    body('participantProfile.bio').optional().isString().trim().isLength({ max: 280 }).withMessage('participantProfile.bio must be 280 characters or less'),
    body('hostProfile').optional().isObject().withMessage('hostProfile must be an object'),
    body('hostProfile.institutionName').optional().isString().trim().isLength({ max: 120 }).withMessage('Institution name must be 120 characters or less'),
    body('hostProfile.institutionType').optional().isString().trim().isLength({ max: 80 }).withMessage('Institution type must be 80 characters or less'),
    body('hostProfile.institutionWebsite').optional().isString().trim().isLength({ max: 200 }).withMessage('Institution website must be 200 characters or less'),
    body('hostProfile.institutionAddress').optional().isString().trim().isLength({ max: 200 }).withMessage('Institution address must be 200 characters or less'),
    body('hostProfile.contactEmail').optional().isString().trim().isLength({ max: 120 }).withMessage('Contact email must be 120 characters or less'),
    body('hostProfile.contactPhone').optional().isString().trim().isLength({ max: 30 }).withMessage('Contact phone must be 30 characters or less'),
    validate
], authController.updateMyProfile);

module.exports = router;
