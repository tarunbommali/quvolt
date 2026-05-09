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

router.post('/guest-login', [
    body('name').notEmpty().withMessage('Name is required'),
    validate
], authController.guestLogin);

router.post('/refresh', authController.refresh);
router.post('/logout', authController.logoutUser);
// protectFull: getMyProfile reads req.user.name/email/profilePhoto directly from middleware
router.get('/me', protectFull, authController.getMyProfile);
router.put('/me', protect, [
    body('name').optional().isString().trim().isLength({ min: 2, max: 80 }).withMessage('Name must be between 2 and 80 characters'),
    body('profilePhoto').optional().isString().withMessage('profilePhoto must be a string'),
    body('participantProfile').optional().isObject().withMessage('participantProfile must be an object'),
    body('profile').optional().isObject().withMessage('profile must be an object'),
    body('creator').optional().isObject().withMessage('creator must be an object'),
    body('organization').optional().isObject().withMessage('organization must be an object'),
    validate
], authController.updateMyProfile);

module.exports = router;
