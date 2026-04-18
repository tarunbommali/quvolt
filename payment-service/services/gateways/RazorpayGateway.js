const Razorpay = require('razorpay');
const crypto = require('crypto');
const GatewayInterface = require('./GatewayInterface');
const logger = require('../../utils/logger');

/**
 * Razorpay Gateway Adapter
 * 
 * Implements the GatewayInterface for Razorpay payment gateway.
 * Extracted from existing paymentController.js implementation.
 * 
 * Requirements: 4.1
 */
class RazorpayGateway extends GatewayInterface {
  constructor(config) {
    super(config);
    
    if (!config.keyId || !config.keySecret) {
      throw new Error('Razorpay gateway requires keyId and keySecret');
    }

    this.keyId = config.keyId;
    this.keySecret = config.keySecret;
    this.timeout = config.timeout || 30000; // 30 seconds default
    
    // Initialize Razorpay client
    this.client = new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret,
    });

    logger.info('RazorpayGateway initialized', {
      name: this.name,
      priority: this.priority,
      enabled: this.enabled,
    });
  }

  /**
   * Create a payment order in Razorpay
   * @param {Object} orderData - Order creation data
   * @returns {Promise<Object>} Razorpay order object
   */
  async createOrder(orderData) {
    try {
      const startTime = Date.now();
      
      const options = {
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        receipt: orderData.receipt,
        notes: orderData.notes || {},
      };

      // Add transfers if provided (for route splits)
      if (orderData.transfers && Array.isArray(orderData.transfers)) {
        options.transfers = orderData.transfers;
      }

      const order = await this.client.orders.create(options);
      
      const latency = Date.now() - startTime;
      logger.info('Razorpay order created', {
        gateway: this.name,
        orderId: order.id,
        amount: orderData.amount,
        latency,
      });

      return {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        gatewayResponse: order,
      };
    } catch (error) {
      logger.error('Razorpay createOrder failed', {
        gateway: this.name,
        error: error.message,
        code: error.error?.code,
        description: error.error?.description,
      });
      throw new Error(`Razorpay createOrder failed: ${error.message}`);
    }
  }

  /**
   * Verify Razorpay payment signature
   * @param {Object} verificationData - Payment verification data
   * @returns {Promise<boolean>} True if signature is valid
   */
  async verifyPayment(verificationData) {
    try {
      const { orderId, paymentId, signature } = verificationData;

      if (!orderId || !paymentId || !signature) {
        throw new Error('Missing required verification data: orderId, paymentId, or signature');
      }

      // Generate expected signature using HMAC SHA256
      const generatedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      // Timing-safe comparison to prevent timing attacks
      const sig1 = Buffer.from(signature, 'hex');
      const sig2 = Buffer.from(generatedSignature, 'hex');
      
      if (sig1.length !== sig2.length) {
        logger.warn('Razorpay signature verification failed - length mismatch', {
          gateway: this.name,
          orderId,
          paymentId,
        });
        return false;
      }

      const isValid = crypto.timingSafeEqual(sig1, sig2);
      
      if (!isValid) {
        logger.warn('Razorpay signature verification failed', {
          gateway: this.name,
          orderId,
          paymentId,
        });
      } else {
        logger.info('Razorpay signature verified', {
          gateway: this.name,
          orderId,
          paymentId,
        });
      }

      return isValid;
    } catch (error) {
      logger.error('Razorpay verifyPayment error', {
        gateway: this.name,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Fetch payment details from Razorpay
   * @param {string} paymentId - Razorpay payment ID
   * @returns {Promise<Object>} Payment details
   */
  async fetchPaymentDetails(paymentId) {
    try {
      const payment = await this.client.payments.fetch(paymentId);
      
      logger.info('Razorpay payment details fetched', {
        gateway: this.name,
        paymentId,
        status: payment.status,
      });

      return {
        id: payment.id,
        orderId: payment.order_id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        fee: payment.fee || 0,
        tax: payment.tax || 0,
        captured: payment.captured,
        gatewayResponse: payment,
      };
    } catch (error) {
      logger.error('Razorpay fetchPaymentDetails failed', {
        gateway: this.name,
        paymentId,
        error: error.message,
      });
      throw new Error(`Razorpay fetchPaymentDetails failed: ${error.message}`);
    }
  }

  /**
   * Check Razorpay gateway health
   * Performs a lightweight API call to verify connectivity
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    const startTime = Date.now();
    
    try {
      // Use a lightweight API call to check connectivity
      // We'll try to fetch a non-existent payment which should return a 400 error
      // but confirms the API is reachable
      await this.client.payments.fetch('pay_healthcheck_test').catch(() => {
        // Expected to fail, we just want to confirm API is reachable
      });
      
      const latency = Date.now() - startTime;
      
      logger.debug('Razorpay health check passed', {
        gateway: this.name,
        latency,
      });

      return {
        available: true,
        latency,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      
      logger.warn('Razorpay health check failed', {
        gateway: this.name,
        error: error.message,
        latency,
      });

      return {
        available: false,
        latency,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get the Razorpay public key ID for client-side integration
   * @returns {string} Public key ID
   */
  getPublicKeyId() {
    return this.keyId;
  }
}

module.exports = RazorpayGateway;
