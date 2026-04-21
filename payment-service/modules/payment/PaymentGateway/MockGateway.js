const GatewayInterface = require('../../../services/gateways/GatewayInterface');
const logger = require('../../../utils/logger');

/**
 * Mock Payment Gateway Adapter
 * For local development and testing
 */
class MockGateway extends GatewayInterface {
  constructor(config) {
    super(config);
    logger.info('MockGateway initialized');
  }

  async createOrder(orderData) {
    const id = `mock_order_${Date.now()}`;
    return {
      id,
      amount: orderData.amount,
      currency: orderData.currency,
      receipt: orderData.receipt,
      status: 'created'
    };
  }

  async verifyPayment(verificationData) {
    return true;
  }

  async fetchPaymentDetails(paymentId) {
    return {
      id: paymentId,
      status: 'captured',
      amount: 10000,
      fee: 200,
      tax: 36
    };
  }

  async healthCheck() {
    return {
      available: true,
      latency: 5,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = MockGateway;
