const Quiz = require('../models/Quiz');
const { hashAnswer } = require('../utils/crypto');
const logger = require('../utils/logger');
const { resolveHostSubscriptionEntitlements } = require('../utils/subscriptionEntitlements');
const { 
    buildQuizAccessQuery,
    sendSuccess,
    sendError,
} = require('../utils/controllerHelpers');

const addQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { text, options, correctOption, timeLimit, shuffleOptions } = req.body;

        if (!text || !options || options.length < 2 || correctOption === undefined) {
            return sendError(res, 'Question text, at least 2 options, and a correct option index are required', 400);
        }

        const quizQuery = req.user.role === 'admin'
            ? { _id: id }
            : { _id: id, hostId: req.user._id };
        const quiz = await Quiz.findOne(quizQuery);
        if (!quiz) return sendError(res, 'Quiz not found', 404);

        const entitlements = await resolveHostSubscriptionEntitlements(quiz.hostId);
        
        if (quiz.questions.length >= entitlements.maxQuestionsPerQuiz) {
            logger.warn('QUIZ_LIMIT_HIT', { 
                userId: req.user?._id, 
                plan: entitlements.plan, 
                attempted: quiz.questions.length + 1 
            });
            return sendError(res, `Your plan limits you to ${entitlements.maxQuestionsPerQuiz} questions per quiz.`, 403);
        }

        if (options.length > entitlements.maxOptionsPerQuestion) {
            return sendError(res, `Your plan limits you to ${entitlements.maxOptionsPerQuestion} options per question.`, 403);
        }

        if (correctOption < 0 || correctOption >= options.length) {
            return sendError(res, 'Invalid correct option index', 400);
        }

        const sanitizedText = String(text || '').trim().slice(0, 300);
        const sanitizedOptions = options.map((opt) => String(opt || '').trim().slice(0, 200));
        const hashedCorrectAnswer = hashAnswer(sanitizedOptions[correctOption]);

        quiz.questions.push({ 
            text: sanitizedText, 
            options: sanitizedOptions, 
            correctOption, 
            hashedCorrectAnswer, 
            timeLimit: Math.min(Number(timeLimit) || 15, 60), 
            shuffleOptions: !!shuffleOptions 
        });
        await quiz.save();

        return sendSuccess(res, quiz, 'Question added successfully');
    } catch (error) {
        logger.error('[QuestionController] addQuestion', { message: error.message, stack: error.stack });
        return sendError(res, 'Server Error');
    }
};

const updateQuestion = async (req, res) => {
    try {
        const { quizId, questionId } = req.params;
        const { text, options, correctOption, timeLimit, shuffleOptions } = req.body;

        const quiz = await Quiz.findOne(buildQuizAccessQuery(req, quizId));
        if (!quiz) return sendError(res, 'Quiz not found', 404);

        const question = quiz.questions.id(questionId);
        if (!question) return sendError(res, 'Question not found', 404);

        const entitlements = await resolveHostSubscriptionEntitlements(quiz.hostId);

        if (options) {
            if (options.length > entitlements.maxOptionsPerQuestion) {
                return sendError(res, `Your plan limits you to ${entitlements.maxOptionsPerQuestion} options per question.`, 403);
            }
            if (options.length < 2) {
                return sendError(res, 'At least 2 options are required', 400);
            }
            question.options = options.map((opt) => String(opt || '').trim().slice(0, 200));
        }

        if (text) question.text = String(text || '').trim().slice(0, 300);
        
        if (correctOption !== undefined) {
            const targetOptions = options || question.options;
            if (correctOption < 0 || correctOption >= targetOptions.length) {
                return sendError(res, 'Invalid correct option index', 400);
            }
            question.correctOption = correctOption;
            question.hashedCorrectAnswer = hashAnswer(targetOptions[correctOption]);
        }
        
        if (timeLimit) question.timeLimit = Math.min(Number(timeLimit) || 15, 60);
        if (shuffleOptions !== undefined) question.shuffleOptions = shuffleOptions;

        await quiz.save();
        return sendSuccess(res, quiz, 'Question updated successfully');
    } catch (error) {
        logger.error('[QuestionController] updateQuestion', { message: error.message, stack: error.stack });
        return sendError(res, 'Server Error');
    }
};

const deleteQuestion = async (req, res) => {
    try {
        const { quizId, questionId } = req.params;
        const quiz = await Quiz.findOne(buildQuizAccessQuery(req, quizId));
        if (!quiz) return sendError(res, 'Quiz not found', 404);

        quiz.questions.pull(questionId);
        await quiz.save();
        return sendSuccess(res, quiz, 'Question deleted successfully');
    } catch (error) {
        logger.error('[QuestionController] deleteQuestion', { message: error.message, stack: error.stack });
        return sendError(res, 'Server Error');
    }
};

