const test = require('node:test');
const assert = require('node:assert/strict');

const Submission = require('../models/Submission');
const Quiz = require('../models/Quiz');
const Analytics = require('../models/Analytics');
const { getQuizAnalytics, getUserAnalytics } = require('../services/analytics.service');

const QUIZ_ID = '64b1f8f9d4c3a2b1c0d9e8f7';
const USER_ID = '64b1f8f9d4c3a2b1c0d9e8f8';
const Q1_ID = '64b1f8f9d4c3a2b1c0d9e8f1';
const Q2_ID = '64b1f8f9d4c3a2b1c0d9e8f2';

const createFindChain = (rows) => ({
    select: () => ({
        sort: () => ({
            limit: () => ({
                lean: async () => rows,
            }),
        }),
    }),
});

test('getQuizAnalytics returns expected output shape', async () => {
    const originalSubmissionAggregate = Submission.aggregate;
    const originalSubmissionFind = Submission.find;
    const originalQuizFindById = Quiz.findById;
    const originalAnalyticsUpsert = Analytics.findOneAndUpdate;

    let aggregateCall = 0;
    let snapshotCalled = false;

    Submission.aggregate = async () => {
        aggregateCall += 1;
        if (aggregateCall === 1) {
            return [{ totalAnswers: 10, correctAnswers: 7, avgTime: 4.25, avgScore: 612.2, participantCount: 3 }];
        }
        if (aggregateCall === 2) {
            return [
                { _id: Q1_ID, total: 5, correct: 4, avgTime: 3.8, avgScore: 700 },
                { _id: Q2_ID, total: 5, correct: 3, avgTime: 4.7, avgScore: 520 },
            ];
        }
        if (aggregateCall === 3) {
            return [
                { label: '2026-04-01', accuracy: 80, avgTime: 3.9, avgScore: 650, total: 5 },
                { label: '2026-04-02', accuracy: 60, avgTime: 4.6, avgScore: 570, total: 5 },
            ];
        }
        if (aggregateCall === 4) {
            return [
                { _id: { userId: USER_ID, questionId: Q1_ID }, firstAttemptAt: new Date() },
                { _id: { userId: USER_ID, questionId: Q2_ID }, firstAttemptAt: new Date() },
            ];
        }
        return [];
    };

    Submission.find = () => createFindChain([
        { timeTaken: 3.2, score: 810, isCorrect: true, createdAt: new Date() },
        { timeTaken: 5.1, score: 460, isCorrect: false, createdAt: new Date() },
    ]);

    Quiz.findById = () => ({
        select: () => ({
            lean: async () => ({
                _id: QUIZ_ID,
                title: 'Analytics Test Quiz',
                questions: [
                    { _id: Q1_ID, text: 'Question one' },
                    { _id: Q2_ID, text: 'Question two' },
                ],
            }),
        }),
    });

    Analytics.findOneAndUpdate = async () => {
        snapshotCalled = true;
    };

    try {
        const result = await getQuizAnalytics(QUIZ_ID);

        assert.ok(result.quiz);
        assert.equal(result.quiz.title, 'Analytics Test Quiz');

        assert.ok(result.summary);
        assert.equal(result.summary.totalAnswers, 10);
        assert.equal(result.summary.correctAnswers, 7);
        assert.equal(result.summary.accuracyPercent, 70);

        assert.ok(Array.isArray(result.questionStats));
        assert.equal(result.questionStats.length, 2);
        assert.ok('difficulty' in result.questionStats[0]);
        assert.ok('successRate' in result.questionStats[0]);

        assert.ok(Array.isArray(result.performanceOverTime));
        assert.equal(result.performanceOverTime.length, 2);

        assert.ok(result.timeVsScore);
        assert.ok(Array.isArray(result.timeVsScore.points));

        assert.ok(Array.isArray(result.dropoff));
        assert.equal(snapshotCalled, true);
    } finally {
        Submission.aggregate = originalSubmissionAggregate;
        Submission.find = originalSubmissionFind;
        Quiz.findById = originalQuizFindById;
        Analytics.findOneAndUpdate = originalAnalyticsUpsert;
    }
});

test('getUserAnalytics returns expected output shape', async () => {
    const originalSubmissionAggregate = Submission.aggregate;
    const originalSubmissionFind = Submission.find;
    const originalAnalyticsUpsert = Analytics.findOneAndUpdate;

    let aggregateCall = 0;
    let snapshotCalled = false;

    Submission.aggregate = async () => {
        aggregateCall += 1;
        if (aggregateCall === 1) {
            return [{ totalAnswers: 12, correctAnswers: 8, avgTime: 3.95, avgScore: 640.5, quizzesPlayed: 2 }];
        }
        if (aggregateCall === 2) {
            return [
                { quizId: QUIZ_ID, title: 'Quiz A', total: 6, correct: 5, avgTime: 3.5, avgScore: 720, accuracy: 83.33 },
                { quizId: '64b1f8f9d4c3a2b1c0d9e811', title: 'Quiz B', total: 6, correct: 3, avgTime: 4.4, avgScore: 561, accuracy: 50 },
            ];
        }
        if (aggregateCall === 3) {
            return [
                { label: '2026-04-01', total: 6, accuracy: 83.33, avgTime: 3.5, avgScore: 720 },
                { label: '2026-04-02', total: 6, accuracy: 50, avgTime: 4.4, avgScore: 561 },
            ];
        }
        return [];
    };

    Submission.find = () => createFindChain([
        { quizId: QUIZ_ID, questionId: Q1_ID, isCorrect: true, score: 700, timeTaken: 3.5, createdAt: new Date() },
    ]);

    Analytics.findOneAndUpdate = async () => {
        snapshotCalled = true;
    };

    try {
        const result = await getUserAnalytics(USER_ID);

        assert.ok(result.summary);
        assert.equal(result.summary.totalAnswers, 12);
        assert.equal(result.summary.correctAnswers, 8);
        assert.equal(result.summary.wrongAnswers, 4);
        assert.equal(result.summary.accuracyPercent, 66.67);

        assert.ok(Array.isArray(result.quizBreakdown));
        assert.equal(result.quizBreakdown.length, 2);
        assert.ok('title' in result.quizBreakdown[0]);

        assert.ok(Array.isArray(result.performanceOverTime));
        assert.equal(result.performanceOverTime.length, 2);

        assert.ok(Array.isArray(result.recentSubmissions));
        assert.equal(result.recentSubmissions.length, 1);

        assert.equal(snapshotCalled, true);
    } finally {
        Submission.aggregate = originalSubmissionAggregate;
        Submission.find = originalSubmissionFind;
        Analytics.findOneAndUpdate = originalAnalyticsUpsert;
    }
});
