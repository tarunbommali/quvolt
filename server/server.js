require('dotenv').config();
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const connectDB = require('./config/db');
const { connectRedis, getRedisClient } = require('./config/redis');
const config = require('./config/env');
const User = require('./models/User');
const registerQuizSocket = require('./sockets/quiz.socket');
const { rebootQuizzes, startDistributedTimerWorker } = require('./services/quiz/quiz.service');
const logger = require('./utils/logger');
const requestContext = require('./middleware/requestContext');
const {
    client: metricsClient,
    httpRequestDurationMs,
    httpRequestTotal,
    httpRequestErrorsTotal,
    socketConnectionsActive,
    socketSessionDropsTotal,
} = require('./observability/metrics');

const httpServerEnabled = String(process.env.HTTP_SERVER_ENABLED || 'true').toLowerCase() === 'true';

// Routes
const authRoutes = require('./routes/authRoutes');
const quizRoutes = require('./routes/quizRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const hostOnboardingRoutes = require('./routes/hostOnboardingRoutes');
const analyticsRoutes = require('./routes/analytics.routes');
const aiRoutes = require('./routes/ai.routes');

// Initialize Express
const app = express();
const server = http.createServer(app);

const io = socketio(server, {
    cors: {
        origin: config.clientUrl,
        methods: ['GET', 'POST'],
        credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
});
app.set('io', io);

// ── Security Middleware ─────────────────────────────────────────────────────
app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: '500kb' }));
app.use(requestContext);
app.use(cors({
    origin: config.clientUrl,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Correlation-Id'],
    credentials: true,
}));

// ── Request Logger ───────────────────────────────────────────────────────────
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const durationMs = Date.now() - start;
        const route = req.route?.path || req.path || 'unknown';
        const labels = {
            method: req.method,
            route,
            status_code: String(res.statusCode),
        };

        httpRequestDurationMs.observe(labels, durationMs);
        httpRequestTotal.inc(labels);
        if (res.statusCode >= 500) {
            httpRequestErrorsTotal.inc(labels);
        }

        const logData = {
            requestId: req.requestId,
            userId: req.user?._id || null,
            quizId: req.params?.id || req.params?.quizId || req.body?.quizId || null,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            durationMs,
            ip: req.ip,
        };
        if (res.statusCode >= 500) {
            logger.error('HTTP request', logData);
        } else if (res.statusCode >= 400) {
            logger.warn('HTTP request', logData);
        } else {
            logger.info('HTTP request', logData);
        }
    });
    next();
});

// ── Rate Limiting ───────────────────────────────────────────────────────────
// Auth routes: strict (prevent brute force)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,     // 15 minutes
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many auth attempts, please try again in 15 minutes.' },
    skip: (req) => req.method === 'GET',
});

// Public / quiz API: generous
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again later.' },
    skip: (req) => req.path === '/api/health',
});

// ── Bootstrap ───────────────────────────────────────────────────────────────
const bootstrap = async () => {
    // Connect Database
    await connectDB();

    // Connect Redis & attach adapter to Socket.io
    try {
        const pubClient = createClient({ url: config.redisUrl });
        const subClient = pubClient.duplicate();
        await Promise.all([pubClient.connect(), subClient.connect()]);
        io.adapter(createAdapter(pubClient, subClient));
        logger.info('Socket.io Redis adapter connected');

        // Also initialize the shared Redis client for session storage
        await connectRedis();

        // Start Stateless Distributed Quiz Telemetry Loop
        startDistributedTimerWorker(io);

        // Resume any ongoing quizzes (Resilience)
        await rebootQuizzes(io);
    } catch (err) {
        logger.warn('Redis unavailable, falling back to in-memory session store', { error: err.message });
    }

    // API Routes — rate limiters applied inline on every router group
    app.use('/api/auth', authLimiter, authRoutes);
    app.use('/api/quiz', apiLimiter, quizRoutes);
    app.use('/api/payment', apiLimiter, paymentRoutes);
    app.use('/api/subscription', apiLimiter, subscriptionRoutes);
    app.use('/api/host-onboarding', apiLimiter, hostOnboardingRoutes);
    app.use('/api/analytics', apiLimiter, analyticsRoutes);
    app.use('/api/ai', apiLimiter, aiRoutes);

    // Health check
    app.get('/api/health', (req, res) => {
        let redis = 'disconnected';
        try {
            redis = getRedisClient().isOpen ? 'connected' : 'disconnected';
        } catch {
            redis = 'disconnected';
        }

        res.json({
            status: 'healthy',
            service: 'quiz-server',
            uptime: Math.round(process.uptime()),
            environment: config.nodeEnv,
            redis,
            activeSocketConnections: io.engine.clientsCount,
            timestamp: new Date().toISOString(),
        });
    });

    app.get('/api/metrics', (req, res, next) => {
        const key = req.headers['x-metrics-key'];
        if (key !== process.env.METRICS_SECRET) return res.status(401).end();
        next();
    }, async (req, res) => {
        res.set('Content-Type', metricsClient.register.contentType);
        const metrics = await metricsClient.register.metrics();
        res.status(200).send(metrics);
    });

    // 404 handler
    app.use((req, res) => {
        res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
    });

    // Centralized error handler
    app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
        logger.error('Unhandled request error', {
            message: err.message,
            stack: err.stack,
            method: req.method,
            path: req.path,
        });
        const statusCode = err.status || err.statusCode || 500;
        res.status(statusCode).json({
            message: statusCode === 500 ? 'Internal server error' : err.message,
        });
    });

    // Socket auth middleware — verify JWT and attach full user to socket.data
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token ||
                socket.handshake.headers?.cookie?.match(/token=([^;]+)/)?.[1];
            if (!token) return next(new Error('AUTH_REQUIRED'));

            const decoded = jwt.verify(token, config.jwtSecret);
            const user = await User.findById(decoded.id).select('-password').lean();
            if (!user) return next(new Error('AUTH_USER_NOT_FOUND'));

            socket.data.user = user;
            socket.data.token = token;
            next();
        } catch (err) {
            logger.warn('Socket auth failed', { error: err.message });
            next(new Error('AUTH_INVALID'));
        }
    });

    // Socket logic
    io.on('connection', (socket) => {
        socketConnectionsActive.set(io.engine.clientsCount);
        logger.debug('Socket connected', { socketId: socket.id, userId: socket.data.user?._id });
        registerQuizSocket(io, socket);
        socket.on('disconnect', (reason) => {
            socketSessionDropsTotal.inc({ reason: reason || 'unknown' });
            socketConnectionsActive.set(io.engine.clientsCount);
            logger.debug('Socket disconnected', { socketId: socket.id, reason });
        });
    });

    if (httpServerEnabled) {
        server.listen(config.port, () =>
            logger.info(`Server started`, { port: config.port, environment: config.nodeEnv })
        );
    } else {
        logger.info('Quiz worker mode started (HTTP server disabled)', {
            environment: config.nodeEnv,
            subscriptionJobsEnabled: String(process.env.SUBSCRIPTION_JOBS_ENABLED || 'false').toLowerCase() === 'true',
        });
    }
};

bootstrap().catch((err) => {
    logger.error('Server failed to start', { message: err.message, stack: err.stack });
    process.exit(1);
});

// ── Graceful Shutdown ───────────────────────────────────────────────────────
const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down gracefully`);

    if (!httpServerEnabled) {
        process.exit(0);
        return;
    }

    server.close(async () => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Catch unhandled promise rejections (not caught by winston rejectionHandlers in some environments)
process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason: String(reason) });
});
