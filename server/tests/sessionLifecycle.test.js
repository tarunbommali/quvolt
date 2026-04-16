if (typeof jest !== 'undefined') {
    const express = require('express');
    const request = require('supertest');
    const jwt = require('jsonwebtoken');
    const mongoose = require('mongoose');
    const { MongoMemoryServer } = require('mongodb-memory-server');

    const quizRoutes = require('../routes/quizRoutes');
    const Quiz = require('../models/Quiz');
    const QuizSession = require('../models/QuizSession');
    const Submission = require('../models/Submission');

    jest.setTimeout(30000);

    describe('Quiz Session Lifecycle API Contracts', () => {
        let mongod;
        let app;
        let hostId;
        let hostToken;

        const mockIo = {
            to: () => ({ emit: () => { } }),
            in: () => ({ socketsLeave: () => { } }),
            emit: () => { },
        };

        const authHeader = () => ({ Authorization: `Bearer ${hostToken}` });

        const expectContract = (response) => {
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('message');
        };

        const createDraftQuiz = async (overrides = {}) => {
            const random = Math.random().toString(36).slice(2, 8).toUpperCase();
            return Quiz.create({
                title: `Lifecycle Quiz ${random}`,
                hostId,
                roomCode: `R${random}`,
                status: 'draft',
                questions: [
                    {
                        text: 'Q1',
                        options: ['A', 'B', 'C', 'D'],
                        correctOption: 0,
                        hashedCorrectAnswer: 'dummy-hash',
                        timeLimit: 10,
                    },
                ],
                ...overrides,
            });
        };

        beforeAll(async () => {
            process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

            mongod = await MongoMemoryServer.create();
            await mongoose.connect(mongod.getUri(), {
                dbName: 'quiz-lifecycle-test',
            });

            app = express();
            app.use(express.json());
            app.set('io', mockIo);
            app.use('/api/quiz', quizRoutes);

            hostId = new mongoose.Types.ObjectId();
            hostToken = jwt.sign({ id: hostId.toString(), role: 'host' }, process.env.JWT_SECRET, { expiresIn: '1h' });
        });

        afterEach(async () => {
            await Promise.all([
                Quiz.deleteMany({}),
                QuizSession.deleteMany({}),
                Submission.deleteMany({}),
            ]);
        });

        afterAll(async () => {
            await mongoose.disconnect();
            if (mongod) await mongod.stop();
        });

        test('1) START SESSION: draft -> waiting', async () => {
            const quiz = await createDraftQuiz();

            const response = await request(app)
                .post(`/api/quiz/${quiz._id}/start`)
                .set(authHeader())
                .send({});

            expectContract(response);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('waiting');
            expect(response.body.data.sessionCode).toBeTruthy();
            expect(response.body.data.sessionId || response.body.data.activeSessionId).toBeTruthy();

            const dbQuiz = await Quiz.findById(quiz._id).lean();
            const dbSession = await QuizSession.findOne({ quizId: quiz._id }).lean();

            expect(dbQuiz.status).toBe('waiting');
            expect(dbSession.status).toBe('waiting');
        });

        test('2) SCHEDULE SESSION: draft -> scheduled', async () => {
            const quiz = await createDraftQuiz();
            const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();

            const response = await request(app)
                .post(`/api/quiz/${quiz._id}/schedule`)
                .set(authHeader())
                .send({ scheduledAt: future });

            expectContract(response);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('scheduled');
            expect(response.body.data.scheduledAt).toBeTruthy();

            const dbQuiz = await Quiz.findById(quiz._id).lean();
            expect(dbQuiz.status).toBe('scheduled');
            expect(new Date(dbQuiz.scheduledAt).getTime()).toBeGreaterThan(Date.now());
        });

        test('3) JOIN PHASE: waiting state query returns waiting + usable sessionCode', async () => {
            const quiz = await createDraftQuiz();
            const start = await request(app)
                .post(`/api/quiz/${quiz._id}/start`)
                .set(authHeader())
                .send({});

            const sessionCode = start.body.data.sessionCode;
            expect(sessionCode).toBeTruthy();

            const response = await request(app)
                .get(`/api/quiz/${sessionCode}`)
                .set(authHeader());

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('waiting');
            expect(response.body.sessionCode).toBe(sessionCode);
        });

        test('4) START QUIZ: waiting -> live via POST /quiz/:id/start-live', async () => {
            const quiz = await createDraftQuiz();
            await request(app).post(`/api/quiz/${quiz._id}/start`).set(authHeader()).send({});

            const response = await request(app)
                .post(`/api/quiz/${quiz._id}/start-live`)
                .set(authHeader())
                .send({});

            expectContract(response);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('live');

            const dbQuiz = await Quiz.findById(quiz._id).lean();
            const dbSession = await QuizSession.findOne({ quizId: quiz._id }).sort({ startedAt: -1 }).lean();
            expect(dbQuiz.status).toBe('live');
            expect(dbSession.status).toBe('live');
        });

        test('5) COMPLETE QUIZ: live -> completed via POST /quiz/:id/complete', async () => {
            const quiz = await createDraftQuiz();
            const start = await request(app).post(`/api/quiz/${quiz._id}/start`).set(authHeader()).send({});
            await request(app).post(`/api/quiz/${quiz._id}/start-live`).set(authHeader()).send({});

            const response = await request(app)
                .post(`/api/quiz/${quiz._id}/complete`)
                .set(authHeader())
                .send({ sessionCode: start.body.data.sessionCode });

            expectContract(response);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            const dbQuiz = await Quiz.findById(quiz._id).lean();
            const dbSession = await QuizSession.findOne({ quizId: quiz._id }).sort({ startedAt: -1 }).lean();
            expect(dbQuiz.status).toBe('completed');
            expect(dbSession.status).toBe('completed');
        });

        test('6) ABORT: any -> aborted', async () => {
            const quiz = await createDraftQuiz();
            const start = await request(app).post(`/api/quiz/${quiz._id}/start`).set(authHeader()).send({});

            const response = await request(app)
                .post(`/api/quiz/${quiz._id}/abort`)
                .set(authHeader())
                .send({ sessionCode: start.body.data.sessionCode });

            expectContract(response);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            const dbQuiz = await Quiz.findById(quiz._id).lean();
            const dbSession = await QuizSession.findOne({ quizId: quiz._id }).lean();
            expect(dbQuiz.status).toBe('aborted');
            expect(dbSession.status).toBe('aborted');
        });

        test('invalid transition: draft -> live is rejected', async () => {
            const quiz = await createDraftQuiz();

            const response = await request(app)
                .post(`/api/quiz/${quiz._id}/start-live`)
                .set(authHeader())
                .send({});

            expectContract(response);
            expect([400, 409]).toContain(response.status);
            expect(response.body.success).toBe(false);
        });

        test('invalid transition: completed -> live is rejected', async () => {
            const quiz = await createDraftQuiz();
            const start = await request(app).post(`/api/quiz/${quiz._id}/start`).set(authHeader()).send({});
            await request(app).post(`/api/quiz/${quiz._id}/start-live`).set(authHeader()).send({});
            await request(app)
                .post(`/api/quiz/${quiz._id}/complete`)
                .set(authHeader())
                .send({ sessionCode: start.body.data.sessionCode });

            const response = await request(app)
                .post(`/api/quiz/${quiz._id}/start-live`)
                .set(authHeader())
                .send({});

            expectContract(response);
            expect([400, 409]).toContain(response.status);
            expect(response.body.success).toBe(false);
        });

        test('aborted quiz can be relaunched to waiting', async () => {
            const quiz = await createDraftQuiz();
            const start = await request(app).post(`/api/quiz/${quiz._id}/start`).set(authHeader()).send({});
            await request(app)
                .post(`/api/quiz/${quiz._id}/abort`)
                .set(authHeader())
                .send({ sessionCode: start.body.data.sessionCode });

            const response = await request(app)
                .post(`/api/quiz/${quiz._id}/start`)
                .set(authHeader())
                .send({});

            expectContract(response);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('waiting');
            expect(response.body.data.sessionCode).toBeTruthy();
        });

        test('edge: starting already live quiz is rejected (no live -> waiting rollback)', async () => {
            const quiz = await createDraftQuiz();
            const firstStart = await request(app).post(`/api/quiz/${quiz._id}/start`).set(authHeader()).send({});
            await request(app).post(`/api/quiz/${quiz._id}/start-live`).set(authHeader()).send({});

            const secondStart = await request(app)
                .post(`/api/quiz/${quiz._id}/start`)
                .set(authHeader())
                .send({});

            expectContract(secondStart);
            expect([400, 409]).toContain(secondStart.status);
            expect(secondStart.body.success).toBe(false);
            expect(secondStart.body.message).toMatch(/Invalid quiz state transition/i);

            const activeSession = await QuizSession.findOne({ quizId: quiz._id }).lean();
            expect(activeSession.sessionCode).toBe(firstStart.body.data.sessionCode);
            expect(activeSession.status).toBe('live');
        });

        test('edge: scheduling past date is rejected', async () => {
            const quiz = await createDraftQuiz();
            const past = new Date(Date.now() - 10 * 60 * 1000).toISOString();

            const response = await request(app)
                .post(`/api/quiz/${quiz._id}/schedule`)
                .set(authHeader())
                .send({ scheduledAt: past });

            expectContract(response);
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        test('edge: multiple session conflict keeps one active session', async () => {
            const quiz = await createDraftQuiz();

            const first = await request(app)
                .post(`/api/quiz/${quiz._id}/start`)
                .set(authHeader())
                .send({});

            const second = await request(app)
                .post(`/api/quiz/${quiz._id}/start`)
                .set(authHeader())
                .send({});

            expect(first.status).toBe(200);
            expect(second.status).toBe(200);
            expect(second.body.data.sessionCode).toBe(first.body.data.sessionCode);

            const activeCount = await QuizSession.countDocuments({
                quizId: quiz._id,
                status: { $in: ['scheduled', 'waiting', 'live'] },
            });
            expect(activeCount).toBe(1);
        });

        test('legacy upcoming quiz can still start and move to waiting', async () => {
            const quizId = new mongoose.Types.ObjectId();
            const now = new Date();
            await mongoose.connection.collection('quizzes').insertOne({
                _id: quizId,
                title: 'Legacy Upcoming Quiz',
                hostId,
                roomCode: 'LEGACY1',
                status: 'upcoming',
                mode: 'auto',
                questions: [
                    {
                        _id: new mongoose.Types.ObjectId(),
                        text: 'Q1',
                        options: ['A', 'B', 'C', 'D'],
                        correctOption: 0,
                        hashedCorrectAnswer: 'dummy-hash',
                        timeLimit: 10,
                    },
                ],
                createdAt: now,
                updatedAt: now,
                __v: 0,
            });

            const response = await request(app)
                .post(`/api/quiz/${quizId}/start`)
                .set(authHeader())
                .send({});

            expectContract(response);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('waiting');

            const dbQuiz = await Quiz.findById(quizId).lean();
            expect(dbQuiz.status).toBe('waiting');
        });
    });
}
