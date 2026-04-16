const axios = require('axios');
const Quiz = require('../../models/Quiz');
const { hashAnswer } = require('../../utils/crypto');

const AI_MAX_COUNT = 20;
const DISTRIBUTION_STEP = 5;

const shuffleArray = (items) => {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

const buildPrompt = ({ topic, difficulty, count }) => `Generate ${count} multiple-choice questions on the topic '${topic}' with ${difficulty} difficulty.

Return ONLY valid JSON in the following format:
[
  {
    "text": "Question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Exact correct option text",
    "explanation": "Short explanation"
  }
]

Rules:
- Each question must have exactly 4 options
- correctAnswer must match one of the options exactly
- Avoid duplicates
- Keep questions clear and concise
- Difficulty must reflect ${difficulty} level
- Do NOT include any extra text outside JSON`;

const sanitizeTopic = (topic) => String(topic || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

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
        // Try regex extraction below
    }

    const match = trimmed.match(/\[[\s\S]*\]/);
    if (!match) {
        throw new Error('Unable to parse JSON array from AI response');
    }

    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) {
        throw new Error('AI response JSON was not an array');
    }
    return parsed;
};

const normalizeQuestion = (input, index, difficultyHint = 'medium') => {
    const text = String(input?.text || '').trim();
    const options = Array.isArray(input?.options)
        ? input.options.map((opt) => String(opt || '').trim()).filter(Boolean)
        : [];
    const correctAnswer = String(input?.correctAnswer || '').trim();
    const explanation = String(input?.explanation || '').trim();

    if (!text) {
        throw new Error(`Question ${index + 1}: missing text`);
    }

    if (options.length !== 4) {
        throw new Error(`Question ${index + 1}: must have exactly 4 options`);
    }

    const uniqueOptions = new Set(options.map((opt) => opt.toLowerCase()));
    if (uniqueOptions.size !== 4) {
        throw new Error(`Question ${index + 1}: options must be unique`);
    }

    const correctOptionIndex = options.findIndex((opt) => opt === correctAnswer);
    if (correctOptionIndex < 0) {
        throw new Error(`Question ${index + 1}: correctAnswer must match one option exactly`);
    }

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

    if (!result.length) {
        throw new Error('All generated questions were duplicates');
    }

    return result;
};

