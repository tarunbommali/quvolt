const express = require('express');
const router = express.Router();
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const requireRole = require('../middleware/requireRole');
const { protect, authorize } = require('../middleware/auth');
const { paymentFailuresTotal } = require('../observability/metrics');
const logger = require('../utils/logger');

const PAYMENT_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:5001';
const PAYMENT_PROXY_TIMEOUT_MS = Number(process.env.PAYMENT_PROXY_TIMEOUT_MS || 8000);

const paymentWriteLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many payment requests. Please retry shortly.' },
});

const paymentReadLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many payment status checks. Please retry shortly.' },
});

// Helper to forward requests to payment-service
const proxy = async (req, res, method, path, data, queryParams) => {
    try {
        const headers = {
            'Content-Type': 'application/json',
            'X-Correlation-ID': req.headers['x-correlation-id'] || `${Date.now()}`,
        };

        if (req.headers.authorization) {
            headers.Authorization = req.headers.authorization;
        }

        const config = {
            method,
            url: `${PAYMENT_URL}${path}`,
            headers,
            timeout: PAYMENT_PROXY_TIMEOUT_MS,
        };
        if (data) config.data = data;
        if (queryParams) config.params = queryParams;

        const response = await axios(config);
        res.status(response.status).json(response.data);
    } catch (error) {
        logger.error(`[Proxy Error] ${error.code || 'UNKNOWN'} - ${PAYMENT_URL}${path}`, {
            message: error.message,
            status: error.response?.status,
            url: PAYMENT_URL,
        });

        const status = error.response?.status || 500;
        paymentFailuresTotal.inc({ route: path, status_code: String(status) });
        const isTimeout = error.code === 'ECONNABORTED';
        const body = error.response?.data || {
            error: {
                code: isTimeout
                    ? 'PAYMENT_SERVICE_TIMEOUT'
                    : error.code === 'ECONNREFUSED'
                        ? 'PAYMENT_SERVICE_OFFLINE'
                        : 'PROXY_ERROR',
                message: 'Payment service temporarily unavailable. Please try again in a moment.',
                details: {
                    hint: isTimeout
                        ? `Payment service did not respond within ${PAYMENT_PROXY_TIMEOUT_MS}ms`
                        : error.code === 'ECONNREFUSED'
                            ? `Payment service not running on ${PAYMENT_URL}`
                            : 'Check network connectivity and payment service status'
                }
            }
        };
        res.status(status).json(body);
    }
};

// @route   POST /api/payment/create-order
// @desc    Create a Razorpay order (authed user)
router.post('/create-order', paymentWriteLimiter, requireRole(['host', 'admin', 'participant']), (req, res) => {
    const { quizId, amount } = req.body;
    logger.audit('payment.create_order.requested', {
        requestId: req.requestId,
        userId: req.user?._id,
        quizId,
        amount,
    });
    proxy(req, res, 'post', '/payment/create-order', {
        quizId,
        amount,
    });
});

// @route   POST /api/payment/verify
// @desc    Verify a completed payment
router.post('/verify', paymentWriteLimiter, requireRole(['host', 'admin', 'participant']), (req, res) => {
    const { orderId, paymentId, signature, quizId } = req.body;
    logger.audit('payment.verify.requested', {
        requestId: req.requestId,
        userId: req.user?._id,
        quizId,
        orderId,
        paymentId,
    });
    proxy(req, res, 'post', '/payment/verify', {
        orderId,
        paymentId,
        signature,
        quizId,
    });
});

// @route   GET /api/payment/status/:quizId
// @desc    Check if current user paid for a quiz
router.get('/status/:quizId', paymentReadLimiter, requireRole(['host', 'admin', 'participant']), (req, res) => {
    proxy(req, res, 'get', `/payment/status/${req.params.quizId}`);
});

// @route   POST /api/payment/status/batch
// @desc    Batch check payment status for multiple quizzes

router.post('/status/batch', paymentReadLimiter, requireRole(['host', 'admin', 'participant']), (req, res) => {
    const { quizIds } = req.body;
    proxy(req, res, 'post', '/payment/status/batch', {
        quizIds,
    });
});

// @route   POST /api/payment/host/account
// @desc    Upsert host Razorpay linked account profile

router.post('/host/account', requireRole(['host', 'admin']), (req, res) => {
    proxy(req, res, 'post', '/payment/host/account', req.body);
});

// @route   GET /api/payment/host/account
// @desc    Get current host linked account profile

