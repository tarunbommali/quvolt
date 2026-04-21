const GatewayInterface = require('../../services/gateways/GatewayInterface');
const RazorpayGateway = require('../../services/gateways/RazorpayGateway');
const logger = require('../../utils/logger');

/**
 * Payment Gateway Factory (Creational Pattern)
 * Responsible for creating gateway instances based on provider name
 */
class PaymentGatewayFactory {
  /**
   * Create a gateway instance
   * @param {string} provider - Provider name (e.g., 'razorpay')
   * @param {Object} config - Gateway configuration
   * @returns {GatewayInterface}
   */
  static create(provider, config) {
    const providerName = provider.toLowerCase();

    switch (providerName) {
      case 'razorpay':
        return new RazorpayGateway(config);
      
      // Future adapters:
      // case 'stripe':
      //   return new StripeGateway(config);
      
      default:
        logger.error(`Unknown gateway provider: ${provider}`);
        throw new Error(`Unsupported payment gateway: ${provider}`);
    }
  }
}

module.exports = PaymentGatewayFactory;
