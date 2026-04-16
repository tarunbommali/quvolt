if (typeof jest !== 'undefined') {
    const express = require('express');
    const request = require('supertest');
    const jwt = require('jsonwebtoken');
    const mongoose = require('mongoose');
    const { MongoMemoryServer } = require('mongodb-memory-server');

    const quizRoutes = require('../routes/quizRoutes');
    const Quiz = require('../models/Quiz');

    jest.setTimeout(30000);

    describe('Quiz Full State API', () => {
        let mongod;
        let app;
        let hostId;
        let hostToken;

        const authHeader = () => ({ Authorization: `Bearer ${hostToken}` });

        beforeAll(async () => {
            process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
            mongod = await MongoMemoryServer.create();
            await mongoose.connect(mongod.getUri(), { dbName: 'quiz-full-state-test' });

            app = express();
            app.use(express.json());
            app.use('/api/quiz', quizRoutes);

            hostId = new mongoose.Types.ObjectId();
            hostToken = jwt.sign({ id: hostId.toString(), role: 'host' }, process.env.JWT_SECRET, { expiresIn: '1h' });
        });

        afterEach(async () => {
            await Quiz.deleteMany({});
        });

        afterAll(async () => {
            await mongoose.disconnect();
            if (mongod) await mongod.stop();
        });

        test('persists full snapshot and reordered slides atomically', async () => {
            const quiz = await Quiz.create({
                title: 'Snapshot Quiz',
                hostId,
                roomCode: 'SNAP01',
                questions: [
                    {
                        text: 'Q1',
                        options: ['A', 'B', 'C', 'D'],
                        correctOption: 0,
                        hashedCorrectAnswer: 'hash-a',
                        timeLimit: 10,
                    },
                    {
                        text: 'Q2',
                        options: ['E', 'F', 'G', 'H'],
                        correctOption: 1,
                        hashedCorrectAnswer: 'hash-f',
                        timeLimit: 15,
                    },
                ],
            });

            const q1 = quiz.questions[0];
            const q2 = quiz.questions[1];

            const payload = {
                slides: [
                    {
                        _id: q1._id,
                        clientId: String(q1._id),
                        text: 'Question One Updated',
                        options: ['A1', 'B1', 'C1', 'D1'],
                        correctOption: 2,
                        timeLimit: 20,
                        shuffleOptions: true,
                        questionType: 'multiple-choice',
                    },
                    {
                        _id: q2._id,
                        clientId: String(q2._id),
                        text: 'Question Two Updated',
                        options: ['E2', 'F2', 'G2', 'H2'],
                        correctOption: 0,
                        timeLimit: 25,
                        shuffleOptions: false,
                        questionType: 'multiple-choice',
                    },
                ],
                order: [String(q2._id), String(q1._id)],
                config: {
                    shuffleQuestions: true,
                    interQuestionDelay: 9,
                    mode: 'auto',
                },
            };

            const response = await request(app)
                .put(`/api/quiz/${quiz._id}/full-state`)
                .set(authHeader())
                .send(payload);

            expect(response.status).toBe(200);

            const updated = await Quiz.findById(quiz._id).lean();
            expect(updated.shuffleQuestions).toBe(true);
            expect(updated.interQuestionDelay).toBe(9);
            expect(updated.questions).toHaveLength(2);
            expect(updated.questions[0].text).toBe('Question Two Updated');
            expect(updated.questions[1].text).toBe('Question One Updated');
            expect(updated.questions[1].correctOption).toBe(2);
        });
    });
}
