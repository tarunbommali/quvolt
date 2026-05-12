const Submission = require('../models/Submission');
const Quiz = require('../models/Quiz');
const QuizSession = require('../models/QuizSession');
const { sendSuccess, sendError } = require('../utils/controllerHelpers');
const logger = require('../utils/logger');

/**
 * GET /api/submissions/my-results/:sessionId
 * Returns per-question analysis for a participant in a specific session.
 * Like Testbook's "Analyze" tab — shows each question, the participant's answer,
 * whether it was correct, time taken, and the correct answer.
 */
const getMySessionResults = async (req, res) => {
    try {
        const userId = req.user._id;
        const { sessionId } = req.params;

        // Fetch the session to get quiz info
        const session = await QuizSession.findById(sessionId)
            .select('quizId sessionCode title status')
            .lean();

        if (!session) return sendError(res, 'Session not found', 404);

        // Fetch participant's submissions for this session
        const submissions = await Submission.find({
            sessionId: session._id,
            userId,
        })
            .sort({ createdAt: 1 })
            .lean();

        if (!submissions.length) {
            // Try by roomCode as fallback (older sessions may not have sessionId)
            const fallbackSubs = await Submission.find({
                roomCode: session.sessionCode,
                userId,
            })
                .sort({ createdAt: 1 })
                .lean();

            if (!fallbackSubs.length) {
                return sendError(res, 'No submissions found for this session', 404);
            }
            submissions.push(...fallbackSubs);
        }

        // Fetch quiz to get question details (text, options, correctOption)
        const quiz = await Quiz.findById(session.quizId)
            .select('title questions.text questions.options questions.correctOption questions._id questions.explanation questions.translations')
            .lean();

        if (!quiz) return sendError(res, 'Quiz not found', 404);

        // Build a question lookup map
        const questionMap = new Map();
        (quiz.questions || []).forEach((q, idx) => {
            questionMap.set(q._id.toString(), {
                index: idx,
                text: q.text,
                options: q.options,
                correctOption: q.correctOption,
                correctAnswer: q.options?.[q.correctOption] || null,
                explanation: q.explanation || '',
            });
        });

        // Build analysis
        let totalCorrect = 0;
        let totalWrong = 0;
        let totalSkipped = 0;
        let totalTime = 0;
        let totalScore = 0;

        const analysis = submissions.map((sub) => {
            const qInfo = questionMap.get(sub.questionId?.toString()) || {};
            if (sub.isCorrect) totalCorrect++;
            else totalWrong++;
            totalTime += sub.timeTaken || 0;
            totalScore += sub.score || 0;

            return {
                questionId: sub.questionId,
                questionIndex: qInfo.index ?? null,
                questionText: qInfo.text || 'Unknown Question',
                options: qInfo.options || [],
                correctOption: qInfo.correctOption,
                correctAnswer: qInfo.correctAnswer,
                selectedOption: sub.selectedOption,
                isCorrect: sub.isCorrect,
                timeTaken: sub.timeTaken,
                score: sub.score,
                explanation: qInfo.explanation,
            };
        });

        // Questions not answered (skipped)
        const answeredIds = new Set(submissions.map(s => s.questionId?.toString()));
        (quiz.questions || []).forEach((q, idx) => {
            if (!answeredIds.has(q._id.toString())) {
                totalSkipped++;
                analysis.push({
                    questionId: q._id,
                    questionIndex: idx,
                    questionText: q.text,
                    options: q.options,
                    correctOption: q.correctOption,
                    correctAnswer: q.options?.[q.correctOption] || null,
                    selectedOption: null,
                    isCorrect: false,
                    timeTaken: 0,
                    score: 0,
                    explanation: q.explanation || '',
                    skipped: true,
                });
            }
        });

        // Sort by question index
        analysis.sort((a, b) => (a.questionIndex ?? 999) - (b.questionIndex ?? 999));

        const totalQuestions = quiz.questions?.length || 0;
        const accuracy = totalQuestions > 0 ? ((totalCorrect / totalQuestions) * 100).toFixed(1) : 0;
        const avgTime = submissions.length > 0 ? (totalTime / submissions.length).toFixed(1) : 0;

        return sendSuccess(res, {
            sessionId: session._id,
            sessionCode: session.sessionCode,
            quizTitle: quiz.title || session.title || 'Untitled Quiz',
            summary: {
                totalQuestions,
                totalCorrect,
                totalWrong,
                totalSkipped,
                totalScore,
                accuracy: Number(accuracy),
                avgTimePerQuestion: Number(avgTime),
                totalTimeTaken: Number(totalTime.toFixed(1)),
            },
            questions: analysis,
        });
    } catch (error) {
        logger.error('[SubmissionController] getMySessionResults', { message: error.message, stack: error.stack });
        return sendError(res, 'Server Error');
    }
};

/**
 * GET /api/submissions/my-history
 * Returns a list of all quiz sessions the participant has taken,
 * with summary stats for each.
 */
const getMyHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        // Aggregate submissions grouped by sessionId/roomCode
        const pipeline = [
            { $match: { userId: userId } },
            {
                $group: {
                    _id: { $ifNull: ['$sessionId', '$roomCode'] },
                    roomCode: { $first: '$roomCode' },
                    quizId: { $first: '$quizId' },
                    sessionId: { $first: '$sessionId' },
                    totalQuestions: { $sum: 1 },
                    totalCorrect: { $sum: { $cond: ['$isCorrect', 1, 0] } },
                    totalScore: { $sum: '$score' },
                    totalTime: { $sum: '$timeTaken' },
                    lastPlayed: { $max: '$createdAt' },
                },
            },
            { $sort: { lastPlayed: -1 } },
            { $skip: skip },
            { $limit: limit },
        ];

        const results = await Submission.aggregate(pipeline);

        // Fetch quiz titles
        const quizIds = [...new Set(results.map(r => r.quizId?.toString()).filter(Boolean))];
        const quizzes = await Quiz.find({ _id: { $in: quizIds } })
            .select('title questions')
            .lean();
        const quizMap = new Map(quizzes.map(q => [q._id.toString(), q]));

        const history = results.map(r => {
            const quiz = quizMap.get(r.quizId?.toString()) || {};
            const totalInQuiz = quiz.questions?.length || r.totalQuestions;
            return {
                sessionId: r.sessionId || null,
                roomCode: r.roomCode,
                quizId: r.quizId,
                quizTitle: quiz.title || 'Untitled Quiz',
                totalQuestions: totalInQuiz,
                attempted: r.totalQuestions,
                totalCorrect: r.totalCorrect,
                totalScore: r.totalScore,
                accuracy: totalInQuiz > 0 ? Number(((r.totalCorrect / totalInQuiz) * 100).toFixed(1)) : 0,
                avgTime: r.totalQuestions > 0 ? Number((r.totalTime / r.totalQuestions).toFixed(1)) : 0,
                lastPlayed: r.lastPlayed,
            };
        });

        // Get total count
        const countPipeline = [
            { $match: { userId: userId } },
            { $group: { _id: { $ifNull: ['$sessionId', '$roomCode'] } } },
            { $count: 'total' },
        ];
        const countResult = await Submission.aggregate(countPipeline);
        const total = countResult[0]?.total || 0;

        return sendSuccess(res, {
            history,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    } catch (error) {
        logger.error('[SubmissionController] getMyHistory', { message: error.message, stack: error.stack });
        return sendError(res, 'Server Error');
    }
};

module.exports = {
    getMySessionResults,
    getMyHistory,
};
