const Quiz = require('../models/Quiz');
const { sendSuccess, sendError } = require('../utils/controllerHelpers');
const logger = require('../utils/logger');

// ── AI Translation ──────────────────────────────────────────────────────────

const translateSlides = async (req, res) => {
    try {
        const { quizId } = req.params;
        const { slideIds, targetLanguages, sourceLanguage } = req.body;

        if (!slideIds || !targetLanguages || !Array.isArray(targetLanguages)) {
            return sendError(res, 'slideIds and targetLanguages array are required', 400);
        }

        // Check if OpenAI is configured before attempting translation
        if (!process.env.OPENAI_API_KEY) {
            return sendError(res, 'AI Translation is not available — OPENAI_API_KEY is not configured. Use manual JSON upload instead.', 503);
        }

        const quiz = await Quiz.findById(quizId);
        if (!quiz) return sendError(res, 'Quiz not found', 404);

        const openaiProvider = require('../services/ai/providers/openai.provider');

        const questionsToTranslate = slideIds.includes('all')
            ? quiz.questions
            : quiz.questions.filter(q => slideIds.includes(q._id.toString()));

        let translated = 0;
        let failed = 0;

        for (const question of questionsToTranslate) {
            for (const targetLang of targetLanguages) {
                const sourcePayload = {
                    question: question.text,
                    options: question.options,
                };

                try {
                    const aiResponse = await openaiProvider.translateContent(sourceLanguage, targetLang, sourcePayload);

                    if (aiResponse?.question && aiResponse?.options) {
                        if (!question.translations) question.translations = new Map();
                        question.translations.set(targetLang, {
                            text: aiResponse.question,
                            options: aiResponse.options,
                        });
                        translated += 1;
                    } else {
                        failed += 1;
                    }
                } catch (err) {
                    failed += 1;
                    logger.error(`[I18N] Translation failed for slide ${question._id} to ${targetLang}`, { error: err.message });
                }
            }
        }

        await quiz.save();
        return sendSuccess(res, { translated, failed }, `Translation completed: ${translated} succeeded, ${failed} failed`);
    } catch (error) {
        logger.error('[Translate Controller] translateSlides', { message: error.message, stack: error.stack });
        return sendError(res, 'Server Error during translation');
    }
};

// ── Manual JSON Import ──────────────────────────────────────────────────────
//
// Expected body shape:
// {
//   "translations": {
//     "<questionId>": {
//       "<langCode>": { "text": "...", "options": ["...", "..."] }
//     }
//   }
// }
//
// OR bulk shape (applies same translations by question index):
// {
//   "translationsByIndex": [
//     { "<langCode>": { "text": "...", "options": ["...", "..."] } },
//     ...
//   ]
// }

const importTranslations = async (req, res) => {
    try {
        const { quizId } = req.params;
        const { translations, translationsByIndex } = req.body;

        if (!translations && !translationsByIndex) {
            return sendError(res, 'Provide either "translations" (keyed by question ID) or "translationsByIndex" (array by question index)', 400);
        }

        const quiz = await Quiz.findById(quizId);
        if (!quiz) return sendError(res, 'Quiz not found', 404);

        // Verify ownership
        if (req.user.role !== 'admin' && String(quiz.hostId) !== String(req.user._id)) {
            return sendError(res, 'Forbidden', 403);
        }

        let applied = 0;

        if (translationsByIndex && Array.isArray(translationsByIndex)) {
            // Index-based import
            for (let i = 0; i < Math.min(translationsByIndex.length, quiz.questions.length); i++) {
                const langMap = translationsByIndex[i];
                if (!langMap || typeof langMap !== 'object') continue;

                const question = quiz.questions[i];
                if (!question.translations) question.translations = new Map();

                for (const [langCode, data] of Object.entries(langMap)) {
                    if (data?.text && Array.isArray(data?.options)) {
                        question.translations.set(langCode, {
                            text: data.text,
                            options: data.options,
                            explanation: data.explanation || '',
                        });
                        applied += 1;
                    }
                }
            }
        } else if (translations && typeof translations === 'object') {
            // ID-based import
            const questionMap = new Map(quiz.questions.map(q => [q._id.toString(), q]));

            for (const [questionId, langMap] of Object.entries(translations)) {
                const question = questionMap.get(questionId);
                if (!question || typeof langMap !== 'object') continue;

                if (!question.translations) question.translations = new Map();

                for (const [langCode, data] of Object.entries(langMap)) {
                    if (data?.text && Array.isArray(data?.options)) {
                        question.translations.set(langCode, {
                            text: data.text,
                            options: data.options,
                            explanation: data.explanation || '',
                        });
                        applied += 1;
                    }
                }
            }
        }

        await quiz.save();
        return sendSuccess(res, { applied }, `Imported ${applied} translation(s) successfully`);
    } catch (error) {
        logger.error('[Translate Controller] importTranslations', { message: error.message, stack: error.stack });
        return sendError(res, 'Server Error during import');
    }
};

module.exports = {
    translateSlides,
    importTranslations,
};
