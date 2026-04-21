const rbacService = require('../rbac/rbac.service');
const Quiz = require('../../models/Quiz');
const QuizSession = require('../../models/QuizSession');
const Subscription = require('../../models/Subscription');
const { getPlanConfig } = require('../../config/plans');
const logger = require('../../utils/logger');

/**
 * Session Access Control Service
 * Handles session-level access control with RBAC integration and SaaS monetization
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */
class SessionAccessControlService {
  /**
   * Check if a user can join a session
   * Requirements: 10.1, 10.2, 10.4, SaaS Monetization
   * 
   * @param {Object} user - User object with _id, email, role
   * @param {Object} quiz - Quiz object
   * @param {Object} session - QuizSession object (optional)
   * @returns {Promise<{allowed: boolean, reason?: string}>}
   */
  async canJoinSession(user, quiz, session = null) {
    try {
      // 1. Resolve host subscription and plan limits (SaaS Monetization)
      const hostId = quiz.hostId;
      const subscription = await Subscription.findOne({
        hostId,
        status: 'active',
      }).lean();
      
      const plan = subscription ? subscription.plan : 'FREE';
      const planConfig = getPlanConfig(plan);
      
      // Determine participant limit
      const participantLimit = subscription?.participantLimit || planConfig.maxParticipantsPerSession;

      // 2. Check participant limit (unless host/admin)
      if (user.role !== 'admin' && user.role !== 'host') {
        const currentCount = session?.participantCount || (session?.participants ? Object.keys(session.participants).length : 0);
        
        if (currentCount >= participantLimit) {
          logger.warn('Session join denied: participant limit reached', {
            userId: user._id,
            quizId: quiz._id,
            limit: participantLimit,
            currentCount,
          });
          return {
            allowed: false,
            reason: plan === 'FREE' 
              ? 'This session has reached the free participant limit. The host needs to upgrade to allow more players.'
              : 'This session has reached its participant limit.',
          };
        }
      }

      // Admins and hosts bypass further access control checks
      if (user.role === 'admin' || user.role === 'host') {
        return { allowed: true };
      }

      // Requirement 10.1: Verify join_quiz permission
      const hasJoinPermission = await rbacService.checkPermission(
        user._id,
        'join_quiz'
      );

      if (!hasJoinPermission) {
        logger.warn('Session join denied: missing join_quiz permission', {
          userId: user._id,
          quizId: quiz._id,
        });
        return {
          allowed: false,
          reason: 'You do not have permission to join quiz sessions',
        };
      }

      // Determine effective access policy
      let effectiveAccessType = quiz.accessType || 'public';
      let effectiveAllowedEmails = quiz.allowedEmails || [];
      let effectiveSharedWith = quiz.sharedWith || [];

      if (session && session.accessType !== 'inherit') {
        effectiveAccessType = session.accessType;
        effectiveAllowedEmails = session.allowedEmails || [];
        effectiveSharedWith = session.sharedWith || [];
      }

      // Requirement 10.2: Private quiz/session access control
      if (effectiveAccessType === 'private') {
        const allowedEmailsSet = new Set(
          effectiveAllowedEmails.map(email => String(email || '').trim().toLowerCase())
        );
        const userEmail = String(user.email || '').trim().toLowerCase();

        if (!userEmail || !allowedEmailsSet.has(userEmail)) {
          logger.warn('Session join denied: private access, email not allowed', {
            userId: user._id,
            quizId: quiz._id,
            sessionId: session?._id,
            userEmail,
          });
          return {
            allowed: false,
            reason: 'This session is private. Only invited users can join.',
          };
        }
      }

      // Shared access control
      if (effectiveAccessType === 'shared') {
        const isOwner = String(quiz.hostId) === String(user._id);
        const hasSharedAccess = effectiveSharedWith.some(
          userId => String(userId) === String(user._id)
        );

        if (!isOwner && !hasSharedAccess) {
          logger.warn('Session join denied: shared access, user not in sharedWith', {
            userId: user._id,
            quizId: quiz._id,
            sessionId: session?._id,
          });
          return {
            allowed: false,
            reason: 'You do not have access to join this session.',
          };
        }
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Session access check error', {
        error: error.message,
        userId: user._id,
        quizId: quiz._id,
      });
      return {
        allowed: false,
        reason: 'Unable to verify session access',
      };
    }
  }

  /**
   * Update session-specific access policy
   * Requirement 10.3: Allow hosts to manage session access independently
   */
  async updateSessionAccessPolicy(sessionId, hostId, accessPolicy) {
    try {
      const session = await QuizSession.findById(sessionId);
      if (!session) {
        return { success: false, message: 'Session not found' };
      }

      const quiz = await Quiz.findById(session.quizId);
      if (!quiz) {
        return { success: false, message: 'Quiz not found' };
      }

      // Verify host ownership or admin role
      if (String(quiz.hostId) !== String(hostId)) {
        const user = await require('../../models/User').findById(hostId);
        if (!user || user.role !== 'admin') {
          return { success: false, message: 'Unauthorized: Only the host can update session access' };
        }
      }

      // Update session access policy
      if (accessPolicy.accessType) session.accessType = accessPolicy.accessType;
      if (accessPolicy.allowedEmails) session.allowedEmails = accessPolicy.allowedEmails;
      if (accessPolicy.sharedWith) session.sharedWith = accessPolicy.sharedWith;

      await session.save();

      logger.info('Session access policy updated', {
        sessionId,
        hostId,
        accessType: session.accessType,
      });

      return { success: true };
    } catch (error) {
      logger.error('Error updating session access policy', {
        error: error.message,
        sessionId,
        hostId,
      });
      return { success: false, message: 'Failed to update session access policy' };
    }
  }
}

module.exports = new SessionAccessControlService();
