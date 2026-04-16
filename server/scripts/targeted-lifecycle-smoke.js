const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const quizRoutes = require('../routes/quizRoutes');
const Quiz = require('../models/Quiz');
const QuizSession = require('../models/QuizSession');
const Submission = require('../models/Submission');

const printStep = (label, details) => {
    console.log(`${label}: ${details}`);
};

(async () => {
    let mongod;

    try {
        process.env.JWT_SECRET = process.env.JWT_SECRET || 'smoke-secret';

        mongod = await MongoMemoryServer.create();
        await mongoose.connect(mongod.getUri(), { dbName: 'targeted-lifecycle-smoke' });

        const app = express();
        app.use(express.json());
        app.set('io', {
            to: () => ({ emit: () => { } }),
            in: () => ({ socketsLeave: () => { } }),
            emit: () => { },
        });
        app.use('/api/quiz', quizRoutes);

        const hostId = new mongoose.Types.ObjectId();
        const token = jwt.sign(
            { id: hostId.toString(), role: 'host' },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        const auth = { Authorization: `Bearer ${token}` };

        const createRes = await request(app)
            .post('/api/quiz')
            .set(auth)
            .send({ title: 'Smoke Draft Quiz', type: 'quiz' });

        if (createRes.status !== 201 || !createRes.body?._id) {
            throw new Error(`create draft quiz failed with status ${createRes.status}`);
        }

        const quizId = createRes.body._id;
        printStep('create draft quiz', `PASS | quizId=${quizId} | status=${createRes.body.status}`);

        const startRes = await request(app)
            .post(`/api/quiz/${quizId}/start`)
            .set(auth)
            .send({});

        if (startRes.status !== 200 || !startRes.body?.success || !startRes.body?.data?.sessionCode) {
            throw new Error(`start failed with status ${startRes.status}`);
        }

        const sessionCode = startRes.body.data.sessionCode;
        printStep(
            'start (launch -> invite equivalent)',
            `PASS | status=${startRes.body.data.status} | sessionCode=${sessionCode}`
        );

        const liveRes = await request(app)
            .post(`/api/quiz/${quizId}/start-live`)
            .set(auth)
            .send({});

        if (liveRes.status !== 200 || !liveRes.body?.success) {
            throw new Error(`start-live failed with status ${liveRes.status}`);
        }

        printStep(
            'start-live (invite -> live equivalent)',
            `PASS | status=${liveRes.body.data.status} | sessionCode=${liveRes.body.data.sessionCode}`
        );

        const quizAfter = await Quiz.findById(quizId).lean();
        if (!quizAfter || quizAfter.status !== 'live') {
            throw new Error(`assert failed: expected live, got ${quizAfter?.status || 'missing'}`);
        }

        printStep('assert final status live', `PASS | status=${quizAfter.status}`);
    } catch (error) {
        console.error(`smoke script failed: ${error.message}`);
        process.exitCode = 1;
    } finally {
        await Promise.all([
            Submission.deleteMany({}).catch(() => { }),
            QuizSession.deleteMany({}).catch(() => { }),
            Quiz.deleteMany({}).catch(() => { }),
        ]);
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect().catch(() => { });
        }
        if (mongod) {
            await mongod.stop().catch(() => { });
        }
    }
})();
