const Quiz = require('../models/Quiz');
const { hashAnswer } = require('../utils/crypto');
const logger = require('../utils/logger');
const { 
    buildQuizAccessQuery,
} = require('../utils/controllerHelpers');

const addQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { text, options, correctOption, timeLimit, shuffleOptions } = req.body;

        if (!text || !options || options.length < 2 || correctOption === undefined) {
            return res.status(400).json({ message: 'Question text, at least 2 options, and a correct option index are required' });
        }

        const quizQuery = req.user.role === 'admin'
            ? { _id: id }
            : { _id: id, hostId: req.user._id };
        const quiz = await Quiz.findOne(quizQuery);
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        const hashedCorrectAnswer = hashAnswer(options[correctOption]);

        quiz.questions.push({ text, options, correctOption, hashedCorrectAnswer, timeLimit, shuffleOptions: !!shuffleOptions });
        await quiz.save();

        res.json(quiz);
    } catch (error) {
        logger.error('[QuestionController] addQuestion', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

const updateQuestion = async (req, res) => {
    try {
        const { quizId, questionId } = req.params;
        const { text, options, correctOption, timeLimit, shuffleOptions } = req.body;

        const quiz = await Quiz.findOne(buildQuizAccessQuery(req, quizId));
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        const question = quiz.questions.id(questionId);
        if (!question) return res.status(404).json({ message: 'Question not found' });

        if (text) question.text = text;
        if (options) question.options = options;
        if (correctOption !== undefined) {
            question.correctOption = correctOption;
            const targetOptions = options || question.options;
            question.hashedCorrectAnswer = hashAnswer(targetOptions[correctOption]);
        }
        if (timeLimit) question.timeLimit = timeLimit;
        if (shuffleOptions !== undefined) question.shuffleOptions = shuffleOptions;

        await quiz.save();
        res.json(quiz);
    } catch (error) {
        logger.error('[QuestionController] updateQuestion', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

const deleteQuestion = async (req, res) => {
    try {
        const { quizId, questionId } = req.params;
        const quiz = await Quiz.findOne(buildQuizAccessQuery(req, quizId));
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        quiz.questions.pull(questionId);
        await quiz.save();
        res.json(quiz);
    } catch (error) {
        logger.error('[QuestionController] deleteQuestion', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

const updateQuizFullState = async (req, res) => {
    try {
        const { id } = req.params;
        const { slides, order, config } = req.body;

        if (!Array.isArray(slides)) {
            return res.status(400).json({ message: 'slides must be an array' });
        }

        if (!Array.isArray(order)) {
            return res.status(400).json({ message: 'order must be an array' });
        }

        const quiz = await Quiz.findOne(buildQuizAccessQuery(req, id));
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        const normalizedSlides = slides.map((slide, index) => {
            const text = String(slide?.text || '').trim();
            const options = Array.isArray(slide?.options)
                ? slide.options.map((option) => String(option || '').trim()).filter(Boolean)
                : [];
            const correctOption = Number.isInteger(slide?.correctOption)
                ? slide.correctOption
                : Number(slide?.correctOption ?? 0);

            if (!text) {
                throw new Error(`Slide ${index + 1} is missing text`);
            }

            if (options.length < 2) {
                throw new Error(`Slide ${index + 1} must contain at least 2 options`);
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
                timeLimit: Number(slide?.timeLimit) || 15,
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
            text: slide.text,
            options: slide.options,
            correctOption: slide.correctOption,
            hashedCorrectAnswer: slide.hashedCorrectAnswer,
            timeLimit: slide.timeLimit,
            shuffleOptions: slide.shuffleOptions,
            questionType: slide.questionType,
            mediaUrl: slide.mediaUrl,
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
        return res.json(quiz);
    } catch (error) {
        logger.error('[QuestionController] updateQuizFullState', { message: error.message, stack: error.stack });
        if (error.message?.includes('Slide')) {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    addQuestion,
    updateQuestion,
    deleteQuestion,
    updateQuizFullState,
};
