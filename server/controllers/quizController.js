const mongoose = require('mongoose');
const Quiz = require('../models/Quiz');
const QuizSession = require('../models/QuizSession');
const Submission = require('../models/Submission');
const User = require('../models/User');
const { hashAnswer } = require('../utils/crypto');
const { generateCode } = require('../utils/codeGenerator');
const logger = require('../utils/logger');
const quizService = require('../services/quiz.service');
const { SESSION_STATUS, assertTransition, canTransition, normalizeSessionStatus } = require('../utils/sessionStateMachine');
const { resolveHostSubscriptionEntitlements } = require('../utils/subscriptionEntitlements');

const ALLOWED_QUIZ_CATEGORIES = ['regular', 'internal', 'external', 'subject-syllabus', 'hackathon', 'interview'];

const buildQuizAccessQuery = (req, id, extra = {}) => (
    req.user.role === 'admin'
        ? { _id: id, ...extra }
        : { _id: id, organizerId: req.user._id, ...extra }
);

const buildOrganizerScopeQuery = (req, extra = {}) => (
    req.user.role === 'admin'
        ? { ...extra }
        : { organizerId: req.user._id, ...extra }
);

const sendSuccess = (res, data, message = 'OK', status = 200) => (
    res.status(status).json({ success: true, data, message })
);

const sendError = (res, status, message) => (
    res.status(status).json({ success: false, data: null, message })
);

const getManagedQuizOrError = async (req, id) => {
    const quiz = await Quiz.findById(id);
    if (!quiz) return { error: 'Quiz not found', statusCode: 404 };

    if (req.user.role !== 'admin' && quiz.organizerId.toString() !== req.user._id.toString()) {
        return { error: 'Forbidden', statusCode: 403 };
    }

    return { quiz };
};