router.get('/host/account', requireRole(['host', 'admin']), (req, res) => {
    proxy(req, res, 'get', '/payment/host/account');
});

// @route   GET /api/payment/host/payout-summary
// @desc    Get host payout summary

router.get('/host/payout-summary', requireRole(['host', 'admin']), (req, res) => {
    proxy(req, res, 'get', '/payment/host/payout-summary');
});

// @route   POST /api/payment/revenue/total
// @desc    Get total host revenue

router.post('/revenue/total', requireRole(['host', 'admin']), (req, res) => {
    proxy(req, res, 'post', '/payment/revenue/total', req.body);
});

// @route   POST /api/payment/revenue/by-quiz
// @desc    Get revenue breakdown per quiz

router.post('/revenue/by-quiz', requireRole(['host', 'admin']), (req, res) => {
    proxy(req, res, 'post', '/payment/revenue/by-quiz', req.body);
});

// @route   POST /api/payment/revenue/by-period
// @desc    Get revenue trend by period (daily/weekly/monthly)
router.post('/revenue/by-period', protect, authorize('host', 'admin'), (req, res) => {
    proxy(req, res, 'post', '/payment/revenue/by-period', req.body);
});

// Admin-only aggregate analytics shortcuts
router.post('/admin/revenue/total', protect, authorize('admin'), (req, res) => {
    proxy(req, res, 'post', '/payment/revenue/total', req.body || {});
});

router.post('/admin/revenue/by-period', protect, authorize('admin'), (req, res) => {
    proxy(req, res, 'post', '/payment/revenue/by-period', req.body || {});
});

// @route   GET /api/payment/health
// @desc    Check payment service health
router.get('/health', async (req, res) => {
    try {
        const response = await axios.get(`${PAYMENT_URL}/payment/health`);
        res.json(response.data);
    } catch {
        res.status(503).json({ status: 'unhealthy', message: 'Payment service unavailable' });
    }
});

// ========== SUBSCRIPTION ROUTES ==========

// @route   GET /api/payment/subscription/plans
// @desc    Get all subscription plans (public)
router.get('/subscription/plans', (req, res) => {
    proxy(req, res, 'get', '/subscription/plans');
});

// @route   GET /api/payment/subscription/my-subscription
// @desc    Get current host's subscription (protected)
router.get('/subscription/my-subscription', protect, authorize('host', 'admin'), (req, res) => {
    proxy(req, res, 'get', '/subscription/my-subscription');
});

// @route   POST /api/payment/subscription/create-order
// @desc    Create Razorpay order for subscription payment (protected)
router.post('/subscription/create-order', protect, authorize('host', 'admin'), (req, res) => {
    const { planId } = req.body;
    logger.audit('subscription.create_order.requested', {
        requestId: req.requestId,
        userId: req.user?._id,
        planId,
    });
    proxy(req, res, 'post', '/subscription/create-order', { planId });
});

// @route   POST /api/payment/subscription/verify-payment
// @desc    Verify subscription payment and activate plan (protected)
router.post('/subscription/verify-payment', protect, authorize('host', 'admin'), (req, res) => {
    const { orderId, paymentId, signature, planId } = req.body;
    logger.audit('subscription.verify.requested', {
        requestId: req.requestId,
        userId: req.user?._id,
        planId,
        orderId,
        paymentId,
    });
    proxy(req, res, 'post', '/subscription/verify-payment', {
        orderId,
        paymentId,
        signature,
        planId,
    });
});

// @route   POST /api/payment/subscription/cancel
// @desc    Cancel current subscription (protected)
router.post('/subscription/cancel', protect, authorize('host', 'admin'), (req, res) => {
    const { reason } = req.body;
    proxy(req, res, 'post', '/subscription/cancel', { reason });
});

// @route   GET /api/payment/subscription/admin/statistics
// @desc    Get subscription statistics (admin only)
router.get('/subscription/admin/statistics', protect, authorize('admin'), (req, res) => {
    proxy(req, res, 'get', '/subscription/admin/statistics');
});

// @route   GET /api/payment/subscription/admin/all
// @desc    Get all active subscriptions (admin only, paginated)
router.get('/subscription/admin/all', protect, authorize('admin'), (req, res) => {
    const { plan, limit, skip } = req.query;
    proxy(req, res, 'get', '/subscription/admin/all', null, {
        plan: plan || '',
        limit: limit || 50,
        skip: skip || 0,
    });
});

module.exports = router;
