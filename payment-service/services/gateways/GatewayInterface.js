/**
 * Base Gateway Interface
 * 
 * All payment gateway adapters must implement this interface to ensure
 * consistent behavior across different payment providers.
 * 
 * Requirements: 4.1
 */
class GatewayInterface {
  constructor(config) {
    if (this.constructor === GatewayInterface) {
      throw new Error('GatewayInterface is abstract and cannot be instantiated directly');
    }
    this.config = config;
    this.name = config.name || 'unknown';
    this.priority = config.priority || 999;
    this.enabled = config.enabled !== false;
  }

  /**
   * Create a payment order
   * @param {Object} orderData - Order creation data
   * @param {number} orderData.amount - Amount in smallest currency unit (e.g., paise)
   * @param {string} orderData.currency - Currency code (e.g., 'INR')
   * @param {string} orderData.receipt - Unique receipt identifier
   * @param {Object} orderData.notes - Additional metadata
   * @param {Array} orderData.transfers - Optional transfer/split configuration
   * @returns {Promise<Object>} Order object with id and other gateway-specific data
   */
  async createOrder(orderData) {
    throw new Error('createOrder() must be implemented by gateway adapter');
  }

  /**
   * Verify a payment signature/callback
   * @param {Object} verificationData - Payment verification data
   * @param {string} verificationData.orderId - Order ID from gateway
   * @param {string} verificationData.paymentId - Payment ID from gateway
   * @param {string} verificationData.signature - Signature to verify
   * @returns {Promise<boolean>} True if verification succeeds
   */
  async verifyPayment(verificationData) {
    throw new Error('verifyPayment() must be implemented by gateway adapter');
  }

  /**
   * Fetch payment details from gateway
   * @param {string} paymentId - Payment ID to fetch
   * @returns {Promise<Object>} Payment details including fee, tax, status
   */
  async fetchPaymentDetails(paymentId) {
    throw new Error('fetchPaymentDetails() must be implemented by gateway adapter');
  }

  /**
   * Check gateway health/availability
   * @returns {Promise<Object>} Health status object with available, latency, error
   */
  async healthCheck() {
    throw new Error('healthCheck() must be implemented by gateway adapter');
  }

  /**
   * Get gateway name
   * @returns {string} Gateway name
   */
  getName() {
    return this.name;
  }

  /**
   * Get gateway priority (lower number = higher priority)
   * @returns {number} Priority value
   */
  getPriority() {
    return this.priority;
  }

  /**
   * Check if gateway is enabled
   * @returns {boolean} True if enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Enable the gateway
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Disable the gateway
   */
  disable() {
    this.enabled = false;
  }
}

module.exports = GatewayInterface;
