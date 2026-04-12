const Razorpay = require('razorpay');
const config = require('./env');

const paymentsDisabledError = () => {
  const error = new Error('Payments are disabled in this environment');
  error.code = 'PAYMENTS_DISABLED';
  throw error;
};

// Initialize Razorpay instance with credentials from environment.
// In local/dev, this lets the service boot even when payment creds are intentionally absent.
const razorpay = config.paymentsEnabled
  ? new Razorpay({
    key_id: config.razorpayKeyId,
    key_secret: config.razorpayKeySecret,
  })
  : {
    orders: { create: paymentsDisabledError },
    payments: { fetch: paymentsDisabledError },
  };

module.exports = razorpay;
