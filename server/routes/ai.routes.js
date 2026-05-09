const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const requireRole = require('../middleware/requireRole');
const aiService = require('../services/ai/ai.service');
const validation = require('../services/ai/utils/ai.validation');
const { resolveHostSubscriptionEntitlements } = require('../utils/subscriptionEntitlements');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

const AI_MAX_COUNT = validation.AI_MAX_COUNT_CREATOR;

const router = express.Router();

const aiGenerateLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many AI generation requests. Please try again later.' },
});

const isDistributionStep = (value) => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100 && Number(value) % 5 === 0;

router.post(
    '/generate-quiz',
    aiGenerateLimiter,
    requireRole(['host', 'admin']),
    [
        body('topic').optional({ nullable: true }).isString().trim(),
        body('difficulty').optional({ nullable: true }).isIn(['easy', 'medium', 'hard']),
        body('count').optional({ nullable: true }).isInt({ min: 1, max: AI_MAX_COUNT }),
        body('distribution').optional({ nullable: true }).isObject(),
        body('distribution.easy').optional({ nullable: true }).custom(isDistributionStep),
        body('distribution.medium').optional({ nullable: true }).custom(isDistributionStep),
        body('distribution.hard').optional({ nullable: true }).custom(isDistributionStep),
        body('quizId').optional({ nullable: true }).isMongoId(),
        body('persist').optional({ nullable: true }).isBoolean(),
        body('questions').optional({ nullable: true }).isArray({ min: 1 }),
        validate,
    ],
    async (req, res) => {
        try {
            if (req.user.role !== 'admin') {
                const entitlements = await resolveHostSubscriptionEntitlements(req.user._id);
                if (!entitlements.canUseAiGeneration) {
                    return res.status(403).json({
                        message: 'AI quiz generation is available on Creator and Teams plans. Upgrade your subscription to continue.',
                    });
                }

                try {
                    const redis = getRedisClient();
                    if (redis?.isOpen) {
                        const today = new Date().toISOString().split('T')[0];
                        const usageKey = `ai_quota:${req.user._id}:${today}`;
                        const currentUsage = await redis.get(usageKey);
                        
                        if (currentUsage && parseInt(currentUsage, 10) >= entitlements.maxAIRequestsPerDay) {
                            logger.warn("AI_QUOTA_HIT", {
                                userId: req.user._id,
                                plan: entitlements.plan,
                                limit: entitlements.maxAIRequestsPerDay
                            });
                            return res.status(429).json({ message: `AI quota exceeded. Your plan allows ${entitlements.maxAIRequestsPerDay} generations per day.` });
                        }
                        
                        // Increment quota usage
                        await redis.incr(usageKey);
                        await redis.expire(usageKey, 60 * 60 * 24); // expire in 24 hours
                    }
                } catch (redisErr) {
                    logger.warn('Redis error during AI quota check', { error: redisErr.message });
                    // Fail open if Redis is down, we don't want to break the feature completely.
                }
            }

            const {
                topic,
                difficulty,
                count,
                distribution,
                quizId,
                persist = false,
                questions: prebuiltQuestions,
            } = req.body;

            let meta = null;
            const normalizedQuestions = Array.isArray(prebuiltQuestions) && prebuiltQuestions.length
                ? validation.normalizeQuestions(prebuiltQuestions)
                : await aiService.generateWithDistribution({
                    ...aiService.validateGenerateInput({ topic, difficulty, count, distribution, user: req.user }),
                    user: req.user
                });

            const finalQuestions = Array.isArray(normalizedQuestions)
                ? normalizedQuestions
                : normalizedQuestions.questions;

            if (!Array.isArray(normalizedQuestions)) {
                meta = normalizedQuestions.meta;
            }

            let savedQuiz = null;
            if (persist) {
                if (!quizId) {
                    return res.status(400).json({ message: 'quizId is required when persist=true' });
                }

                savedQuiz = await aiService.saveQuestionsToQuiz({
                    quizId,
                    questions: finalQuestions,
                    user: req.user,
                });
            }

            return res.json({
                questions: finalQuestions,
                meta,
                savedToQuiz: Boolean(savedQuiz),
                savedCount: savedQuiz ? finalQuestions.length : 0,
                quiz: savedQuiz || null,
            });
        } catch (error) {
            const statusCode = /not found|not authorized/i.test(error.message) ? 404 : 400;
            return res.status(statusCode).json({ message: error.message || 'Failed to generate quiz' });
        }
    },
);

module.exports = router;
