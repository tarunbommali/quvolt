if (typeof jest !== 'undefined') {
    const express = require('express');
    const request = require('supertest');
    const jwt = require('jsonwebtoken');
    const mongoose = require('mongoose');
    const { MongoMemoryServer } = require('mongodb-memory-server');

    const quizRoutes = require('../routes/quizRoutes');
    const Quiz = require('../models/Quiz');
    const QuizSession = require('../models/QuizSession');

    jest.setTimeout(30000);

    describe('Session Lifecycle Auth & RBAC Contracts', () => {
        let mongod;
        let app;
        let hostAId;
        let hostBId;
        let participantId;
        let hostAToken;
        let hostBToken;
        let participantToken;

        const mockIo = {
            to: () => ({ emit: () => { } }),
            in: () => ({ socketsLeave: () => { } }),
            emit: () => { },
        };

        const withToken = (token) => ({ Authorization: `Bearer ${token}` });

        const expectContract = (response) => {
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('message');
        };

        const createQuiz = async (hostId, overrides = {}) => {
            const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
            return Quiz.create({
                title: `Auth Quiz ${rand}`,
                hostId,
                roomCode: `A${rand}`,
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
            await mongoose.connect(mongod.getUri(), { dbName: 'quiz-auth-test' });

            app = express();
            app.use(express.json());
            app.set('io', mockIo);
            app.use('/api/quiz', quizRoutes);

            hostAId = new mongoose.Types.ObjectId();
            hostBId = new mongoose.Types.ObjectId();
            participantId = new mongoose.Types.ObjectId();

            hostAToken = jwt.sign({ id: hostAId.toString(), role: 'host' }, process.env.JWT_SECRET, { expiresIn: '1h' });
            hostBToken = jwt.sign({ id: hostBId.toString(), role: 'host' }, process.env.JWT_SECRET, { expiresIn: '1h' });
            participantToken = jwt.sign({ id: participantId.toString(), role: 'participant' }, process.env.JWT_SECRET, { expiresIn: '1h' });
        });

        afterEach(async () => {
            await Promise.all([
                Quiz.deleteMany({}),
                QuizSession.deleteMany({}),
            ]);
        });

        afterAll(async () => {
            await mongoose.disconnect();
            if (mongod) await mongod.stop();
        });

        test('1) unauthenticated lifecycle access returns 401', async () => {
            const quiz = await createQuiz(hostAId);
            const endpoints = [
                ['post', `/api/quiz/${quiz._id}/start`, {}],
                ['post', `/api/quiz/${quiz._id}/start-live`, {}],
                ['post', `/api/quiz/${quiz._id}/schedule`, { scheduledAt: new Date(Date.now() + 3600_000).toISOString() }],
                ['post', `/api/quiz/${quiz._id}/complete`, {}],
                ['post', `/api/quiz/${quiz._id}/abort`, {}],
            ];

            for (const [method, url, body] of endpoints) {
                const response = await request(app)[method](url).send(body);
                expect(response.status).toBe(401);
                expectContract(response);
                expect(response.body.success).toBe(false);
            }
        });

        test('2) participant lifecycle control is forbidden (403)', async () => {
            const quiz = await createQuiz(hostAId);
            const endpoints = [
                ['post', `/api/quiz/${quiz._id}/start`, {}],
                ['post', `/api/quiz/${quiz._id}/start-live`, {}],
                ['post', `/api/quiz/${quiz._id}/abort`, {}],
                ['post', `/api/quiz/${quiz._id}/complete`, {}],
            ];

            for (const [method, url, body] of endpoints) {
                const response = await request(app)[method](url).set(withToken(participantToken)).send(body);
                expect(response.status).toBe(403);
                expectContract(response);
                expect(response.body.success).toBe(false);
            }
        });

        test('3) host lifecycle actions are authorized', async () => {
            const quiz = await createQuiz(hostAId);

            const start = await request(app)
                .post(`/api/quiz/${quiz._id}/start`)
                .set(withToken(hostAToken))
                .send({});
            expect(start.status).toBe(200);
            expectContract(start);
            expect(start.body.success).toBe(true);

            const live = await request(app)
                .post(`/api/quiz/${quiz._id}/start-live`)
                .set(withToken(hostAToken))
                .send({});
            expect(live.status).toBe(200);
            expectContract(live);
            expect(live.body.success).toBe(true);

            const complete = await request(app)
                .post(`/api/quiz/${quiz._id}/complete`)
                .set(withToken(hostAToken))
                .send({ sessionCode: start.body.data.sessionCode });
            expect(complete.status).toBe(200);
            expectContract(complete);
            expect(complete.body.success).toBe(true);
        });

        test('4) invalid token (malformed, expired) returns 401', async () => {
            const quiz = await createQuiz(hostAId);
            const expired = jwt.sign({ id: hostAId.toString(), role: 'host' }, process.env.JWT_SECRET, { expiresIn: -1 });

            const malformedRes = await request(app)
                .post(`/api/quiz/${quiz._id}/start`)
                .set(withToken('malformed.jwt.token'))
                .send({});
            expect(malformedRes.status).toBe(401);
            expectContract(malformedRes);
            expect(malformedRes.body.success).toBe(false);

            const expiredRes = await request(app)
                .post(`/api/quiz/${quiz._id}/start`)
                .set(withToken(expired))
                .send({});
            expect(expiredRes.status).toBe(401);
            expectContract(expiredRes);
            expect(expiredRes.body.success).toBe(false);
        });

        test('5) cross-user host access is forbidden (403)', async () => {
            const quizOwnedByB = await createQuiz(hostBId);

            const endpoints = [
                ['post', `/api/quiz/${quizOwnedByB._id}/start`, {}],
                ['post', `/api/quiz/${quizOwnedByB._id}/start-live`, {}],
                ['post', `/api/quiz/${quizOwnedByB._id}/schedule`, { scheduledAt: new Date(Date.now() + 3600_000).toISOString() }],
                ['post', `/api/quiz/${quizOwnedByB._id}/complete`, {}],
                ['post', `/api/quiz/${quizOwnedByB._id}/abort`, {}],
            ];

            for (const [method, url, body] of endpoints) {
                const response = await request(app)[method](url).set(withToken(hostAToken)).send(body);
                expect(response.status).toBe(403);
                expectContract(response);
                expect(response.body.success).toBe(false);
            }
        });

        test('6) replay/duplicate start-live is safe (200 no-op or 409 rejection)', async () => {
            const quiz = await createQuiz(hostAId);
            await request(app).post(`/api/quiz/${quiz._id}/start`).set(withToken(hostAToken)).send({});
 
            const first = await request(app).post(`/api/quiz/${quiz._id}/start-live`).set(withToken(hostAToken)).send({});
            const second = await request(app).post(`/api/quiz/${quiz._id}/start-live`).set(withToken(hostAToken)).send({});
 
            expect(first.status).toBe(200);
            expectContract(first);
            expectContract(second);
            expect([200, 404, 409]).toContain(second.status);
 
            const activeCount = await QuizSession.countDocuments({ quizId: quiz._id, status: { $in: ['waiting', 'live', 'scheduled'] } });
            expect(activeCount).toBe(1);
        });
 
        test('7) session hijack attempt with wrong sessionCode/mismatched quizId is rejected', async () => {
            const quizA = await createQuiz(hostAId);
            const quizB = await createQuiz(hostAId);
 
            const startA = await request(app)
                .post(`/api/quiz/${quizA._id}/start`)
                .set(withToken(hostAToken))
                .send({});
 
            const wrongCode = `${startA.body.data.sessionCode}X`;
 
            const completeWrong = await request(app)
                .post(`/api/quiz/${quizA._id}/complete`)
                .set(withToken(hostAToken))
                .send({ sessionCode: wrongCode });
 
            expect([400, 404, 409]).toContain(completeWrong.status);
            expectContract(completeWrong);
            expect(completeWrong.body.success).toBe(false);
 
            const abortMismatch = await request(app)
                .post(`/api/quiz/${quizB._id}/abort`)
                .set(withToken(hostAToken))
                .send({ sessionCode: startA.body.data.sessionCode });
 
            expect([400, 403, 404, 409]).toContain(abortMismatch.status);
            expectContract(abortMismatch);
            expect(abortMismatch.body.success).toBe(false);
        });
    });
}
