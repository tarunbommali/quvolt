const paymentRouter = require('../services/router/PaymentRouter');
const idempotencyUtil = require('./core/IdempotencyManager');

const SubscriptionServiceClass = require('./subscription/SubscriptionService');


// Initialize Subscription Service
const subscriptionService = new SubscriptionServiceClass({
  paymentRouter,
  idempotencyUtil
});



module.exports = {

  subscriptionService,

  paymentRouter,
  idempotencyUtil
};