const updateQuizFullState = async (req, res) => {
    try {
        const { id } = req.params;
        const { slides, order, config } = req.body;

        if (!Array.isArray(slides)) {
            return sendError(res, 'slides must be an array', 400);
        }

        if (!Array.isArray(order)) {
            return sendError(res, 'order must be an array', 400);
        }

        const quiz = await Quiz.findOne(buildQuizAccessQuery(req, id));
        if (!quiz) return sendError(res, 'Quiz not found', 404);

        const entitlements = await resolveHostSubscriptionEntitlements(quiz.hostId);

        const existingCount = quiz.questions.length;
        const incomingCount = slides.length;

        if (incomingCount > entitlements.maxQuestionsPerQuiz) {
            logger.warn('QUIZ_LIMIT_HIT', { 
                userId: req.user?._id, 
                plan: entitlements.plan, 
                attempted: incomingCount 
            });
            return sendError(res, `Your plan limits you to ${entitlements.maxQuestionsPerQuiz} questions per quiz.`, 403);
        }

        if (incomingCount - existingCount > 100) {
            logger.warn('QUIZ_DIFF_LIMIT_HIT', { 
                userId: req.user?._id, 
                existingCount, 
                incomingCount, 
                diff: incomingCount - existingCount 
            });
            return sendError(res, 'Too many changes in one request. Max bulk addition is 100 questions at a time.', 400);
        }

        const uniqueQuestions = new Set();

        const normalizedSlides = slides.map((slide, index) => {
            const text = String(slide?.text || '').trim().slice(0, 300);
            
            if (!text || text.length < 3) {
                throw new Error(`Slide ${index + 1} is missing or has an invalid question text`);
            }

            if (uniqueQuestions.has(text.toLowerCase())) {
                throw new Error(`Duplicate question detected: "${text}"`);
            }
            uniqueQuestions.add(text.toLowerCase());

            const options = Array.isArray(slide?.options)
                ? slide.options.map((option) => String(option || '').trim().slice(0, 200)).filter(Boolean)
                : [];
            
            const correctOption = Number.isInteger(slide?.correctOption)
                ? slide.correctOption
                : Number(slide?.correctOption ?? 0);

            if (options.length < 2) {
                throw new Error(`Slide ${index + 1} must contain at least 2 options`);
            }
            
            if (options.length > entitlements.maxOptionsPerQuestion) {
                throw new Error(`Slide ${index + 1} exceeds max options limit (${entitlements.maxOptionsPerQuestion})`);
            }

            if (!Number.isInteger(correctOption) || correctOption < 0 || correctOption >= options.length) {
                throw new Error(`Slide ${index + 1} has an invalid correctOption`);
            }

            return {
                _id: slide?._id,
                text,
                options,
                correctOption,
                hashedCorrectAnswer: hashAnswer(options[correctOption]),
                timeLimit: Math.min(Number(slide?.timeLimit) || 15, 60),
                shuffleOptions: Boolean(slide?.shuffleOptions),
                questionType: slide?.questionType || 'multiple-choice',
                mediaUrl: slide?.mediaUrl || null,
                clientId: String(slide?.clientId || slide?._id || ''),
            };
        });

        const orderedSlides = [];
        for (const key of order) {
            const keyString = String(key || '');
            const match = normalizedSlides.find((slide) => String(slide.clientId || slide._id || '') === keyString);
            if (match) orderedSlides.push(match);
        }

        for (const slide of normalizedSlides) {
            if (!orderedSlides.includes(slide)) {
                orderedSlides.push(slide);
            }
        }

        quiz.questions = orderedSlides.map((slide) => ({
            ...(slide._id ? { _id: slide._id } : {}),
            text: String(slide.text).slice(0, 300),
            options: (slide.options || []).map(opt => String(opt).slice(0, 200)),
            correctOption: Number(slide.correctOption),
            hashedCorrectAnswer: String(slide.hashedCorrectAnswer),
            difficulty: ['easy', 'medium', 'hard'].includes(slide.difficulty) ? slide.difficulty : 'easy',
            timeLimit: Math.min(Number(slide.timeLimit) || 15, 60),
            explanation: String(slide.explanation || '').slice(0, 500),
            shuffleOptions: Boolean(slide.shuffleOptions),
            questionType: slide.questionType === 'multiple-choice' ? 'multiple-choice' : 'multiple-choice',
            mediaUrl: slide.mediaUrl && typeof slide.mediaUrl === 'string' ? slide.mediaUrl.slice(0, 500) : null,
        }));

        if (config && typeof config === 'object') {
            if (typeof config.shuffleQuestions === 'boolean') {
                quiz.shuffleQuestions = config.shuffleQuestions;
            }
            if (Number.isFinite(config.interQuestionDelay)) {
                quiz.interQuestionDelay = Number(config.interQuestionDelay);
            }
            if (typeof config.mode === 'string') {
                quiz.mode = config.mode === 'teaching' ? 'tutor' : config.mode;
            }
        }

        await quiz.save();
        logger.audit('quiz.full_state.updated', {
            requestId: req.requestId,
            userId: req.user?._id,
            quizId: id,
            slideCount: quiz.questions.length,
        });
        return sendSuccess(res, quiz, 'Quiz state updated successfully');
    } catch (error) {
        logger.error('[QuestionController] updateQuizFullState', { message: error.message, stack: error.stack });
        if (error.message?.includes('Slide') || error.message?.includes('Duplicate question')) {
            return sendError(res, error.message, 400);
        }
        return sendError(res, 'Server Error');
    }
};

module.exports = {
    addQuestion,
    updateQuestion,
    deleteQuestion,
    updateQuizFullState,
};