const callOpenAI = async ({ topic, difficulty, count }) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not configured');
    }

    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const prompt = buildPrompt({ topic, difficulty, count });

    const response = await axios.post(
        `${baseUrl}/chat/completions`,
        {
            model,
            temperature: 0.2,
            messages: [
                {
                    role: 'system',
                    content: 'You are a strict MCQ generator. Output only valid JSON.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        },
        {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            timeout: 45000,
        },
    );

    const content = response?.data?.choices?.[0]?.message?.content;
    const parsed = extractJSONArray(content);
    return normalizeQuestions(parsed, difficulty);
};

const generateQuestionsWithRetry = async ({ topic, difficulty, count, retries = 2, avoidSet = new Set() }) => {
    const accepted = [];
    const used = new Set([...avoidSet].map((text) => String(text).toLowerCase()));
    let lastError = null;

    for (let attempt = 0; attempt <= retries && accepted.length < count; attempt += 1) {
        try {
            const remaining = Math.max(1, count - accepted.length);
            const generated = await callOpenAI({ topic, difficulty, count: remaining });
            for (const question of generated) {
                const key = question.text.toLowerCase();
                if (used.has(key)) continue;
                used.add(key);
                accepted.push(question);
                if (accepted.length >= count) break;
            }
        } catch (error) {
            lastError = error;
        }
    }

    if (accepted.length >= count) {
        return accepted.slice(0, count);
    }

    throw new Error(lastError?.message || 'AI generation failed');
};

const calculateDifficultyCounts = (count, distribution) => {
    const ratios = {
        easy: (Number(distribution.easy) || 0) / 100,
        medium: (Number(distribution.medium) || 0) / 100,
        hard: (Number(distribution.hard) || 0) / 100,
    };

    const exact = {
        easy: ratios.easy * count,
        medium: ratios.medium * count,
        hard: ratios.hard * count,
    };

    const base = {
        easy: Math.floor(exact.easy),
        medium: Math.floor(exact.medium),
        hard: Math.floor(exact.hard),
    };

    let allocated = base.easy + base.medium + base.hard;
    const order = ['easy', 'medium', 'hard']
        .map((key) => ({ key, frac: exact[key] - base[key] }))
        .sort((a, b) => b.frac - a.frac);

    let cursor = 0;
    while (allocated < count) {
        const target = order[cursor % order.length]?.key || 'easy';
        base[target] += 1;
        allocated += 1;
        cursor += 1;
    }

    return base;
};

const generateWithDistribution = async ({ topic, count, distribution }) => {
    const plan = calculateDifficultyCounts(count, distribution);
    const usedTexts = new Set();

    const byDifficulty = { easy: [], medium: [], hard: [] };
    for (const level of ['easy', 'medium', 'hard']) {
        if (plan[level] <= 0) continue;
        const generated = await generateQuestionsWithRetry({
            topic,
            difficulty: level,
            count: plan[level],
            avoidSet: usedTexts,
        });

        generated.forEach((question) => usedTexts.add(question.text.toLowerCase()));
        byDifficulty[level] = generated;
    }

    const merged = shuffleArray([...byDifficulty.easy, ...byDifficulty.medium, ...byDifficulty.hard]).slice(0, count);

    return {
        questions: merged,
        meta: {
            easy: byDifficulty.easy.length,
            medium: byDifficulty.medium.length,
            hard: byDifficulty.hard.length,
        },
    };
};

const toQuizQuestion = (question) => ({
    text: question.text,
    options: question.options,
    correctOption: question.correctOption,
    hashedCorrectAnswer: hashAnswer(question.correctAnswer),
    timeLimit: question.timeLimit ?? 15,
    shuffleOptions: question.shuffleOptions ?? true,
    questionType: question.questionType || 'multiple-choice',
});

const saveQuestionsToQuiz = async ({ quizId, questions, user }) => {
    const quiz = await Quiz.findOne(
        user.role === 'admin'
            ? { _id: quizId }
            : { _id: quizId, hostId: user._id },
    );

    if (!quiz) {
        throw new Error('Quiz not found or not authorized');
    }

    const toInsert = questions.map(toQuizQuestion);
    quiz.questions.push(...toInsert);
    await quiz.save();

    return quiz;
};

const validateGenerateInput = ({ topic, difficulty, count, distribution }) => {
    const allowedDifficulty = new Set(['easy', 'medium', 'hard']);
    const safeTopic = sanitizeTopic(topic);
    if (!safeTopic) {
        throw new Error('topic is required');
    }

    const numericCount = Number(count);
    if (!Number.isInteger(numericCount) || numericCount < 1 || numericCount > AI_MAX_COUNT) {
        throw new Error(`count must be an integer between 1 and ${AI_MAX_COUNT}`);
    }

    let normalizedDistribution = null;
    if (difficulty !== undefined && difficulty !== null && !allowedDifficulty.has(String(difficulty || '').toLowerCase())) {
        throw new Error('difficulty must be one of: easy, medium, hard');
    }

    if (typeof distribution === 'object' && distribution !== null) {
        const easy = Number(distribution.easy ?? 0);
        const medium = Number(distribution.medium ?? 0);
        const hard = Number(distribution.hard ?? 0);

        if (![easy, medium, hard].every((v) => Number.isFinite(v) && v >= 0 && v <= 100 && v % DISTRIBUTION_STEP === 0)) {
            throw new Error('distribution values must be multiples of 5 between 0 and 100');
        }

        const total = easy + medium + hard;
        if (Math.round(total) !== 100) {
            throw new Error('distribution percentages must total 100');
        }

        normalizedDistribution = { easy, medium, hard };
    } else {
        const selectedDifficulty = String(difficulty || 'easy').toLowerCase();
        normalizedDistribution = {
            easy: selectedDifficulty === 'easy' ? 100 : 0,
            medium: selectedDifficulty === 'medium' ? 100 : 0,
            hard: selectedDifficulty === 'hard' ? 100 : 0,
        };
    }

    return {
        topic: safeTopic,
        difficulty: String(difficulty || 'easy').toLowerCase(),
        distribution: normalizedDistribution,
        count: numericCount,
    };
};

module.exports = {
    AI_MAX_COUNT,
    buildPrompt,
    extractJSONArray,
    normalizeQuestions,
    validateGenerateInput,
    generateQuestionsWithRetry,
    generateWithDistribution,
    calculateDifficultyCounts,
    saveQuestionsToQuiz,
};
