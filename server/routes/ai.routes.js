const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const {
    AI_MAX_COUNT,
    generateWithDistribution,
    normalizeQuestions,
    saveQuestionsToQuiz,
    validateGenerateInput,
} = require('../services/ai.service');

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
    protect,
    authorize('organizer', 'admin'),
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
                ? normalizeQuestions(prebuiltQuestions)
                : await generateWithDistribution(validateGenerateInput({ topic, difficulty, count, distribution }));

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

                savedQuiz = await saveQuestionsToQuiz({
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
