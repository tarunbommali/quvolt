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

const translateContent = async (sourceLanguage, targetLanguage, sourcePayload) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');

    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const prompt = `Translate the following quiz question and its options to language code: ${targetLanguage}.
Return ONLY a JSON object in this exact shape, no extra text or markdown formatting:
{ "question": "...", "options": ["...", "...", "...", "..."] }
Preserve option order exactly. Do not translate proper nouns, code snippets, or technical terms unless they have a widely used native equivalent.
Source: ${JSON.stringify(sourcePayload)}`;

    const response = await axios.post(
        `${baseUrl}/chat/completions`,
        {
            model,
            temperature: 0.1,
            max_tokens: 1000,
            messages: [
                {
                    role: 'system',
                    content: 'You are a technical translator. Output only valid JSON without markdown wrapping.',
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
            timeout: 30000,
        },
    );

    let content = response?.data?.choices?.[0]?.message?.content || '{}';
    // Clean markdown if present
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(content);
};

module.exports = {
    providerName: 'openai',
    generate,
    translateContent,
};
