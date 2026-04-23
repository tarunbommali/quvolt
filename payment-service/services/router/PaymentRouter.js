const logger = require('../../utils/logger');
const FailedJob = require('../../models/FailedJob');

/**
 * Payment Router Service
 * 
 * Manages payment gateway selection based on priority and health status.
 * Routes payment requests to the highest priority available gateway.
 * Monitors gateway health in the background.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.7, 6.6
 */
class PaymentRouter {
  constructor() {
    this.gateways = [];
    this.gatewayHealth = new Map(); // Map<gatewayName, healthStatus>
    this.healthCheckInterval = null;
    this.healthCheckIntervalMs = 30000; // 30 seconds
    this.performanceMetrics = new Map(); // Map<gatewayName, metrics>
    
    logger.info('PaymentRouter initialized');
  }

  /**
   * Initialize the router with gateway instances
   * @param {Array<GatewayInterface>} gateways - Array of gateway instances
   */
  initialize(gateways) {
    if (!Array.isArray(gateways)) {
      throw new Error('Gateways must be an array');
    }

    this.gateways = gateways;
    
    // Initialize health status for all gateways
    for (const gateway of this.gateways) {
      this.gatewayHealth.set(gateway.getName(), {
        available: true,
        lastCheck: null,
        latency: null,
        error: null,
      });
      
      this.performanceMetrics.set(gateway.getName(), {
        successCount: 0,
        failureCount: 0,
        totalLatency: 0,
        lastUpdated: new Date(),
      });
    }

    logger.info('PaymentRouter initialized with gateways', {
      gateways: this.gateways.map(g => ({
        name: g.getName(),
        priority: g.getPriority(),
        enabled: g.isEnabled(),
      })),
    });

    // Start background health monitoring
    this.startHealthMonitoring();
  }

