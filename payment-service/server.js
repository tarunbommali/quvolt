require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const config = require('./config/env');
const { initSubscriptionJobs } = require('./jobs/subscriptionExpiryJob');
const { initFailedJobWorker } = require('./jobs/failedJobWorker');
const FailedJob = require('./models/FailedJob');

const app = express();

// Connect to database
connectDB();

// ---- Security Middleware ----
app.use(cors({
  origin: config.corsOrigin,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'X-Razorpay-Signature'],
  credentials: true
}));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"]
    }
  },
  xContentTypeOptions: true,
  xFrameOptions: { action: 'deny' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
}));

// ---- Rate Limiting ----
const rateLimit = require('express-rate-limit');

// Payment API: 10 requests per minute per IP
const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many payment requests. Please try again later.',
      details: { retryAfter: 60 }
    }
  },
  skip: (req) => req.path === '/payment/health' || req.path === '/payment/webhook'
});

app.use('/payment', paymentLimiter);

// Body parsing - raw body needed for webhook signature verification
app.use(express.json({
  limit: '50kb',
  verify: (req, res, buf) => {
    if (req.originalUrl === '/payment/webhook') {
      req.rawBody = Buffer.from(buf);
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// Correlation ID middleware
app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Correlation-ID', req.correlationId);
  next();
});

// ---- Request Logging Middleware ----
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      correlationId: req.correlationId,
      ip: req.ip
    });
  });
  next();
});

// ---- Input Sanitization ----
app.use((req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') return obj.replace(/\0/g, '').trim();
    if (Array.isArray(obj)) return obj.map(sanitize);
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        if (key.startsWith('$')) continue;
        sanitized[key] = sanitize(value);
      }
      return sanitized;
    }
    return obj;
  };
  if (req.body && typeof req.body === 'object') req.body = sanitize(req.body);
  if (req.query && typeof req.query === 'object') req.query = sanitize(req.query);
  next();
});

// Routes
app.use('/payment', require('./routes/paymentRoutes'));
app.use('/subscription', require('./routes/subscriptionRoutes'));

// Health check
app.get('/payment/health', async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const statusCode = dbState === 1 ? 200 : 503;

  let failedJobs = { pending: null, deadLetter: null };
  try {
    const [pending, deadLetter] = await Promise.all([
      FailedJob.countDocuments({ status: { $in: ['pending', 'retrying'] } }),
      FailedJob.countDocuments({ status: 'dead_letter' }),
    ]);
    failedJobs = { pending, deadLetter };
  } catch (error) {
    logger.warn('Unable to collect failed job counts for health check', { error: error.message });
  }

  res.status(statusCode).json({
    status: statusCode === 200 ? 'healthy' : 'unhealthy',
    service: 'payment-service',
    paymentsMode: config.paymentsEnabled ? 'gateway' : config.mockPaymentsEnabled ? 'mock' : 'disabled',
    database: dbState === 1 ? 'connected' : 'disconnected',
    failedJobs,
    routeSplitEnabled: String(process.env.ROUTE_SPLIT_ENABLED || 'true').toLowerCase() === 'true',
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ---- Centralized Error Handler ----
app.use((err, req, res, next) => {
  let statusCode = err.status || err.statusCode || 500;
  let errorCode = err.code || 'SERVER_ERROR';

  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
  } else if (err.code === 11000) {
    statusCode = 409;
    errorCode = 'DUPLICATE_ENTRY';
  }

  logger.error('Request error', {
    code: errorCode,
    message: err.message,
    stack: err.stack,
    statusCode,
    method: req.method,
    path: req.originalUrl,
    correlationId: req.correlationId
  });

  res.status(statusCode).json({
    error: {
      code: errorCode,
      message: statusCode === 500 ? 'Internal server error' : err.message,
      details: { correlationId: req.correlationId }
    }
  });
});

const server = app.listen(config.port, () => {
  logger.info(`Payment service running on port ${config.port}`);

  // In clustered deployments, only enable this on a designated instance.
  if (String(process.env.SUBSCRIPTION_JOBS_ENABLED || 'false').toLowerCase() === 'true') {
    initSubscriptionJobs();
    logger.info('Subscription jobs enabled');
  } else {
    logger.info('Subscription jobs disabled');
  }

  if (String(process.env.FAILED_JOB_WORKER_ENABLED || 'true').toLowerCase() === 'true') {
    initFailedJobWorker();
    logger.info('Failed job retry worker enabled');
  }
});

// ---- Graceful Shutdown ----
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);

  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      await mongoose.connection.close();
      logger.info('Database connection closed');
    } catch (err) {
      logger.error('Error closing database connection', { error: err.message });
    }

    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;
