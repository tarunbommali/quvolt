const Quiz = require('../models/Quiz');
const openaiProvider = require('../services/ai/providers/openai.provider');
const { sendSuccess, sendError } = require('../utils/controllerHelpers');
const logger = require('../utils/logger');

// [I18N] AI Translation Controller
const translateSlides = async (req, res) => {
    try {
        const { quizId } = req.params;
        const { slideIds, targetLanguages, sourceLanguage } = req.body;

        if (!slideIds || !targetLanguages || !Array.isArray(targetLanguages)) {
            return sendError(res, 400, 'slideIds and targetLanguages array are required');
        }

        const quiz = await Quiz.findById(quizId);
        if (!quiz) return sendError(res, 404, 'Quiz not found');

        // Feature gate check: Free users should not hit this endpoint
        const userPlan = req.user.subscription?.plan || 'FREE';
        if (userPlan === 'FREE') {
            return sendError(res, 403, 'AI Translation is a premium feature');
        }

        const questionsToTranslate = slideIds.includes('all') 
            ? quiz.questions 
            : quiz.questions.filter(q => slideIds.includes(q._id.toString()));

        for (const question of questionsToTranslate) {
            for (const targetLang of targetLanguages) {
                // Prepare prompt
                const sourcePayload = {
                    question: question.text,
                    options: question.options
                };
                
                const prompt = `Translate the following quiz question and its options to language code: ${targetLang}.
Return ONLY a JSON object in this exact shape, no extra text:
{ "question": "...", "options": ["...", "...", "...", "..."] }
Preserve option order exactly. Do not translate proper nouns, code snippets, or technical terms unless they have a widely used native equivalent.
Source: ${JSON.stringify(sourcePayload)}`;

                try {
                    const aiResponse = await openaiProvider.translateContent(sourceLanguage, targetLang, sourcePayload);
                    
                    if (aiResponse && aiResponse.question && aiResponse.options) {
                        if (!question.translations) question.translations = new Map();
                        question.translations.set(targetLang, {
                            text: aiResponse.question,
                            options: aiResponse.options
                        });
                    }
                } catch (err) {
                    logger.error(`[I18N] Translation failed for slide ${question._id} to ${targetLang}`, { error: err.message });
                }
            }
        }

        await quiz.save();
        return sendSuccess(res, { quiz }, 'Translation completed successfully');
    } catch (error) {
        logger.error('[Translate Controller]', { message: error.message, stack: error.stack });
        return sendError(res, 500, 'Server Error during translation');
    }
};

module.exports = {
    translateSlides
};
