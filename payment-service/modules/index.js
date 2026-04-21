const paymentRouter = require('../services/router/PaymentRouter');
const idempotencyUtil = require('./core/IdempotencyManager');
const PaymentServiceClass = require('./payment/PaymentService');
const SubscriptionServiceClass = require('./subscription/SubscriptionService');
const KycServiceClass = require('./kyc/KycService');

/**
 * Service Registry / Container
 * Manages singleton instances of refactored OOP services
 */

const kycService = new KycServiceClass();

// Initialize Subscription Service
const subscriptionService = new SubscriptionServiceClass({
  paymentRouter,
  idempotencyUtil
});

// Initialize Payment Service with its dependencies
const paymentService = new PaymentServiceClass({
  paymentRouter,
  subscriptionService,
  idempotencyUtil
});

module.exports = {
  paymentService,
  subscriptionService,
  kycService,
  paymentRouter,
  idempotencyUtil
};
