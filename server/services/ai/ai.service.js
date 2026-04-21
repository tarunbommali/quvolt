/**
 * AI Service (Refactored for Production SaaS)
 * Handles orchestration, parallelization, rate-limiting, and caching.
 */
const Quiz = require('../../models/Quiz');
const { hashAnswer } = require('../../utils/crypto');
const logger = require('../../utils/logger');
const { getRedisClient } = require('../../config/redis');

// Sub-modules
const validation = require('./utils/ai.validation');
const { sanitizeTopic } = require('./utils/ai.prompt');
const cache = require('./utils/ai.cache');
const openai = require('./providers/openai.provider');

// Constants
const AI_MAX_RETRIES = 2;
const RATE_LIMITS = {
    FREE: 5,
    CREATOR: 100,
    TEAMS: 500,
};

/**
 * Plan-Aware AI Rate Limiter
 */
const checkRateLimit = async (user) => {
    const redis = getRedisClient();
    if (!redis?.isOpen) return true; // Fail open if Redis is down

    const userId = user._id.toString();
    const plan = user.plan || 'FREE';
    const limit = RATE_LIMITS[plan] || RATE_LIMITS.FREE;
    
    const today = new Date().toISOString().split('T')[0];
    const key = `ai_limit:${userId}:${today}`;

    const current = await redis.incr(key);
    if (current === 1) {
        await redis.expire(key, 86400); // 1 day
    }

    if (current > limit) {
        logger.warn('AI Rate Limit Exceeded', { userId, plan, current, limit });
        throw new Error(`Your daily AI question generation limit has been reached (${limit} for ${plan} plan).`);
    }
    return true;
};

/**
 * Parallel Question Generation with Fallbacks and Retries
 */
const generateQuestionsWithRetry = async ({ topic, difficulty, count, avoidSet = new Set() }) => {
    let lastError = null;
    const accepted = [];
    const used = new Set([...avoidSet].map((t) => String(t).toLowerCase()));

    for (let attempt = 0; attempt <= AI_MAX_RETRIES && accepted.length < count; attempt += 1) {
        try {
            const remaining = count - accepted.length;
            // Strategy: Cache Check per Level
            const cacheParams = { topic, difficulty, count: remaining };
            let generated = await cache.getCachedQuestions(cacheParams);

            if (!generated) {
                generated = await openai.generate({ topic, difficulty, count: remaining });
                // We only cache full successful responses at the base level if needed, 
                // but usually, it's better to cache individual results if granularity is needed.
                // For now, we cache the base batch.
                await cache.setCachedQuestions(cacheParams, generated);
            }

            for (const q of generated) {
                const key = q.text.toLowerCase();
                if (used.has(key)) continue;
                used.add(key);
                accepted.push(q);
                if (accepted.length >= count) break;
            }
        } catch (error) {
            logger.warn('AI Generation Attempt Failed', { attempt, error: error.message });
            lastError = error;
        }
    }

    if (accepted.length > 0) return accepted.slice(0, count);
    throw lastError || new Error('AI Generation failed after retries');
};

/**
 * Orchestrates Generation with Distribution (Parallelized)
 */
const generateWithDistribution = async ({ topic, count, distribution, user }) => {
    await checkRateLimit(user);
    
    // 1. Calculate how many per level
    const plan = calculateDifficultyCounts(count, distribution);
    const levels = Object.entries(plan).filter(([, val]) => val > 0);

    logger.info('Starting Parallel AI Generation', { topic, plan });

    // 2. Parallelize API calls
    const results = await Promise.all(
        levels.map(([level, amount]) => 
            generateQuestionsWithRetry({
                topic,
                difficulty: level,
                count: amount
            })
        )
    );

    // 3. Merge and Shuffle Result
    const questions = shuffleArray(results.flat());
    
    return {
        questions: questions.slice(0, count),
        meta: {
            easy: plan.easy || 0,
            medium: plan.medium || 0,
            hard: plan.hard || 0,
            provider: 'openai'
        }
    };
};

/**
 * Logic to split counts based on distribution percentages
 */
const calculateDifficultyCounts = (count, distribution) => {
    const exact = {
        easy: (distribution.easy / 100) * count,
        medium: (distribution.medium / 100) * count,
        hard: (distribution.hard / 100) * count,
    };

    const base = {
        easy: Math.floor(exact.easy),
        medium: Math.floor(exact.medium),
        hard: Math.floor(exact.hard),
    };

    let allocated = base.easy + base.medium + base.hard;
    const order = ['easy', 'medium', 'hard']
        .map((k) => ({ k, frac: exact[k] - base[k] }))
        .sort((a, b) => b.frac - a.frac);

    let cursor = 0;
    while (allocated < count) {
        base[order[cursor % order.length].k] += 1;
        allocated += 1;
        cursor += 1;
    }
    return base;
};

const shuffleArray = (items) => {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

const toQuizQuestion = (question) => ({
    text: question.text,
    options: question.options,
    correctOption: question.correctOption,
    hashedCorrectAnswer: hashAnswer(question.correctAnswer),
    timeLimit: 15,
    shuffleOptions: true,
    questionType: 'multiple-choice',
    explanation: question.explanation
});

const saveQuestionsToQuiz = async ({ quizId, questions, user }) => {
    const quiz = await Quiz.findOne(
        user.role === 'admin'
            ? { _id: quizId }
            : { _id: quizId, hostId: user._id },
    );

    if (!quiz) throw new Error('Quiz not found or not authorized');

    const toInsert = questions.map(toQuizQuestion);
    quiz.questions.push(...toInsert);
    await quiz.save();

    return quiz;
};

module.exports = {
    validateGenerateInput: validation.validateGenerateInput,
    generateWithDistribution,
    saveQuestionsToQuiz,
};