const createQuiz = async (req, res) => {
    try {
        const { title, type, quizCategory, parentId, isPaid, price, mode, accessType, allowedEmails } = req.body;
        const normalizedType = type || 'quiz';
        const normalizedAccessType = accessType || 'public';

        if (!title || !title.trim()) {
            return res.status(400).json({ message: 'Title is required' });
        }

        if (req.user.role !== 'admin') {
            const entitlements = await resolveHostSubscriptionEntitlements(req.user._id);

            if (normalizedType === 'quiz') {
                const quizCount = await Quiz.countDocuments({
                    organizerId: req.user._id,
                    type: 'quiz',
                });

                if (quizCount >= entitlements.maxQuizTemplates) {
                    return res.status(403).json({
                        message: `Your ${entitlements.plan} plan allows up to ${entitlements.maxQuizTemplates} quizzes. Upgrade your subscription to create more.`,
                    });
                }
            }

            if (normalizedAccessType === 'private' && !entitlements.canUsePrivateHosting) {
                return res.status(403).json({
                    message: 'Private session hosting is available on Creator and Teams plans. Upgrade your subscription to continue.',
                });
            }

            if (normalizedType === 'quiz' && Boolean(isPaid) && !entitlements.canCreatePaidQuiz) {
                return res.status(403).json({
                    message: 'Paid quiz creation is available on Creator and Teams plans. Upgrade your subscription to continue.',
                });
            }
        }

        let quiz;
        let attempts = 0;

        // Always assign a room code. This avoids duplicate-null index failures
        // on older databases where roomCode may have a non-sparse unique index.
        while (!quiz && attempts < 5) {
            attempts += 1;
            const roomCode = generateCode();

            try {
                quiz = await Quiz.create({
                    title: title.trim(),
                    organizerId: req.user._id,
                    roomCode,
                    type: normalizedType,
                    quizCategory: normalizedType === 'quiz'
                        ? (ALLOWED_QUIZ_CATEGORIES.includes(quizCategory) ? quizCategory : 'regular')
                        : null,
                    parentId: parentId || null,
                    mode: mode === 'teaching' ? 'tutor' : (mode || 'auto'),
                    accessType: normalizedAccessType,
                    allowedEmails: Array.isArray(allowedEmails)
                        ? allowedEmails.map((email) => String(email || '').trim().toLowerCase()).filter(Boolean)
                        : [],
                    isPaid: isPaid || false,
                    price: isPaid ? (price || 0) : 0,
                    shuffleQuestions: false,
                    questions: [],
                });
            } catch (err) {
                if (err?.code === 11000 && err?.keyPattern?.roomCode) {
                    continue;
                }
                throw err;
            }
        }

        if (!quiz) {
            return res.status(409).json({ message: 'Unable to allocate unique room code. Please try again.' });
        }

        res.status(201).json(quiz);
    } catch (error) {
        logger.error('[Controller] createQuiz', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

const addQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { text, options, correctOption, timeLimit, shuffleOptions } = req.body;

        if (!text || !options || options.length < 2 || correctOption === undefined) {
            return res.status(400).json({ message: 'Question text, at least 2 options, and a correct option index are required' });
        }

        const quizQuery = req.user.role === 'admin'
            ? { _id: id }
            : { _id: id, organizerId: req.user._id };
        const quiz = await Quiz.findOne(quizQuery);
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        // Hashing the correct answer from the selected option index
        const hashedCorrectAnswer = hashAnswer(options[correctOption]);

        quiz.questions.push({ text, options, correctOption, hashedCorrectAnswer, timeLimit, shuffleOptions: !!shuffleOptions });
        await quiz.save();

        res.json(quiz);
    } catch (error) {
        logger.error('[Controller] addQuestion', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

const getQuizByCode = async (req, res) => {
    try {
        const { roomCode } = req.params;
        const code = (roomCode || '').toUpperCase();
        const session = await QuizSession.findOne({ sessionCode: code, status: { $in: [SESSION_STATUS.SCHEDULED, SESSION_STATUS.WAITING, SESSION_STATUS.LIVE] } });
        
        let quiz;
        if (session) {
            quiz = await Quiz.findById(session.quizId).select('-questions.hashedCorrectAnswer -questions.correctOption');
        } else {
            quiz = await Quiz.findOne({ roomCode: code }).select('-questions.hashedCorrectAnswer -questions.correctOption');
        }


        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
        const quizObj = quiz.toObject();
        if (session) {
            quizObj.sessionId = session._id;
            quizObj.sessionCode = session.sessionCode;
            quizObj.status = session.status; 
        }

        res.json(quizObj);
    } catch (error) {
        logger.error('[Controller] getQuizByCode', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

const getMyQuizzes = async (req, res) => {
    try {
        const { parentId } = req.query;
        const query = buildOrganizerScopeQuery(req);

        if (parentId === 'none') {
            query.parentId = null;
        } else if (parentId) {
            query.parentId = parentId;
        }

        const quizzes = await Quiz.find(query).sort('-createdAt');
        const quizIds = quizzes.map(q => q._id);
        const activeSessions = quizIds.length > 0
            ? await QuizSession.find({ quizId: { $in: quizIds }, status: { $in: [SESSION_STATUS.SCHEDULED, SESSION_STATUS.WAITING, SESSION_STATUS.LIVE] } })
                .sort({ startedAt: -1 })
                .select('quizId sessionCode startedAt')
                .lean()
            : [];
        const activeSessionMap = {};
        activeSessions.forEach((session) => {
            const quizId = session.quizId.toString();
            if (!activeSessionMap[quizId]) activeSessionMap[quizId] = session;
        });

        // Count distinct live sessions per quiz from Submission
        const sessionCounts = await Submission.aggregate([
            { $match: { quizId: { $in: quizIds } } },
            { $group: { _id: { quizId: '$quizId', roomCode: '$roomCode' } } },
            { $group: { _id: '$_id.quizId', sessionCount: { $sum: 1 } } }
        ]);
        const sessionCountMap = Object.fromEntries(
            sessionCounts.map(s => [s._id.toString(), s.sessionCount])
        );

        // Count child quizzes for subject-type folders
        const subjectIds = quizzes.filter(q => q.type === 'subject').map(q => q._id);
        const subDirCounts = subjectIds.length > 0
            ? await Quiz.aggregate([
                { $match: { parentId: { $in: subjectIds } } },
                { $group: { _id: '$parentId', count: { $sum: 1 } } }
            ])
            : [];
        const subDirCountMap = Object.fromEntries(
            subDirCounts.map(s => [s._id.toString(), s.count])
        );

        const enriched = quizzes.map(q => ({
            ...q.toObject(),
            sessionCount: sessionCountMap[q._id.toString()] || 0,
            subDirectoryCount: subDirCountMap[q._id.toString()] || 0,
            activeSessionCode: activeSessionMap[q._id.toString()]?.sessionCode || null,
            activeSessionStartedAt: activeSessionMap[q._id.toString()]?.startedAt || null,
            hasActiveSession: Boolean(activeSessionMap[q._id.toString()]),
        }));

        res.json(enriched);
    } catch (error) {
        logger.error('[Controller] getMyQuizzes', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

const getSubjectLeaderboard = async (req, res) => {
    try {
        const { subjectId } = req.params;
        const quizzes = await Quiz.find({ parentId: subjectId });
        const quizIds = quizzes.map(q => q._id);

        const leaderboard = await Submission.aggregate([
            { $match: { quizId: { $in: quizIds } } },
            {
                $group: {
                    _id: "$userId",
                    totalScore: { $sum: "$score" },
                    totalTime: { $sum: "$timeTaken" },
                    quizzesTaken: { $addToSet: "$quizId" }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: "$user" },
            {
                $project: {
                    name: "$user.name",
                    score: "$totalScore",
                    time: "$totalTime",
                    count: { $size: "$quizzesTaken" }
                }
            },
            { $sort: { score: -1, time: 1 } },
            { $limit: 10 }
        ]);

        res.json(leaderboard);
    } catch (error) {
        logger.error('[Controller] getSubjectLeaderboard', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

const getUserHistory = async (req, res) => {
    try {
        const submissions = await Submission.find({ userId: req.user._id })
            .populate('quizId', 'title roomCode status questions')
            .sort('-createdAt');

        // Remove debug log â€” was: console.log(`Found ${submissions.length} submissions for userâ€¦`)

        // Group submissions by roomCode (session)
        const history = submissions.reduce((acc, sub) => {
            if (!sub.quizId) return acc;

            const sessionKey = sub.roomCode ? `${sub.quizId._id}_${sub.roomCode}` : sub.quizId._id.toString();
            if (!acc[sessionKey]) {
                acc[sessionKey] = {
                    quizTitle: sub.quizId.title,
                    quizId: sub.quizId._id,
                    roomCode: sub.roomCode,
                    date: sub.createdAt,
                    totalScore: 0,
                    totalTime: 0,
                    answers: []
                };
            }

            // Find the question for this submission to get correct answer
            const question = sub.quizId.questions.find(
                q => q._id.toString() === sub.questionId.toString()
            );

            acc[sessionKey].totalScore += sub.score;
            acc[sessionKey].totalTime += sub.timeTaken;
            acc[sessionKey].answers.push({
                questionText: question ? question.text : 'Deleted Question',
                selected: sub.selectedOption,
                score: sub.score,
                isCorrect: sub.isCorrect ?? (sub.score > 0)
            });

            return acc;
        }, {});

        const abortedJoins = await Quiz.find({
            'joinedParticipants.userId': req.user._id,
            lastSessionStatus: 'aborted',
        }).select('title roomCode lastSessionCode lastSessionEndedAt lastSessionMessage').lean();

        abortedJoins.forEach((quiz) => {
            const room = quiz.lastSessionCode || quiz.roomCode;
            const key = room ? `${quiz._id}_${room}` : quiz._id.toString();
            if (!history[key]) {
                history[key] = {
                    quizTitle: quiz.title,
                    quizId: quiz._id,
                    roomCode: room,
                    date: quiz.lastSessionEndedAt || new Date(),
                    totalScore: 0,
                    totalTime: 0,
                    answers: [],
                    status: 'aborted',
                    message: quiz.lastSessionMessage || 'Admin aborted the quiz.',
                };
            }
        });

        res.json(Object.values(history));
    } catch (error) {
        logger.error('[Controller] getUserHistory', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

const getQuizLeaderboard = async (req, res) => {
    try {
        const { id } = req.params;
        const leaderboard = await Submission.aggregate([
            { $match: { quizId: new mongoose.Types.ObjectId(id) } },
            {
                $group: {
                    _id: "$userId",
                    totalScore: { $sum: "$score" },
                    totalTime: { $sum: "$timeTaken" }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: "$user" },
            {
                $project: {
                    name: "$user.name",
                    score: "$totalScore",
                    time: "$totalTime"
                }
            },
            { $sort: { score: -1, time: 1 } },
            { $limit: 10 }
        ]);
        res.json(leaderboard);
    } catch (error) {
        logger.error('[Controller] getQuizLeaderboard', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

const getOrganizerStats = async (req, res) => {
    try {
        const quizzes = await Quiz.find(buildOrganizerScopeQuery(req));
        // Get all unique sessions for this organizer's quizzes
        const quizIds = quizzes.map(q => q._id);
        const sessions = await Submission.aggregate([
            { $match: { quizId: { $in: quizIds } } },
            {
                $group: {
                    _id: "$roomCode",
                    quizId: { $first: "$quizId" },
                    participantCount: { $addToSet: "$userId" },
                    totalAnswers: { $count: {} },
                    firstSubmission: { $min: "$createdAt" }
                }
            },
            {
                $lookup: {
                    from: 'quizzes',
                    localField: 'quizId',
                    foreignField: '_id',
                    as: 'quiz'
                }
            },
            { $unwind: "$quiz" },
            { $sort: { firstSubmission: -1 } }
        ]);

        const stats = sessions.map(s => ({
            _id: s._id,
            quizId: s.quizId,
            title: s.quiz.title,
            roomCode: s._id,
            status: 'completed', // If it's in submission history, it's basically done or ongoing
            participantCount: s.participantCount.length,
            totalAnswers: s.totalAnswers,
            createdAt: s.firstSubmission
        }));

        res.json(stats);
    } catch (error) {
        logger.error('[Controller] getOrganizerStats', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

const updateQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, status, shuffleQuestions, quizCategory, mode, accessType, allowedEmails } = req.body;
        const updateData = {};

        if (accessType === 'private' && req.user.role !== 'admin') {
            const entitlements = await resolveHostSubscriptionEntitlements(req.user._id);
            if (!entitlements.canUsePrivateHosting) {
                return res.status(403).json({
                    message: 'Private session hosting is available on Creator and Teams plans. Upgrade your subscription to continue.',
                });
            }
        }

        if (title !== undefined) updateData.title = title;
        if (status !== undefined) updateData.status = status;
        if (shuffleQuestions !== undefined) updateData.shuffleQuestions = shuffleQuestions;
        if (quizCategory !== undefined && ALLOWED_QUIZ_CATEGORIES.includes(quizCategory)) {
            updateData.quizCategory = quizCategory;
        }
        if (mode !== undefined) {
            updateData.mode = mode === 'teaching' ? 'tutor' : mode;
        }
        if (accessType !== undefined) {
            updateData.accessType = accessType;
        }
        if (allowedEmails !== undefined && Array.isArray(allowedEmails)) {
            updateData.allowedEmails = allowedEmails
                .map((email) => String(email || '').trim().toLowerCase())
                .filter(Boolean);
        }
        const quiz = await Quiz.findOneAndUpdate(
            buildQuizAccessQuery(req, id),
            updateData,
            { returnDocument: 'after', runValidators: true, new: true }
        );
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
        res.json(quiz);
    } catch (error) {
        logger.error('[Controller] updateQuiz', { message: error.message, stack: error.stack });
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
        logger.error('[Controller] updateQuizFullState', { message: error.message, stack: error.stack });
        if (error.message?.includes('Slide')) {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Server Error' });
    }
};

const deleteQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        const quiz = await Quiz.findOne(buildQuizAccessQuery(req, id));
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        // Cascade delete children if it's a subject
        if (quiz.type === 'subject') {
            const childQuizzes = await Quiz.find({ parentId: id });
            const childIds = childQuizzes.map(q => q._id);
            await Submission.deleteMany({ quizId: { $in: childIds } });
            await QuizSession.deleteMany({ quizId: { $in: childIds } });
            await Quiz.deleteMany({ parentId: id });
        } else {
            await Submission.deleteMany({ quizId: id });
            await QuizSession.deleteMany({ quizId: id });
        }

        await Quiz.deleteOne({ _id: id });
        res.json({ message: 'Quiz deleted successfully' });
    } catch (error) {
        logger.error('[Controller] deleteQuiz', { message: error.message, stack: error.stack });
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
            // Use provided options or existing ones to hash the correct answer
            const targetOptions = options || question.options;
            question.hashedCorrectAnswer = hashAnswer(targetOptions[correctOption]);
        }
        if (timeLimit) question.timeLimit = timeLimit;
        if (shuffleOptions !== undefined) question.shuffleOptions = shuffleOptions;

        await quiz.save();
        res.json(quiz);
    } catch (error) {
        logger.error('[Controller] updateQuestion', { message: error.message, stack: error.stack });
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
        logger.error('[Controller] deleteQuestion', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

const startQuizSession = async (req, res) => {
    try {
        const { id } = req.params;
        const quizResult = await getManagedQuizOrError(req, id);
        if (quizResult.error) return sendError(res, quizResult.statusCode, quizResult.error);
        const { quiz } = quizResult;
        const currentStatus = normalizeSessionStatus(quiz.status);

        if (quiz.status !== currentStatus) {
            quiz.status = currentStatus;
            await quiz.save();
        }

        if (!canTransition(currentStatus, SESSION_STATUS.WAITING) && currentStatus !== SESSION_STATUS.WAITING) {
            return sendError(res, 409, `Invalid quiz state transition: ${currentStatus} -> ${SESSION_STATUS.WAITING}`);
        }

        // Prevent duplicate active sessions
        const existingSession = await QuizSession.findOne({ quizId: quiz._id, status: { $in: [SESSION_STATUS.SCHEDULED, SESSION_STATUS.WAITING, SESSION_STATUS.LIVE, 'ongoing'] } });
        if (existingSession) {
            const existingStatus = normalizeSessionStatus(existingSession.status);
            if (existingSession.status !== existingStatus) {
                existingSession.status = existingStatus;
                await existingSession.save();
            }
            await Quiz.findByIdAndUpdate(quiz._id, { status: existingStatus });
            return sendSuccess(res, {
                ...quiz.toObject(),
                sessionCode: existingSession.sessionCode,
                sessionId: existingSession._id,
                activeSessionId: existingSession._id,
                status: existingStatus,
            }, 'Existing session reused');
        }

        // The quiz is a permanent template â€” generate a fresh unique session code
        let session;
        let attempts = 0;
        while (!session && attempts < 5) {
            attempts++;
            const sessionCode = generateCode();
            try {
                session = await QuizSession.create({
                    quizId: quiz._id,
                    sessionCode,
                    status: SESSION_STATUS.WAITING,
                    mode: quiz.mode || 'auto',
                    startedAt: new Date(),
                });
            } catch (err) {
                if (err?.code === 11000) continue; // duplicate code, retry
                throw err;
            }
        }
        if (!session) return sendError(res, 409, 'Unable to allocate unique session code');

        assertTransition(currentStatus, SESSION_STATUS.WAITING, 'quiz');
        await Quiz.findByIdAndUpdate(quiz._id, { status: SESSION_STATUS.WAITING });

        // Return quiz data + the live session code so frontend can use it
        return sendSuccess(res, {
            ...quiz.toObject(),
            sessionCode: session.sessionCode,
            sessionId: session._id,
            activeSessionId: session._id,
            status: SESSION_STATUS.WAITING,
        }, 'Session started');
    } catch (error) {
        logger.error('[Controller] startQuizSession', { message: error.message, stack: error.stack });
        return sendError(res, 500, 'Server Error');
    }
};

const startLiveSession = async (req, res) => {
    try {
        const { id } = req.params;
        const io = req.app.get('io');

        const result = await quizService.startQuizSession({
            io,
            quizId: id,
            user: req.user,
        });

        if (result.error) {
            const statusCode = result.statusCode || (result.error === 'Quiz not found' ? 404 : 409);
            return sendError(res, statusCode, result.error);
        }

        logger.audit('quiz.session.started_live', {
            requestId: req.requestId,
            userId: req.user?._id,
            quizId: id,
            sessionCode: result.roomCode,
            sessionId: result.sessionId,
        });

        return sendSuccess(res, {
            quizId: id,
            status: 'live',
            sessionCode: result.roomCode,
            activeSessionId: result.sessionId,
        }, 'Session is live');
    } catch (error) {
        logger.error('[Controller] startLiveSession', { message: error.message, stack: error.stack });
        return sendError(res, 500, 'Server Error');
    }
};

const abortSession = async (req, res) => {
    try {
        const { id } = req.params;
        const { sessionCode } = req.body;
        const io = req.app.get('io');
        const result = await quizService.abortQuizSession({
            io,
            quizId: id,
            sessionCode,
            user: req.user,
            message: 'Admin aborted the quiz.',
        });

        if (result.error) {
            const statusCode = result.statusCode || (result.error === 'Quiz not found' ? 404 : 409);
            return sendError(res, statusCode, result.error);
        }

        logger.audit('quiz.session.aborted', {
            requestId: req.requestId,
            userId: req.user?._id,
            quizId: id,
            sessionCode: result.sessionCode || sessionCode || null,
        });

        return sendSuccess(res, {
            quizId: id,
            sessionCode: result.sessionCode || sessionCode || null,
            status: SESSION_STATUS.ABORTED,
        }, 'Session aborted');
    } catch (error) {
        logger.error('[Controller] abortSession', { message: error.message, stack: error.stack });
        return sendError(res, 500, 'Server Error');
    }
};

const pauseSession = async (req, res) => {
    try {
        const { id } = req.params;
        const { sessionCode } = req.body;

        const result = await quizService.pauseQuizSession({ io: req.app.get('io'), quizId: id, sessionCode, user: req.user });
        if (result.error) return res.status(result.error === 'Quiz not found' ? 404 : 400).json({ message: result.error });

        res.json({ message: 'Quiz paused' });
    } catch (error) {
        logger.error('[Controller] pauseSession', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

const resumeSession = async (req, res) => {
    try {
        const { id } = req.params;
        const { sessionCode } = req.body;

        const result = await quizService.resumeQuizSession({ io: req.app.get('io'), quizId: id, sessionCode, user: req.user });
        if (result.error) return res.status(result.error === 'Quiz not found' ? 404 : 400).json({ message: result.error });

        res.json({ message: 'Quiz resumed' });
    } catch (error) {
        logger.error('[Controller] resumeSession', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

const nextQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { sessionCode } = req.body;

        const result = await quizService.advanceQuizQuestion({ io: req.app.get('io'), quizId: id, sessionCode, user: req.user });
        if (result.error) return res.status(result.error === 'Quiz not found' ? 404 : 400).json({ message: result.error });

        res.json({ message: 'Advanced to next question' });
    } catch (error) {
        logger.error('[Controller] nextQuestion', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

// Per-question option distribution stats for a completed session
const getSessionResults = async (req, res) => {
    try {
        const { sessionCode } = req.params;

        // Load the session to get quizId
        const session = await QuizSession.findOne({ sessionCode });
        if (!session) return res.status(404).json({ message: 'Session not found' });

        // Load the quiz template (questions + correct answers)
        const quiz = await Quiz.findById(session.quizId);
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        // Authorization: only the quiz organizer or an admin can view session results
        if (req.user.role !== 'admin' && quiz.organizerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to view this session\'s results' });
        }

        // Get all submissions for this session
        const submissions = await Submission.find({ roomCode: sessionCode });
        const totalParticipants = new Set(submissions.map(s => s.userId.toString())).size;

        // Build per-question stats
        const questionStats = quiz.questions.map(q => {
            const qSubs = submissions.filter(s => s.questionId.toString() === q._id.toString());
            const optionCounts = {};
            q.options.forEach(opt => { optionCounts[opt] = 0; });
            qSubs.forEach(s => {
                if (optionCounts[s.selectedOption] !== undefined) {
                    optionCounts[s.selectedOption]++;
                }
            });
            const correctOption = q.options[q.correctOption];
            const optionStats = q.options.map((opt, idx) => ({
                option: opt,
                count: optionCounts[opt] || 0,
                percentage: qSubs.length > 0
                    ? Math.round(((optionCounts[opt] || 0) / qSubs.length) * 100)
                    : 0,
                isCorrect: idx === q.correctOption,
            }));

            return {
                questionId: q._id,
                text: q.text,
                totalAnswered: qSubs.length,
                correctOption,
                options: optionStats,
                correctPercentage: qSubs.length > 0
                    ? Math.round(((optionCounts[correctOption] || 0) / qSubs.length) * 100)
                    : 0,
            };
        });

        res.json({
            session,
            quizTitle: quiz.title,
            totalParticipants,
            topWinners: session.topWinners,
            questionStats,
        });
    } catch (error) {
        logger.error('[Controller] getSessionResults', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

const getSessionParticipants = async (req, res) => {
    try {
        const { sessionCode } = req.params;

        const session = await QuizSession.findOne({ sessionCode }).lean();
        if (!session) return res.status(404).json({ message: 'Session not found' });

        const quiz = await Quiz.findById(session.quizId).select('title organizerId').lean();
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        if (req.user.role !== 'admin' && quiz.organizerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to view this session' });
        }

        const participants = await Submission.aggregate([
            {
                $match: {
                    quizId: session.quizId,
                    $or: [
                        { sessionId: session._id },
                        { roomCode: sessionCode }
                    ]
                }
            },
            {
                $group: {
                    _id: '$userId',
                    totalScore: { $sum: '$score' },
                    totalTime: { $sum: '$timeTaken' },
                    answersCount: { $sum: 1 },
                    firstSubmittedAt: { $min: '$createdAt' },
                    lastSubmittedAt: { $max: '$createdAt' }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $project: {
                    _id: 0,
                    userId: '$_id',
                    name: { $ifNull: [{ $arrayElemAt: ['$user.name', 0] }, 'Unknown User'] },
                    email: { $ifNull: [{ $arrayElemAt: ['$user.email', 0] }, ''] },
                    score: '$totalScore',
                    time: '$totalTime',
                    answersCount: 1,
                    firstSubmittedAt: 1,
                    lastSubmittedAt: 1
                }
            },
            { $sort: { score: -1, time: 1, lastSubmittedAt: 1 } }
        ]);

        const rankedParticipants = participants.map((p, index) => ({
            ...p,
            rank: index + 1,
        }));

        res.json({
            quizTitle: quiz.title,
            sessionCode,
            participantCount: rankedParticipants.length,
            participants: rankedParticipants,
        });
    } catch (error) {
        logger.error('[Controller] getSessionParticipants', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

const escapeCsvValue = (value) => {
    if (value === null || value === undefined) return '';
    const normalized = String(value).replace(/\r?\n|\r/g, ' ');
    return /[",]/.test(normalized) ? `"${normalized.replace(/"/g, '""')}"` : normalized;
};

const exportSessionParticipants = async (req, res) => {
    try {
        const { sessionCode } = req.params;

        const session = await QuizSession.findOne({ sessionCode }).lean();
        if (!session) return res.status(404).json({ message: 'Session not found' });

        const quiz = await Quiz.findById(session.quizId).select('title organizerId').lean();
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        if (req.user.role !== 'admin' && quiz.organizerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to export this session' });
        }

        const participants = await Submission.aggregate([
            {
                $match: {
                    quizId: session.quizId,
                    $or: [
                        { sessionId: session._id },
                        { roomCode: sessionCode }
                    ]
                }
            },
            {
                $group: {
                    _id: '$userId',
                    totalScore: { $sum: '$score' },
                    totalTime: { $sum: '$timeTaken' },
                    answersCount: { $sum: 1 },
                    firstSubmittedAt: { $min: '$createdAt' },
                    lastSubmittedAt: { $max: '$createdAt' }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $project: {
                    _id: 0,
                    name: { $ifNull: [{ $arrayElemAt: ['$user.name', 0] }, 'Unknown User'] },
                    email: { $ifNull: [{ $arrayElemAt: ['$user.email', 0] }, ''] },
                    score: '$totalScore',
                    time: '$totalTime',
                    answersCount: 1,
                    firstSubmittedAt: 1,
                    lastSubmittedAt: 1
                }
            },
            { $sort: { score: -1, time: 1, lastSubmittedAt: 1 } }
        ]);

        const rows = participants.map((entry, index) => [
            index + 1,
            entry.name,
            entry.email,
            entry.score,
            Number(entry.time.toFixed(2)),
            entry.answersCount,
            entry.firstSubmittedAt ? new Date(entry.firstSubmittedAt).toISOString() : '',
            entry.lastSubmittedAt ? new Date(entry.lastSubmittedAt).toISOString() : '',
        ]);

        const header = [
            'Rank',
            'Name',
            'Email',
            'Score',
            'TimeSeconds',
            'AnswersSubmitted',
            'FirstSubmittedAt',
            'LastSubmittedAt'
        ];

        const csv = [header, ...rows]
            .map((row) => row.map(escapeCsvValue).join(','))
            .join('\n');

        const safeTitle = quiz.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `${safeTitle || 'quiz'}_${sessionCode}_participants.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(200).send(csv);
    } catch (error) {
        logger.error('[Controller] exportSessionParticipants', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

// All sessions run for a quiz template (organizer history per quiz)
const getQuizSessions = async (req, res) => {
    try {
        const { id } = req.params;
        const quiz = await Quiz.findOne(buildQuizAccessQuery(req, id));
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        const sessions = await QuizSession.find({ quizId: id }).sort('-startedAt');
        res.json({ quizTitle: quiz.title, sessions });
    } catch (error) {
        logger.error('[Controller] getQuizSessions', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

const scheduleQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        const { scheduledAt } = req.body;

        if (!scheduledAt) {
            return sendError(res, 400, 'scheduledAt date-time is required');
        }

        const scheduled = new Date(scheduledAt);
        if (isNaN(scheduled.getTime()) || scheduled <= new Date()) {
            return sendError(res, 400, 'scheduledAt must be a valid future date-time');
        }

        const quizResult = await getManagedQuizOrError(req, id);
        if (quizResult.error) return sendError(res, quizResult.statusCode, quizResult.error);
        const { quiz } = quizResult;
        const currentStatus = normalizeSessionStatus(quiz.status);

        if (quiz.status !== currentStatus) {
            quiz.status = currentStatus;
            await quiz.save();
        }

        if (!canTransition(currentStatus, SESSION_STATUS.SCHEDULED) && currentStatus !== SESSION_STATUS.SCHEDULED) {
            return sendError(res, 409, `Invalid quiz state transition: ${currentStatus} -> ${SESSION_STATUS.SCHEDULED}`);
        }

        quiz.scheduledAt = scheduled;
        quiz.status = SESSION_STATUS.SCHEDULED;
        quiz.lastSessionStatus = null;
        quiz.lastSessionEndedAt = null;
        quiz.lastSessionMessage = '';
        await quiz.save();

        let scheduledSession = await QuizSession.findOne({ quizId: quiz._id, status: { $in: [SESSION_STATUS.SCHEDULED, SESSION_STATUS.WAITING] } })
            .sort({ startedAt: -1 });
        if (!scheduledSession) {
            let attempts = 0;
            while (!scheduledSession && attempts < 5) {
                attempts += 1;
                try {
                    scheduledSession = await QuizSession.create({
                        quizId: quiz._id,
                        sessionCode: generateCode(),
                        status: SESSION_STATUS.SCHEDULED,
                        mode: quiz.mode || 'auto',
                        startedAt: scheduled,
                    });
                } catch (err) {
                    if (err?.code === 11000) continue;
                    throw err;
                }
            }
        } else if (scheduledSession.status !== SESSION_STATUS.SCHEDULED) {
            if (!canTransition(scheduledSession.status, SESSION_STATUS.SCHEDULED)) {
                return sendError(res, 409, `Invalid session state transition: ${scheduledSession.status} -> ${SESSION_STATUS.SCHEDULED}`);
            }
            scheduledSession.status = SESSION_STATUS.SCHEDULED;
            await scheduledSession.save();
        }

        return sendSuccess(res, {
            ...quiz.toObject(),
            sessionCode: scheduledSession?.sessionCode || null,
            sessionId: scheduledSession?._id || null,
            status: SESSION_STATUS.SCHEDULED,
        }, 'Quiz scheduled');
    } catch (error) {
        logger.error('[Controller] scheduleQuiz', { message: error.message, stack: error.stack });
        return sendError(res, 500, 'Server Error');
    }
};

// Participant registers/joins a scheduled session â€” recorded with timestamp
const joinScheduledSession = async (req, res) => {
    try {
        const { roomCode } = req.params;
        const userId = req.user._id;
        let userName = req.user.name;

        const quiz = await Quiz.findOne({ roomCode });
        if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

        const activeSession = await QuizSession.findOne({
            quizId: quiz._id,
            status: { $in: [SESSION_STATUS.SCHEDULED, SESSION_STATUS.WAITING, SESSION_STATUS.LIVE] },
        }).sort({ startedAt: -1 }).lean();

        if (!activeSession) {
            return res.status(400).json({ message: 'Cannot join: session is not available.' });
        }

        if (!userName) {
            const participant = await User.findById(userId).select('name').lean();
            userName = participant?.name || 'Participant';
        }

        // Prevent duplicate registrations
        const alreadyJoined = quiz.joinedParticipants.some(
            p => p.userId.toString() === userId.toString()
        );
        if (!alreadyJoined) {
            quiz.joinedParticipants.push({ userId, name: userName, joinedAt: new Date() });
            await quiz.save();
        }

        res.json({
            quizId: quiz._id,
            title: quiz.title,
            roomCode: activeSession.sessionCode,
            scheduledAt: quiz.scheduledAt,
            joinedAt: quiz.joinedParticipants.find(p => p.userId.toString() === userId.toString())?.joinedAt,
        });
    } catch (error) {
        logger.error('[Controller] joinScheduledSession', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

// Get all scheduled sessions a participant has joined
const getMyScheduledJoins = async (req, res) => {
    try {
        const userId = req.user._id;
        const quizzes = await Quiz.find(
            { 'joinedParticipants.userId': userId },
            { title: 1, roomCode: 1, scheduledAt: 1, status: 1, organizerId: 1, lastSessionStatus: 1, lastSessionEndedAt: 1, lastSessionMessage: 1, lastSessionCode: 1, 'joinedParticipants.$': 1 }
        ).sort({ scheduledAt: 1 });

        const quizIds = quizzes.map((quiz) => quiz._id);
        const sessions = quizIds.length
            ? await QuizSession.find({ quizId: { $in: quizIds } })
                .sort({ startedAt: -1 })
                .select('quizId sessionCode status')
                .lean()
            : [];
        const latestSessionMap = {};
        sessions.forEach((session) => {
            const key = session.quizId.toString();
            if (!latestSessionMap[key]) latestSessionMap[key] = session;
        });

        const result = quizzes.map(q => ({
            quizId: q._id,
            title: q.title,
            roomCode: latestSessionMap[q._id.toString()]?.sessionCode || q.roomCode,
            scheduledAt: q.scheduledAt,
            status: q.status,
            lastSessionEndedAt: q.lastSessionEndedAt || null,
            message: q.lastSessionMessage || '',
            joinedAt: q.joinedParticipants[0]?.joinedAt,
        }));

        res.json(result);
    } catch (error) {
        logger.error('[Controller] getMyScheduledJoins', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

// STEP 6: Reveal correct answer for tutor mode
const revealAnswer = async (req, res) => {
    try {
        const { id } = req.params;
        const { sessionCode } = req.body;
        const io = req.app.get('io');

        const result = await quizService.revealAnswer({ io, roomCode: sessionCode, user: req.user });
        if (result.error) {
            return res.status(400).json({ message: result.error });
        }

        res.json({ message: 'Answer revealed', ...result });
    } catch (error) {
        logger.error('[Controller] revealAnswer', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

// STEP 8: End quiz session via HTTP
const endQuizSession = async (req, res) => {
    try {
        const { id } = req.params;
        const { sessionCode } = req.body;
        const io = req.app.get('io');

        const result = await quizService.endQuizSession({ io, quizId: id, sessionCode, user: req.user });
        if (result.error) {
            return sendError(res, result.statusCode || 409, result.error);
        }

        return sendSuccess(res, result, 'Quiz ended');
    } catch (error) {
        logger.error('[Controller] endQuizSession', { message: error.message, stack: error.stack });
        return sendError(res, 500, 'Server Error');
    }
};

// STEP 5: Get answer stats for current question
const getAnswerStats = async (req, res) => {
    try {
        const { sessionCode } = req.params;
        const sessionStore = require('../services/session.service');

        const session = await sessionStore.getSession(sessionCode);
        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        const stats = await quizService.calculateAnswerStats(sessionCode, session.currentQuestionIndex);
        if (!stats) {
            return res.status(400).json({ message: 'No stats available for current question' });
        }

        res.json(stats);
    } catch (error) {
        logger.error('[Controller] getAnswerStats', { message: error.message, stack: error.stack });
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    createQuiz,
    addQuestion,
    getQuizByCode,
    getMyQuizzes,
    getUserHistory,
    getOrganizerStats,
    getSubjectLeaderboard,
    getQuizLeaderboard,
    updateQuiz,
    updateQuizFullState,
    deleteQuiz,
    updateQuestion,
    deleteQuestion,
    startQuizSession,
    startLiveSession,
    abortSession,
    pauseSession,
    resumeSession,
    nextQuestion,
    revealAnswer,
    endQuizSession,
    getAnswerStats,
    scheduleQuiz,
    joinScheduledSession,
    getMyScheduledJoins,
    getSessionResults,
    getSessionParticipants,
    exportSessionParticipants,
    getQuizSessions,
};
