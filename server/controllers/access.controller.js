const Quiz = require('../models/Quiz');
const QuizSession = require('../models/QuizSession');
const User = require('../models/User');
const logger = require('../utils/logger');
const { 
    sendSuccess, 
    sendError, 
} = require('../utils/controllerHelpers');

const grantQuizAccess = async (req, res) => {
    try {
        const quizId = req.params.id || req.params.quizId;
        const { userId, email } = req.body;

        if (!quizId) return sendError(res, 400, 'Quiz ID is required');
        if (!userId && !email) return sendError(res, 400, 'User ID or email is required');

        const quiz = await Quiz.findById(quizId);
        if (!quiz) return sendError(res, 404, 'Quiz not found');

        if (req.user.role !== 'admin' && String(quiz.hostId) !== String(req.user._id)) {
            return sendError(res, 403, 'Only the quiz owner can grant access');
        }

        let targetUser;
        if (userId) {
            targetUser = await User.findById(userId);
        } else if (email) {
            targetUser = await User.findOne({ email: email.toLowerCase() });
        }

        if (!targetUser) return sendError(res, 404, 'User not found');
        if (quiz.accessType !== 'shared') {
            return sendError(res, 400, 'Quiz must have "shared" access type to grant access to users');
        }

        const alreadyHasAccess = quiz.sharedWith.some(id => String(id) === String(targetUser._id));
        if (alreadyHasAccess) return sendError(res, 400, 'User already has access to this quiz');

        quiz.sharedWith.push(targetUser._id);
        await quiz.save();

        logger.info('Quiz access granted', { quizId: quiz._id, grantedBy: req.user._id, grantedTo: targetUser._id });

        return sendSuccess(res, {
            quizId: quiz._id,
            userId: targetUser._id,
            userName: targetUser.name,
            userEmail: targetUser.email,
        }, 'Access granted successfully');
    } catch (error) {
        logger.error('[AccessController] grantQuizAccess', { message: error.message, stack: error.stack });
        return sendError(res, 500, 'Server error');
    }
};

const revokeQuizAccess = async (req, res) => {
    try {
        const quizId = req.params.id || req.params.quizId;
        const { userId } = req.params;

        if (!quizId || !userId) return sendError(res, 400, 'Quiz ID and User ID are required');

        const quiz = await Quiz.findById(quizId);
        if (!quiz) return sendError(res, 404, 'Quiz not found');

        if (req.user.role !== 'admin' && String(quiz.hostId) !== String(req.user._id)) {
            return sendError(res, 403, 'Only the quiz owner can revoke access');
        }

        const hasAccess = quiz.sharedWith.some(id => String(id) === String(userId));
        if (!hasAccess) return sendError(res, 400, 'User does not have access to this quiz');

        quiz.sharedWith = quiz.sharedWith.filter(id => String(id) !== String(userId));
        await quiz.save();

        logger.info('Quiz access revoked', { quizId: quiz._id, revokedBy: req.user._id, revokedFrom: userId });

        return sendSuccess(res, { quizId: quiz._id, userId }, 'Access revoked successfully');
    } catch (error) {
        logger.error('[AccessController] revokeQuizAccess', { message: error.message, stack: error.stack });
        return sendError(res, 500, 'Server error');
    }
};

const getQuizAccessList = async (req, res) => {
    try {
        const quizId = req.params.id || req.params.quizId;
        if (!quizId) return sendError(res, 400, 'Quiz ID is required');

        const quiz = await Quiz.findById(quizId).populate('sharedWith', 'name email');
        if (!quiz) return sendError(res, 404, 'Quiz not found');

        if (req.user.role !== 'admin' && String(quiz.hostId) !== String(req.user._id)) {
            return sendError(res, 403, 'Only the quiz owner can view the access list');
        }

        return sendSuccess(res, {
            quizId: quiz._id,
            accessType: quiz.accessType,
            sharedWith: quiz.sharedWith || [],
        }, 'Access list retrieved successfully');
    } catch (error) {
        logger.error('[AccessController] getQuizAccessList', { message: error.message, stack: error.stack });
        return sendError(res, 500, 'Server error');
    }
};

const updateSessionAccessPolicy = async (req, res) => {
    try {
        const sessionCode = req.params.sessionCode;
        const { accessType, allowedEmails, sharedWith } = req.body;

        if (!sessionCode) return sendError(res, 400, 'Session code is required');

        const session = await QuizSession.findOne({ sessionCode: sessionCode.toUpperCase() });
        if (!session) return sendError(res, 404, 'Session not found');

        const quiz = await Quiz.findById(session.quizId);
        if (!quiz) return sendError(res, 404, 'Quiz not found');

        if (req.user.role !== 'admin' && String(quiz.hostId) !== String(req.user._id)) {
            return sendError(res, 403, 'Only the quiz owner can update session access policy');
        }

        const sessionAccessControl = require('../services/session/sessionAccessControl');
        const result = await sessionAccessControl.updateSessionAccessPolicy(
            session._id,
            req.user._id,
            { accessType, allowedEmails, sharedWith }
        );

        if (!result.success) {
            return sendError(res, 400, result.message || 'Failed to update session access policy');
        }

        const updatedSession = await QuizSession.findById(session._id)
            .populate('sharedWith', 'name email')
            .lean();

        return sendSuccess(res, {
            sessionCode: updatedSession.sessionCode,
            accessType: updatedSession.accessType,
            allowedEmails: updatedSession.allowedEmails || [],
            sharedWith: updatedSession.sharedWith || [],
        }, 'Session access policy updated successfully');
    } catch (error) {
        logger.error('[AccessController] updateSessionAccessPolicy', { message: error.message, stack: error.stack });
        return sendError(res, 500, 'Server error');
    }
};

module.exports = {
    grantQuizAccess,
    revokeQuizAccess,
    getQuizAccessList,
    updateSessionAccessPolicy,
};
