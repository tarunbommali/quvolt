const test = require('node:test');
const assert = require('node:assert/strict');

const Submission = require('../models/Submission');
const Quiz = require('../models/Quiz');
const { getOrganizerAnalyticsSummary } = require('../services/analytics.service');

const ORG_ID = '64b1f8f9d4c3a2b1c0d9e901';
const QUIZ_A = '64b1f8f9d4c3a2b1c0d9e902';
const QUIZ_B = '64b1f8f9d4c3a2b1c0d9e903';

test('getOrganizerAnalyticsSummary returns aggregated organizer metrics', async () => {
    const originalQuizFind = Quiz.find;
    const originalSubmissionAggregate = Submission.aggregate;

    Quiz.find = () => ({
        select: () => ({
            lean: async () => ([
                {
                    _id: QUIZ_A,
                    title: 'Quiz A',
                    status: 'live',
                    joinedParticipants: [{ userId: 'u1' }, { userId: 'u2' }, { userId: 'u3' }],
                },
                {
                    _id: QUIZ_B,
                    title: 'Quiz B',
                    status: 'completed',
                    joinedParticipants: [{ userId: 'u2' }, { userId: 'u4' }],
                },
            ]),
        }),
    });

    Submission.aggregate = async () => ([
        {
            _id: QUIZ_A,
            totalAnswers: 10,
            correctAnswers: 8,
            averageScore: 720,
            participants: ['u1', 'u2'],
        },
        {
            _id: QUIZ_B,
            totalAnswers: 5,
            correctAnswers: 3,
            averageScore: 540,
            participants: ['u2', 'u4'],
        },
    ]);

    try {
        const result = await getOrganizerAnalyticsSummary(ORG_ID);

        assert.equal(result.totals.totalQuizzesCreated, 2);
        assert.equal(result.totals.activeQuizzes, 1);
        assert.equal(result.totals.completedQuizzes, 1);

        assert.equal(result.performance.totalAttempts, 15);
        assert.equal(result.performance.accuracyPercent, 73.33);

        assert.equal(result.participants.invitedUsers, 4);
        assert.equal(result.participants.joinedUsers, 3);
        assert.equal(result.participants.notJoinedUsers, 1);

        assert.ok(Array.isArray(result.topQuizzes));
        assert.equal(result.topQuizzes.length, 2);
        assert.equal(result.topQuizzes[0].title, 'Quiz A');
    } finally {
        Quiz.find = originalQuizFind;
        Submission.aggregate = originalSubmissionAggregate;
    }
});
