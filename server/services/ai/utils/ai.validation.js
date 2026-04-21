/**
 * AI Input and Response Validation Utilities
 */

const AI_MAX_COUNT_CREATOR = 20;
const AI_MAX_COUNT_FREE = 5;
const DISTRIBUTION_STEP = 5;

const extractJSONArray = (raw) => {
    if (Array.isArray(raw)) return raw;
    if (!raw || typeof raw !== 'string') {
        throw new Error('AI response did not contain valid text output');
    }

    const trimmed = raw.trim();

    try {
        const direct = JSON.parse(trimmed);
        if (Array.isArray(direct)) return direct;
        if (Array.isArray(direct?.questions)) return direct.questions;
    } catch {
        // Continue to regex
    }

    const match = trimmed.match(/\[[\s\S]*\]/);
    if (!match) {
        throw new Error('Unable to parse JSON array from AI response');
    }

    try {
        const parsed = JSON.parse(match[0]);
        if (!Array.isArray(parsed)) {
            throw new Error('AI response JSON was not an array');
        }
        return parsed;
    } catch (e) {
        throw new Error('AI response contained invalid JSON block');
    }
};

const normalizeQuestion = (input, index, difficultyHint = 'medium') => {
    const text = String(input?.text || '').trim();
    const options = Array.isArray(input?.options)
        ? input.options.map((opt) => String(opt || '').trim()).filter(Boolean)
        : [];
    const correctAnswer = String(input?.correctAnswer || '').trim();
    const explanation = String(input?.explanation || '').trim();

    if (!text) throw new Error(`Question ${index + 1}: missing text`);
    if (options.length !== 4) throw new Error(`Question ${index + 1}: must have exactly 4 options`);

    const uniqueOptions = new Set(options.map((opt) => opt.toLowerCase()));
    if (uniqueOptions.size !== 4) throw new Error(`Question ${index + 1}: options must be unique`);

    const correctOptionIndex = options.findIndex((opt) => opt === correctAnswer);
    if (correctOptionIndex < 0) throw new Error(`Question ${index + 1}: correctAnswer must match one option exactly`);

    return {
        text,
        options,
        correctAnswer,
        correctOption: correctOptionIndex,
        explanation,
        difficulty: difficultyHint,
        timeLimit: 15,
        shuffleOptions: true,
        questionType: 'multiple-choice',
    };
};

const normalizeQuestions = (items, difficultyHint = 'medium') => {
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error('No questions returned by AI');
    }

    const normalized = items.map((item, index) => normalizeQuestion(item, index, difficultyHint));

    const dedupedByText = new Set();
    const result = [];
    for (const question of normalized) {
        const key = question.text.toLowerCase();
        if (dedupedByText.has(key)) continue;
        dedupedByText.add(key);
        result.push(question);
    }

    if (!result.length) throw new Error('All generated questions were duplicates');
    return result;
};

const validateGenerateInput = ({ topic, difficulty, count, distribution, user }) => {
    const allowedDifficulty = new Set(['easy', 'medium', 'hard']);
    
    // Plan-aware max count
    const plan = user?.plan || 'FREE';
    const maxCount = plan === 'FREE' ? AI_MAX_COUNT_FREE : AI_MAX_COUNT_CREATOR;

    if (!topic || !String(topic).trim()) {
        throw new Error('Topic is required');
    }

    const numericCount = Number(count);
    if (!Number.isInteger(numericCount) || numericCount < 1 || numericCount > maxCount) {
        throw new Error(`Count must be an integer between 1 and ${maxCount} for your current plan (${plan})`);
    }

    let normalizedDistribution = null;
    if (difficulty && !allowedDifficulty.has(String(difficulty).toLowerCase())) {
        throw new Error('Difficulty must be one of: easy, medium, hard');
    }

    if (typeof distribution === 'object' && distribution !== null) {
        const easy = Number(distribution.easy ?? 0);
        const medium = Number(distribution.medium ?? 0);
        const hard = Number(distribution.hard ?? 0);

        if (![easy, medium, hard].every((v) => Number.isFinite(v) && v >= 0 && v <= 100 && v % DISTRIBUTION_STEP === 0)) {
            throw new Error('Distribution values must be multiples of 5 between 0 and 100');
        }

        if (Math.round(easy + medium + hard) !== 100) {
            throw new Error('Distribution percentages must total 100');
        }

        normalizedDistribution = { easy, medium, hard };
    } else {
        const selectedDifficulty = String(difficulty || 'medium').toLowerCase();
        normalizedDistribution = {
            easy: selectedDifficulty === 'easy' ? 100 : 0,
            medium: selectedDifficulty === 'medium' ? 100 : 0,
            hard: selectedDifficulty === 'hard' ? 100 : 0,
        };
    }

    return {
        topic: String(topic).trim(),
        difficulty: String(difficulty || 'medium').toLowerCase(),
        distribution: normalizedDistribution,
        count: numericCount,
    };
};

module.exports = {
    AI_MAX_COUNT_FREE,
    AI_MAX_COUNT_CREATOR,
    extractJSONArray,
    normalizeQuestions,
    validateGenerateInput,
};
