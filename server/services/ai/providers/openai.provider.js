/**
 * OpenAI AI Provider Implementation
 */
const axios = require('axios');
const { buildPrompt } = require('../utils/ai.prompt');
const { extractJSONArray, normalizeQuestions } = require('../utils/ai.validation');
const logger = require('../../../utils/logger');

const generate = async ({ topic, difficulty, count }) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');

    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const prompt = buildPrompt({ topic, difficulty, count });

    logger.debug('OpenAI Generation Request', { topic, difficulty, count });

    const response = await axios.post(
        `${baseUrl}/chat/completions`,
        {
            model,
            temperature: 0.2,
            max_tokens: 2000, // Safety limit
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
            timeout: 45000, // Production-grade timeout
        },
    );

    const content = response?.data?.choices?.[0]?.message?.content;
    const parsed = extractJSONArray(content);
    return normalizeQuestions(parsed, difficulty);
};

module.exports = {
    providerName: 'openai',
    generate,
};