  /**
   * Start background health check job
   * Requirement 4.3: Monitor gateway health status every 30 seconds
   */
  startHealthMonitoring() {
    if (this.healthCheckInterval) {
      logger.warn('Health monitoring already started');
      return;
    }

    logger.info('Starting gateway health monitoring', {
      intervalMs: this.healthCheckIntervalMs,
    });

    // Run initial health check immediately
    this.performHealthChecks().catch(error => {
      logger.error('Initial health check failed', { error: error.message });
    });

    // Schedule periodic health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks().catch(error => {
        logger.error('Scheduled health check failed', { error: error.message });
      });
    }, this.healthCheckIntervalMs);
  }

  /**
   * Stop background health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info('Gateway health monitoring stopped');
    }
  }

  /**
   * Perform health checks on all gateways
   * Requirement 4.4: Mark gateways as available/unavailable based on health checks
   */
  async performHealthChecks() {
    logger.debug('Performing health checks on all gateways');

    const healthCheckPromises = this.gateways.map(async (gateway) => {
      try {
        const healthResult = await gateway.healthCheck();
        
        this.gatewayHealth.set(gateway.getName(), {
          available: healthResult.available,
          lastCheck: new Date(),
          latency: healthResult.latency,
          error: healthResult.error || null,
          timestamp: healthResult.timestamp,
        });

        logger.debug('Gateway health check completed', {
          gateway: gateway.getName(),
          available: healthResult.available,
          latency: healthResult.latency,
        });
      } catch (error) {
        // Mark gateway as unavailable if health check throws
        this.gatewayHealth.set(gateway.getName(), {
          available: false,
          lastCheck: new Date(),
          latency: null,
          error: error.message,
        });

        logger.warn('Gateway health check failed', {
          gateway: gateway.getName(),
          error: error.message,
        });
      }
    });

    await Promise.all(healthCheckPromises);
  }

  /**
   * Select the best available gateway based on priority and health
   * Requirement 4.1: Maintain list of configured gateways with priority ordering
   * Requirement 4.2: Route to highest priority available gateway
   * 
   * @returns {GatewayInterface|null} Selected gateway or null if none available
   */
  selectGateway() {
    // Filter to enabled and healthy gateways
    const availableGateways = this.gateways.filter(gateway => {
      const isEnabled = gateway.isEnabled();
      const health = this.gatewayHealth.get(gateway.getName());
      const isHealthy = health && health.available;

      return isEnabled && isHealthy;
    });

    if (availableGateways.length === 0) {
      logger.error('No available gateways for routing', {
        totalGateways: this.gateways.length,
        healthStatus: Array.from(this.gatewayHealth.entries()).map(([name, health]) => ({
          name,
          available: health.available,
        })),
      });
      return null;
    }

    // Gateways are already sorted by priority (done in config loader)
    // Select the first available gateway (highest priority)
    const selectedGateway = availableGateways[0];

    // Requirement 4.6: Log routing decisions with reasoning
    logger.info('Gateway selected for routing', {
      selected: selectedGateway.getName(),
      priority: selectedGateway.getPriority(),
      reason: 'highest_priority_available',
      availableGateways: availableGateways.map(g => ({
        name: g.getName(),
        priority: g.getPriority(),
      })),
    });

    return selectedGateway;
  }

  /**
   * Route a payment order creation request with failover support
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   * 
   * @param {Object} orderData - Order creation data
   * @returns {Promise<Object>} Order result with gateway information
   */
  async routeCreateOrder(orderData) {
    const maxAttempts = 3; // Requirement 5.2: Maximum 3 gateway attempts
    const timeoutMs = 5000; // Requirement 5.3: 5 second timeout per gateway
    const failedAttempts = [];

    // Get all available gateways sorted by priority
    const availableGateways = this.gateways.filter(gateway => {
      const isEnabled = gateway.isEnabled();
      const health = this.gatewayHealth.get(gateway.getName());
      const isHealthy = health && health.available;
      return isEnabled && isHealthy;
    });

    if (availableGateways.length === 0) {
      logger.error('No available gateways for routing', {
        totalGateways: this.gateways.length,
        healthStatus: Array.from(this.gatewayHealth.entries()).map(([name, health]) => ({
          name,
          available: health.available,
        })),
      });
      
      // Requirement 5.5: Return descriptive error with retry guidance
      const error = new Error('All payment gateways are currently unavailable. Please try again in a few minutes.');
      error.code = 'NO_AVAILABLE_GATEWAYS';
      error.retryGuidance = 'Wait 1-2 minutes and retry your payment. If the issue persists, contact support.';
      throw error;
    }

    // Try up to maxAttempts gateways
    const gatewaysToTry = availableGateways.slice(0, maxAttempts);

    for (let i = 0; i < gatewaysToTry.length; i++) {
      const gateway = gatewaysToTry[i];
      const attemptNumber = i + 1;
      const startTime = Date.now();

      logger.info('Attempting payment with gateway', {
        gateway: gateway.getName(),
        attempt: attemptNumber,
        maxAttempts,
        priority: gateway.getPriority(),
      });

      try {
        // Requirement 5.3: Implement timeout per gateway attempt
        const result = await this.executeWithTimeout(
          gateway.createOrder(orderData),
          timeoutMs,
          `Gateway ${gateway.getName()} timeout`
        );

        const latency = Date.now() - startTime;

        // Update performance metrics
        this.updateMetrics(gateway.getName(), true, latency);

        logger.info('Payment order routed successfully', {
          gateway: gateway.getName(),
          orderId: result.id,
          latency,
          attempt: attemptNumber,
          hadFailedAttempts: failedAttempts.length > 0,
        });

        return {
          ...result,
          gatewayUsed: gateway.getName(),
          routingMetadata: {
            gateway: gateway.getName(),
            priority: gateway.getPriority(),
            latency,
            attemptNumber,
            totalAttempts: attemptNumber,
            failedAttempts: failedAttempts.length > 0 ? failedAttempts : undefined,
            usedFallback: attemptNumber > 1, // Requirement 6.4: Flag fallback usage
          },
        };
      } catch (error) {
        const latency = Date.now() - startTime;
        this.updateMetrics(gateway.getName(), false, latency);

        const failureInfo = {
          gateway: gateway.getName(),
          priority: gateway.getPriority(),
          error: error.message,
          errorCode: error.code,
          latency,
          timestamp: new Date(),
        };

        failedAttempts.push(failureInfo);

        logger.warn('Payment gateway attempt failed', {
          ...failureInfo,
          attempt: attemptNumber,
          maxAttempts,
          remainingAttempts: gatewaysToTry.length - attemptNumber,
        });

        // Requirement 5.4: Record failed attempts (will be done in subtask 9.2)
        // This will be handled by calling recordFailedAttempt() after all attempts fail

        // If this was the last attempt, throw error with all failure details
        if (attemptNumber === gatewaysToTry.length) {
          logger.error('All gateway attempts exhausted', {
            totalAttempts: attemptNumber,
            failedAttempts,
          });

          // Requirement 5.4: Record failed attempts in failed jobs queue
          await this.recordFailedAttempts(failedAttempts, orderData);

          // Requirement 5.5: Return descriptive error with retry guidance
          const finalError = new Error(
            `Payment processing failed after ${attemptNumber} attempt(s). All available gateways are currently experiencing issues.`
          );
          finalError.code = 'ALL_GATEWAYS_FAILED';
          finalError.failedAttempts = failedAttempts;
          finalError.retryGuidance = 'Please wait a few minutes and try again. If the problem persists, contact support with your order details.';
          throw finalError;
        }

        // Requirement 5.1, 5.3: Automatic fallback to next gateway
        // Continue to next iteration to try the next gateway
        logger.info('Falling back to next gateway', {
          nextGateway: gatewaysToTry[i + 1]?.getName(),
          nextPriority: gatewaysToTry[i + 1]?.getPriority(),
        });
      }
    }

    // This should never be reached, but just in case
    const error = new Error('Payment routing failed unexpectedly');
    error.code = 'ROUTING_ERROR';
    throw error;
  }

  /**
   * Execute a promise with timeout
   * @param {Promise} promise - Promise to execute
   * @param {number} timeoutMs - Timeout in milliseconds
   * @param {string} timeoutMessage - Error message for timeout
   * @returns {Promise} Result or timeout error
   */
  async executeWithTimeout(promise, timeoutMs, timeoutMessage) {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => {
          const error = new Error(timeoutMessage);
          error.code = 'GATEWAY_TIMEOUT';
          reject(error);
        }, timeoutMs);
      }),
    ]);
  }

  /**
   * Record failed gateway attempts in the failed jobs queue
   * Requirement 5.4: Record failed gateway attempts for analysis
   * 
   * @param {Array<Object>} failedAttempts - Array of failed attempt details
   * @param {Object} orderData - Original order data
   * @returns {Promise<void>}
   */
  async recordFailedAttempts(failedAttempts, orderData) {
    if (!failedAttempts || failedAttempts.length === 0) {
      return;
    }

    try {
      // Create a failed job record for analysis
      const failedJob = new FailedJob({
        type: 'other', // Using 'other' as payment gateway failure is not in the enum
        payload: {
          operation: 'payment_gateway_routing',
          orderData: {
            amount: orderData.amount,
            currency: orderData.currency,
            receipt: orderData.receipt,
            // Don't store sensitive data
          },
          failedAttempts: failedAttempts.map(attempt => ({
            gateway: attempt.gateway,
            priority: attempt.priority,
            error: attempt.error,
            errorCode: attempt.errorCode,
            latency: attempt.latency,
            timestamp: attempt.timestamp,
          })),
          totalAttempts: failedAttempts.length,
        },
        error: {
          message: `All ${failedAttempts.length} gateway attempt(s) failed`,
          code: 'ALL_GATEWAYS_FAILED',
        },
        attempts: 1,
        maxAttempts: 3, // Allow retry of the entire payment flow
        status: 'pending',
      });

      await failedJob.save();

      logger.info('Failed gateway attempts recorded in failed jobs queue', {
        failedJobId: failedJob._id,
        totalAttempts: failedAttempts.length,
        gateways: failedAttempts.map(a => a.gateway),
      });
    } catch (error) {
      // Don't throw - recording failure shouldn't block the error response
      logger.error('Failed to record failed gateway attempts', {
        error: error.message,
        failedAttempts: failedAttempts.length,
      });
    }
  }

  /**
   * Route a payment verification request
   * @param {Object} verificationData - Payment verification data
   * @returns {Promise<boolean>} Verification result
   */
  async routeVerifyPayment(verificationData) {
    const gateway = this.selectGateway();

    if (!gateway) {
      throw new Error('No available payment gateways');
    }

    const startTime = Date.now();
    
    try {
      const result = await gateway.verifyPayment(verificationData);
      const latency = Date.now() - startTime;

      this.updateMetrics(gateway.getName(), result, latency);

      logger.info('Payment verification routed', {
        gateway: gateway.getName(),
        verified: result,
        latency,
      });

      return result;
    } catch (error) {
      const latency = Date.now() - startTime;
      this.updateMetrics(gateway.getName(), false, latency);

      logger.error('Payment verification routing failed', {
        gateway: gateway.getName(),
        error: error.message,
        latency,
      });

      throw error;
    }
  }

  /**
   * Route a payment details fetch request
   * @param {string} paymentId - Payment ID to fetch
   * @returns {Promise<Object>} Payment details
   */
  async routeFetchPaymentDetails(paymentId) {
    const gateway = this.selectGateway();

    if (!gateway) {
      throw new Error('No available payment gateways');
    }

    const startTime = Date.now();
    
    try {
      const result = await gateway.fetchPaymentDetails(paymentId);
      const latency = Date.now() - startTime;

      this.updateMetrics(gateway.getName(), true, latency);

      logger.info('Payment details fetch routed', {
        gateway: gateway.getName(),
        paymentId,
        latency,
      });

      return result;
    } catch (error) {
      const latency = Date.now() - startTime;
      this.updateMetrics(gateway.getName(), false, latency);

      logger.error('Payment details fetch routing failed', {
        gateway: gateway.getName(),
        error: error.message,
        latency,
      });

      throw error;
    }
  }

  /**
   * Update performance metrics for a gateway
   * @param {string} gatewayName - Gateway name
   * @param {boolean} success - Whether the operation succeeded
   * @param {number} latency - Operation latency in ms
   */
  updateMetrics(gatewayName, success, latency) {
    const metrics = this.performanceMetrics.get(gatewayName);
    
    if (!metrics) {
      return;
    }

    if (success) {
      metrics.successCount++;
    } else {
      metrics.failureCount++;
    }

    metrics.totalLatency += latency;
    metrics.lastUpdated = new Date();

    this.performanceMetrics.set(gatewayName, metrics);
  }

  /**
   * Get gateway health status for monitoring
   * Requirement 4.7: Expose gateway health status via monitoring endpoint
   * Requirement 6.6: Expose gateway performance metrics
   * 
   * @returns {Array<Object>} Gateway health and performance data
   */
  getGatewayHealthStatus() {
    return this.gateways.map(gateway => {
      const health = this.gatewayHealth.get(gateway.getName());
      const metrics = this.performanceMetrics.get(gateway.getName());
      
      const totalRequests = metrics.successCount + metrics.failureCount;
      const successRate = totalRequests > 0 
        ? ((metrics.successCount / totalRequests) * 100).toFixed(2)
        : 0;
      
      const avgLatency = metrics.successCount > 0
        ? Math.round(metrics.totalLatency / metrics.successCount)
        : null;

      return {
        name: gateway.getName(),
        priority: gateway.getPriority(),
        enabled: gateway.isEnabled(),
        health: {
          available: health?.available || false,
          lastCheck: health?.lastCheck,
          latency: health?.latency,
          error: health?.error,
        },
        performance: {
          successCount: metrics.successCount,
          failureCount: metrics.failureCount,
          successRate: `${successRate}%`,
          avgLatency,
          lastUpdated: metrics.lastUpdated,
        },
      };
    });
  }

  /**
   * Calculate gateway success rates over rolling 24-hour windows
   * Requirement 6.5: Calculate gateway success rates over rolling 24-hour windows
   * 
   * @returns {Promise<Array<Object>>} Gateway success rates from database
   */
  async calculateGatewaySuccessRates() {
    const Payment = require('../../models/Payment');
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
      // Aggregate payments from last 24 hours grouped by gateway
      const results = await Payment.aggregate([
        {
          $match: {
            createdAt: { $gte: twentyFourHoursAgo },
            gatewayUsed: { $ne: null }
          }
        },
        {
          $group: {
            _id: '$gatewayUsed',
            totalTransactions: { $sum: 1 },
            successfulTransactions: {
              $sum: {
                $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
              }
            },
            failedTransactions: {
              $sum: {
                $cond: [{ $in: ['$status', ['failed', 'created']] }, 1, 0]
              }
            },
            fallbackTransactions: {
              $sum: {
                $cond: [{ $ne: ['$fallbackReason', null] }, 1, 0]
              }
            },
            totalLatency: {
              $sum: {
                $ifNull: ['$routingMetadata.latency', 0]
              }
            }
          }
        }
      ]);

      // Format results
      return results.map(result => {
        const successRate = result.totalTransactions > 0
          ? ((result.successfulTransactions / result.totalTransactions) * 100).toFixed(2)
          : 0;
        
        const avgResponseTime = result.successfulTransactions > 0
          ? Math.round(result.totalLatency / result.successfulTransactions)
          : null;

        return {
          gateway: result._id,
          period: '24h',
          totalTransactions: result.totalTransactions,
          successfulTransactions: result.successfulTransactions,
          failedTransactions: result.failedTransactions,
          fallbackTransactions: result.fallbackTransactions,
          successRate: `${successRate}%`,
          avgResponseTime,
          periodStart: twentyFourHoursAgo,
          periodEnd: new Date()
        };
      });
    } catch (error) {
      logger.error('Error calculating gateway success rates', { error: error.message });
      return [];
    }
  }

  /**
   * Get flagged fallback transactions for review
   * Requirement 6.4: Flag transactions that used fallback gateways
   * 
   * @param {Object} options - Query options
   * @returns {Promise<Array<Object>>} Flagged transactions
   */
  async getFlaggedFallbackTransactions(options = {}) {
    const Payment = require('../../models/Payment');
    const { limit = 50, page = 1 } = options;
    const skip = (page - 1) * limit;

    try {
      const [transactions, total] = await Promise.all([
        Payment.find({
          fallbackReason: { $ne: null },
          status: 'completed'
        })
          .select('userId quizId amount gatewayUsed attemptCount fallbackReason routingMetadata createdAt')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Payment.countDocuments({
          fallbackReason: { $ne: null },
          status: 'completed'
        })
      ]);

      return {
        transactions: transactions.map(tx => ({
          id: tx._id,
          userId: tx.userId,
          quizId: tx.quizId,
          amount: tx.amount,
          gatewayUsed: tx.gatewayUsed,
          attemptCount: tx.attemptCount,
          fallbackReason: tx.fallbackReason,
          failedAttempts: tx.routingMetadata?.failedAttempts || [],
          createdAt: tx.createdAt,
          flaggedForReview: true
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error fetching flagged fallback transactions', { error: error.message });
      return {
        transactions: [],
        pagination: { page, limit, total: 0, totalPages: 0 }
      };
    }
  }

  /**
   * Get a specific gateway by name (for direct access if needed)
   * @param {string} name - Gateway name
   * @returns {GatewayInterface|null} Gateway instance or null
   */
  getGateway(name) {
    return this.gateways.find(g => g.getName() === name) || null;
  }

  /**
   * Get all gateways
   * @returns {Array<GatewayInterface>} All gateway instances
   */
  getAllGateways() {
    return this.gateways;
  }

  /**
   * Update gateway configuration dynamically
   * Requirement: 14.2, 14.5
   * 
   * @param {string} gatewayName - Gateway name
   * @param {Object} config - Configuration updates
   * @returns {Object} Result with success status
   */
  async updateGatewayConfig(gatewayName, config) {
    try {
      const gateway = this.getGateway(gatewayName);
      
      if (!gateway) {
        return {
          success: false,
          message: `Gateway ${gatewayName} not found`,
        };
      }

      // Update gateway configuration
      if (config.enabled !== undefined) {
        gateway.enabled = config.enabled;
      }

      if (config.priority !== undefined) {
        gateway.priority = config.priority;
        // Re-sort gateways by priority
        this.gateways.sort((a, b) => (a.priority || 0) - (b.priority || 0));
      }

      if (config.timeout !== undefined) {
        gateway.timeout = config.timeout;
      }

      if (config.retryCount !== undefined) {
        gateway.retryCount = config.retryCount;
      }

      logger.info('Gateway configuration updated', {
        gatewayName,
        config,
      });

      return {
        success: true,
        message: 'Gateway configuration updated successfully',
      };
    } catch (error) {
      logger.error('Error updating gateway configuration', {
        error: error.message,
        gatewayName,
      });

      return {
        success: false,
        message: 'Failed to update gateway configuration',
      };
    }
  }

  /**
   * Get gateway configuration (credentials redacted)
   * Requirement: 14.5
   * 
   * @returns {Array<Object>} Gateway configurations
   */
  getGatewayConfig() {
    return this.gateways.map(gateway => ({
      name: gateway.getName(),
      enabled: gateway.enabled !== false,
      priority: gateway.priority || 0,
      timeout: gateway.timeout || 5000,
      retryCount: gateway.retryCount || 3,
      // Credentials are NOT included for security
    }));
  }

  /**
   * Enable a gateway
   * Requirement: 14.2
   * 
   * @param {string} gatewayName - Gateway name
   * @returns {Object} Result with success status
   */
  async enableGateway(gatewayName) {
    try {
      const gateway = this.getGateway(gatewayName);
      
      if (!gateway) {
        return {
          success: false,
          message: `Gateway ${gatewayName} not found`,
        };
      }

      gateway.enabled = true;

      logger.info('Gateway enabled', { gatewayName });

      return {
        success: true,
        message: `Gateway ${gatewayName} enabled successfully`,
      };
    } catch (error) {
      logger.error('Error enabling gateway', {
        error: error.message,
        gatewayName,
      });

      return {
        success: false,
        message: 'Failed to enable gateway',
      };
    }
  }

  /**
   * Disable a gateway
   * Requirement: 14.2
   * 
   * @param {string} gatewayName - Gateway name
   * @returns {Object} Result with success status
   */
  async disableGateway(gatewayName) {
    try {
      const gateway = this.getGateway(gatewayName);
      
      if (!gateway) {
        return {
          success: false,
          message: `Gateway ${gatewayName} not found`,
        };
      }

      gateway.enabled = false;

      logger.info('Gateway disabled', { gatewayName });

      return {
        success: true,
        message: `Gateway ${gatewayName} disabled successfully`,
      };
    } catch (error) {
      logger.error('Error disabling gateway', {
        error: error.message,
        gatewayName,
      });

      return {
        success: false,
        message: 'Failed to disable gateway',
      };
    }
  }
}

module.exports = new PaymentRouter();
