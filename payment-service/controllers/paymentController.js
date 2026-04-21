const razorpay = require('../config/razorpay');
const Payment = require('../models/Payment');
const logger = require('../utils/logger');
const config = require('../config/env');
const paymentService = require('../services/payment/payment.service');
const { toRupees } = require('../services/payment/split.service');

exports.createOrder = async (req, res) => {
  try {
    const { quizId } = req.body;
    if (!quizId) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'quizId is required' } });

    const result = await paymentService.createQuizOrder({ quizId, userId: req.user._id });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    const status = error.status || 500;
    logger.error('Create order error', { error: error.message });
    res.status(status).json({ error: { code: error.code || 'SERVER_ERROR', message: error.message } });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;
    if (!orderId || !paymentId || !signature) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Missing payment proof' } });

    const payment = await Payment.findOne({ razorpayOrderId: orderId });
    if (!payment) return res.status(404).json({ error: { code: 'PAYMENT_NOT_FOUND', message: 'Order not found' } });

    if (payment.status === 'completed') return res.status(200).json({ success: true, data: payment });

    if (!config.mockPaymentsEnabled || !orderId.startsWith('mock_')) {
      const crypto = require('crypto');
      const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
      if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) {
        return res.status(400).json({ error: { code: 'INVALID_SIGNATURE', message: 'Signature mismatch' } });
      }
    }

    const razorpayPayment = await razorpay.payments.fetch(paymentId).catch(() => null);
    
    payment.razorpayPaymentId = paymentId;
    payment.razorpaySignature = signature;
    payment.status = 'completed';
    payment.gatewayFeeAmount = toRupees(razorpayPayment?.fee || 0);
    payment.taxAmount = toRupees(razorpayPayment?.tax || 0);
    await payment.save();

    res.json({ success: true, data: payment });
  } catch (error) {
    logger.error('Verify payment error', { error: error.message });
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Verification failed' } });
  }
};

exports.getPaymentStatus = async (req, res) => {
  try {
    const payment = await Payment.findOne({ userId: req.user._id, quizId: req.params.quizId, status: 'completed' }).lean();
    res.json({ success: true, data: { paid: !!payment, payment } });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Status fetch failed' } });
  }
};

exports.getBatchPaymentStatus = async (req, res) => {
  try {
    const { quizIds } = req.body;
    const payments = await Payment.find({ userId: req.user._id, quizId: { $in: quizIds }, status: 'completed' }).lean();
    const map = quizIds.reduce((acc, id) => ({ ...acc, [id]: { paid: false } }), {});
    payments.forEach(p => map[p.quizId.toString()] = { paid: true, paymentId: p._id });
    res.json({ success: true, data: map });
  } catch (error) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Batch status failed' } });
  }
};
