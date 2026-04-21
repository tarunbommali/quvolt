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
const { socketManager } = require('./modules');
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
const rbacRoutes = require('./routes/rbac.routes');
const templateRoutes = require('./routes/template.routes');
const adminRoutes = require('./routes/admin/adminRoutes');

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

// Initialize OOPRealtime Infrastructure
socketManager.initialize(io);

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

    let redisFailed = false;
    // Connect Redis & attach adapter to Socket.io
    try {
        const redisOptions = {
            url: config.redisUrl,
            socket: {
                reconnectStrategy: (retries) => {
                    const maxRetries = process.env.NODE_ENV === 'development' ? 1 : 3;
                    if (retries >= maxRetries) {
                        return new Error('Max retries reached');
                    }
                    return Math.min(retries * 50, 500);
                },
                connectTimeout: 5000
            }
        };
        const pubClient = createClient(redisOptions);
        const subClient = pubClient.duplicate();
        
        pubClient.on('error', (err) => {
            if (!redisFailed && err && err.message) {
                logger.warn('Redis pubClient error', { error: err.message });
            }
        });
        subClient.on('error', (err) => {
            if (!redisFailed && err && err.message) {
                logger.warn('Redis subClient error', { error: err.message });
            }
        });

        await Promise.all([pubClient.connect(), subClient.connect()]);
        io.adapter(createAdapter(pubClient, subClient));
        logger.info('Socket.io Redis adapter connected');

        // Also initialize the shared Redis client for session storage
        await connectRedis();

        // Start Stateless Distributed Quiz Telemetry Loop
        startDistributedTimerWorker(io);

        // Resume any ongoing quizzes (Resilience)
        await rebootQuizzes(io);
        
        // Start session cleanup job
        const { startSessionCleanupJob } = require('./jobs/sessionCleanup');
        startSessionCleanupJob(io);
        
        // Start failed operations queue processor
        const statePersistence = require('./services/session/statePersistence');
        setInterval(() => {
            statePersistence.processFailedOperationsQueue().catch(error => {
                logger.error('Failed operations queue processing error', { error: error.message });
            });
        }, 5 * 60 * 1000).unref(); // Process every 5 minutes
    } catch (err) {
        redisFailed = true;
        logger.warn('Redis unavailable, falling back to in-memory session store', { error: err.message });
        
        // Ensure the HTTP API and basic server functionalities still start without Redis
        // Start session cleanup job (in-memory mode)
        const { startSessionCleanupJob } = require('./jobs/sessionCleanup');
        startSessionCleanupJob(io);

        // Start failed operations queue processor (in-memory mode)
        const statePersistence = require('./services/session/statePersistence');
        setInterval(() => {
            statePersistence.processFailedOperationsQueue().catch(error => {
                logger.error('Failed operations queue processing error', { error: error.message });
            });
        }, 5 * 60 * 1000).unref();
    }

    // Start Stateless Distributed Quiz Telemetry Loop (Required for scheduleNextAction)
    startDistributedTimerWorker(io);

    // API Routes — rate limiters applied inline on every router group
    app.use('/api/auth', authLimiter, authRoutes);
    app.use('/api/quiz', apiLimiter, quizRoutes);
    app.use('/api/payment', apiLimiter, paymentRoutes);
    app.use('/api/subscription', apiLimiter, subscriptionRoutes);
    app.use('/api/host-onboarding', apiLimiter, hostOnboardingRoutes);
    app.use('/api/analytics', apiLimiter, analyticsRoutes);
    app.use('/api/ai', apiLimiter, aiRoutes);
    app.use('/api/rbac', apiLimiter, rbacRoutes);
    app.use('/api/templates', apiLimiter, templateRoutes);
    app.use('/api/admin', apiLimiter, adminRoutes);

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

    // Initialize permission revocation service
    const permissionRevocationService = require('./services/rbac/permissionRevocation.service');
    await permissionRevocationService.initialize(io);

    // Socket auth middleware — verify JWT and attach user to socket.data
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token ||
                socket.handshake.headers?.cookie?.match(/token=([^;]+)/)?.[1];
            
            if (!token) {
                // Allow anonymous participants for public quizzes
                // Generate a stable anonymous ID based on socket ID or random
                const guestId = `guest_${socket.id.slice(0, 8)}`;
                socket.data.user = { _id: guestId, name: 'Guest', role: 'participant', isAnonymous: true };
                return next();
            }

            const decoded = jwt.verify(token, config.jwtSecret);
            const user = await User.findById(decoded.id).select('-password').lean();
            if (!user) {
                // Fallback to guest if token is invalid but it's a join attempt
                socket.data.user = { _id: `invalid_${socket.id.slice(0, 8)}`, name: 'Guest', role: 'participant', isAnonymous: true };
                return next();
            }

            socket.data.user = user;
            socket.data.token = token;
            next();
        } catch (err) {
            logger.warn('Socket auth failed', { error: err.message });
            
            if (err.name === 'TokenExpiredError') {
                socket.emit('auth_error', { message: 'Token expired', code: 'TOKEN_EXPIRED' });
            }

            // Allow them to connect as guest anyway, the service will handle restrictions per-room
            socket.data.user = { _id: `err_${socket.id.slice(0, 8)}`, name: 'Guest', role: 'participant', isAnonymous: true };
            next();
        }
    });

    // Socket logic
    io.on('connection', (socket) => {
        socketConnectionsActive.set(io.engine.clientsCount);
        logger.debug('Socket connected', { socketId: socket.id, userId: socket.data.user?._id });
        
        // Register socket connection for permission revocation tracking
        const permissionRevocationService = require('./services/rbac/permissionRevocation.service');
        if (socket.data.user?._id) {
            permissionRevocationService.registerConnection(
                socket.data.user._id.toString(),
                socket.id
            ).catch(err => {
                logger.error('Failed to register socket connection', { error: err.message });
            });
        }
        
        registerQuizSocket(io, socket);
        socket.on('disconnect', (reason) => {
            socketSessionDropsTotal.inc({ reason: reason || 'unknown' });
            socketConnectionsActive.set(io.engine.clientsCount);
            logger.debug('Socket disconnected', { socketId: socket.id, reason });
            
            // Unregister socket connection
            if (socket.data.user?._id) {
                permissionRevocationService.unregisterConnection(
                    socket.data.user._id.toString(),
                    socket.id
                ).catch(err => {
                    logger.error('Failed to unregister socket connection', { error: err.message });
                });
            }
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
    console.error('SERVER FATAL ERROR:', err);
    logger.error('Server failed to start', { message: err.message, stack: err.stack });
    setTimeout(() => process.exit(1), 500); // give time to flush
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
        
        // Cleanup permission revocation service
        try {
            const permissionRevocationService = require('./services/rbac/permissionRevocation.service');
            await permissionRevocationService.cleanup();
        } catch (err) {
            logger.error('Error cleaning up permission revocation service', { error: err.message });
        }
        
        process.exit(0);
    });
    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
    console.error('FATAL UNCAUGHT EXCEPTION:', err);
    logger.error('uncaughtException', { message: err.message, stack: err.stack });
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('FATAL UNHANDLED REJECTION:', reason);
    logger.error('unhandledRejection', { reason: String(reason), stack: reason?.stack });
});

process.on('exit', (code) => {
    console.log(`Process exiting with code: ${code}`);
});

