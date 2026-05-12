/**
 * Unit tests for PaymentRouter
 * Requirements: 4.1, 4.2, 4.3, 8.4
 */

const PaymentRouter = require('../services/router/PaymentRouter');
const GatewayInterface = require('../services/gateways/GatewayInterface');

// Mock gateway class for testing
class MockGateway extends GatewayInterface {
  constructor(config) {
    super(config);
    this.healthCheckResult = { available: true, latency: 100, timestamp: new Date().toISOString() };
    this.shouldFail = false;
  }

  async createOrder(orderData) {
    if (this.shouldFail) {
      throw new Error('Gateway unavailable');
    }
    return {
      id: `order_${Date.now()}`,
      amount: orderData.amount,
      currency: orderData.currency,
      receipt: orderData.receipt,
      status: 'created',
    };
  }

  async verifyPayment(verificationData) {
    if (this.shouldFail) {
      throw new Error('Gateway unavailable');
    }
    return true;
  }

  async fetchPaymentDetails(paymentId) {
    if (this.shouldFail) {
      throw new Error('Gateway unavailable');
    }
    return {
      id: paymentId,
      status: 'captured',
      amount: 10000,
    };
  }

  async healthCheck() {
    return this.healthCheckResult;
  }

  setHealthCheckResult(result) {
    this.healthCheckResult = result;
  }

  setShouldFail(shouldFail) {
    this.shouldFail = shouldFail;
  }
}

describe('PaymentRouter', () => {
  let router;
  let gateway1;
  let gateway2;

  beforeEach(() => {
    // Create a new router instance for each test
    router = new PaymentRouter.constructor();
    
    // Create mock gateways
    gateway1 = new MockGateway({
      name: 'gateway1',
      priority: 1,
      enabled: true,
    });

    gateway2 = new MockGateway({
      name: 'gateway2',
      priority: 2,
      enabled: true,
    });
  });

  afterEach(() => {
    // Clean up health monitoring
    if (router.healthCheckInterval) {
      router.stopHealthMonitoring();
    }
  });

  describe('initialize', () => {
    test('should initialize with gateway array', () => {
      router.initialize([gateway1, gateway2]);
      
      expect(router.gateways).toHaveLength(2);
      expect(router.gatewayHealth.size).toBe(2);
      expect(router.performanceMetrics.size).toBe(2);
    });

    test('should throw error if gateways is not an array', () => {
      expect(() => router.initialize('not-an-array')).toThrow('Gateways must be an array');
    });

    test('should start health monitoring on initialize', () => {
      router.initialize([gateway1]);
      
      expect(router.healthCheckInterval).not.toBeNull();
    });
  });

  describe('selectGateway', () => {
    test('should select highest priority available gateway', () => {
      router.initialize([gateway1, gateway2]);
      
      const selected = router.selectGateway();
      
      expect(selected).toBe(gateway1);
      expect(selected.getPriority()).toBe(1);
    });

    test('should skip disabled gateways', () => {
      gateway1.disable();
      router.initialize([gateway1, gateway2]);
      
      const selected = router.selectGateway();
      
      expect(selected).toBe(gateway2);
    });

    test('should skip unhealthy gateways', () => {
      gateway1.setHealthCheckResult({ available: false, latency: null, error: 'Connection failed' });
      router.initialize([gateway1, gateway2]);
      
      // Wait for initial health check
      return new Promise(resolve => setTimeout(resolve, 100)).then(() => {
        const selected = router.selectGateway();
        expect(selected).toBe(gateway2);
      });
    });

    test('should return null if no gateways available', () => {
      gateway1.disable();
      gateway2.disable();
      router.initialize([gateway1, gateway2]);
      
      const selected = router.selectGateway();
      
      expect(selected).toBeNull();
    });
  });

  describe('routeCreateOrder', () => {
    test('should route order to selected gateway', async () => {
      router.initialize([gateway1]);
      
      const orderData = {
        amount: 10000,
        currency: 'INR',
        receipt: 'test_receipt',
      };
      
      const result = await router.routeCreateOrder(orderData);
      
      expect(result.id).toBeDefined();
      expect(result.gatewayUsed).toBe('gateway1');
      expect(result.routingMetadata).toBeDefined();
      expect(result.routingMetadata.gateway).toBe('gateway1');
    });

    test('should throw error if no gateways available', async () => {
      gateway1.disable();
      router.initialize([gateway1]);
      
      await expect(router.routeCreateOrder({ amount: 10000 }))
        .rejects.toThrow('All payment gateways are currently unavailable');
    });

    test('should update metrics on success', async () => {
      router.initialize([gateway1]);
      
      await router.routeCreateOrder({ amount: 10000, currency: 'INR', receipt: 'test' });
      
      const metrics = router.performanceMetrics.get('gateway1');
      expect(metrics.successCount).toBe(1);
      expect(metrics.failureCount).toBe(0);
    });

    test('should update metrics on failure', async () => {
      router.initialize([gateway1]);
      gateway1.setShouldFail(true);
      
      await expect(router.routeCreateOrder({ amount: 10000 }))
        .rejects.toThrow();
      
      const metrics = router.performanceMetrics.get('gateway1');
      expect(metrics.failureCount).toBeGreaterThan(0);
    });
  });

  describe('getGatewayHealthStatus', () => {
    test('should return health status for all gateways', () => {
      router.initialize([gateway1, gateway2]);
      
      const status = router.getGatewayHealthStatus();
      
      expect(status).toHaveLength(2);
      expect(status[0].name).toBe('gateway1');
      expect(status[0].health).toBeDefined();
      expect(status[0].performance).toBeDefined();
    });

    test('should include performance metrics', async () => {
      router.initialize([gateway1]);
      
      // Make a successful request
      await router.routeCreateOrder({ amount: 10000, currency: 'INR', receipt: 'test' });
      
      const status = router.getGatewayHealthStatus();
      
      expect(status[0].performance.successCount).toBe(1);
      expect(status[0].performance.successRate).toBeDefined();
    });
  });

  describe('health monitoring', () => {
    test('should perform health checks periodically', async () => {
      router.healthCheckIntervalMs = 100; // Speed up for testing
      router.initialize([gateway1]);
      
      const initialHealth = router.gatewayHealth.get('gateway1');
      
      // Wait for a health check cycle
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const updatedHealth = router.gatewayHealth.get('gateway1');
      expect(updatedHealth.lastCheck).not.toEqual(initialHealth.lastCheck);
    });

    test('should mark gateway as unavailable on health check failure', async () => {
      gateway1.setHealthCheckResult({ available: false, latency: null, error: 'Connection timeout' });
      router.initialize([gateway1]);
      
      // Wait for initial health check
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const health = router.gatewayHealth.get('gateway1');
      expect(health.available).toBe(false);
      expect(health.error).toBe('Connection timeout');
    });

    test('should stop health monitoring', () => {
      router.initialize([gateway1]);
      
      expect(router.healthCheckInterval).not.toBeNull();
      
      router.stopHealthMonitoring();
      
      expect(router.healthCheckInterval).toBeNull();
    });
  });

  describe('failover functionality', () => {
    let gateway3;

    beforeEach(() => {
      gateway3 = new MockGateway({
        name: 'gateway3',
        priority: 3,
        enabled: true,
      });
    });

    test('should automatically fallback to next gateway on failure (Requirement 5.1)', async () => {
      router.initialize([gateway1, gateway2]);
      
      // Make first gateway fail
      gateway1.setShouldFail(true);
      
      const orderData = {
        amount: 10000,
        currency: 'INR',
        receipt: 'test_receipt',
      };
      
      const result = await router.routeCreateOrder(orderData);
      
      // Should use gateway2 as fallback
      expect(result.gatewayUsed).toBe('gateway2');
      expect(result.routingMetadata.usedFallback).toBe(true);
      expect(result.routingMetadata.attemptNumber).toBe(2);
      expect(result.routingMetadata.failedAttempts).toBeDefined();
      expect(result.routingMetadata.failedAttempts).toHaveLength(1);
    });

    test('should attempt maximum 3 gateways before failing (Requirement 5.2)', async () => {
      router.initialize([gateway1, gateway2, gateway3]);
      
      // Make all gateways fail
      gateway1.setShouldFail(true);
      gateway2.setShouldFail(true);
      gateway3.setShouldFail(true);
      
      const orderData = {
        amount: 10000,
        currency: 'INR',
        receipt: 'test_receipt',
      };
      
      await expect(router.routeCreateOrder(orderData))
        .rejects.toThrow('Payment processing failed after 3 attempt(s)');
    }, 10000); // Increase timeout to 10 seconds

    test('should timeout gateway attempts within 5 seconds (Requirement 5.3)', async () => {
      // Create a gateway that takes too long
      const slowGateway = new MockGateway({
        name: 'slow_gateway',
        priority: 1,
        enabled: true,
      });
      
      // Override createOrder to simulate slow response
      slowGateway.createOrder = async () => {
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
        return { id: 'order_123' };
      };
      
      router.initialize([slowGateway, gateway2]);
      
      const startTime = Date.now();
      const result = await router.routeCreateOrder({
        amount: 10000,
        currency: 'INR',
        receipt: 'test_receipt',
      });
      const elapsed = Date.now() - startTime;
      
      // Should timeout and fallback to gateway2
      expect(result.gatewayUsed).toBe('gateway2');
      expect(elapsed).toBeLessThan(7000); // Should complete within 7 seconds (5s timeout + processing)
    }, 10000); // Increase timeout to 10 seconds

    test('should return descriptive error when all gateways fail (Requirement 5.5)', async () => {
      router.initialize([gateway1, gateway2]);
      
      gateway1.setShouldFail(true);
      gateway2.setShouldFail(true);
      
      try {
        await router.routeCreateOrder({
          amount: 10000,
          currency: 'INR',
          receipt: 'test_receipt',
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Payment processing failed');
        expect(error.code).toBe('ALL_GATEWAYS_FAILED');
        expect(error.retryGuidance).toBeDefined();
        expect(error.retryGuidance).toContain('wait');
        expect(error.failedAttempts).toBeDefined();
        expect(error.failedAttempts).toHaveLength(2);
      }
    }, 10000); // Increase timeout to 10 seconds

    test('should return descriptive error when no gateways available (Requirement 5.5)', async () => {
      gateway1.disable();
      gateway2.disable();
      router.initialize([gateway1, gateway2]);
      
      try {
        await router.routeCreateOrder({
          amount: 10000,
          currency: 'INR',
          receipt: 'test_receipt',
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('All payment gateways are currently unavailable');
        expect(error.code).toBe('NO_AVAILABLE_GATEWAYS');
        expect(error.retryGuidance).toBeDefined();
      }
    });

    test('should restore routing to primary gateway when health passes (Requirement 5.6)', async () => {
      router.initialize([gateway1, gateway2]);
      
      // Make primary gateway unhealthy
      gateway1.setHealthCheckResult({ available: false, latency: null, error: 'Connection failed' });
      
      // Manually trigger health check to update status
      await router.performHealthChecks();
      
      // First request should use gateway2
      let result = await router.routeCreateOrder({
        amount: 10000,
        currency: 'INR',
        receipt: 'test_receipt_1',
      });
      expect(result.gatewayUsed).toBe('gateway2');
      
      // Restore primary gateway health
      gateway1.setHealthCheckResult({ available: true, latency: 100, timestamp: new Date().toISOString() });
      
      // Manually trigger health check to update status
      await router.performHealthChecks();
      
      // Next request should use gateway1 (primary)
      result = await router.routeCreateOrder({
        amount: 10000,
        currency: 'INR',
        receipt: 'test_receipt_2',
      });
      expect(result.gatewayUsed).toBe('gateway1');
    });

    test('should flag transactions that used fallback gateway (Requirement 6.4)', async () => {
      router.initialize([gateway1, gateway2]);
      
      gateway1.setShouldFail(true);
      
      const result = await router.routeCreateOrder({
        amount: 10000,
        currency: 'INR',
        receipt: 'test_receipt',
      });
      
      expect(result.routingMetadata.usedFallback).toBe(true);
      expect(result.routingMetadata.failedAttempts).toBeDefined();
    });

    test('should not flag transactions that used primary gateway', async () => {
      router.initialize([gateway1, gateway2]);
      
      const result = await router.routeCreateOrder({
        amount: 10000,
        currency: 'INR',
        receipt: 'test_receipt',
      });
      
      expect(result.routingMetadata.usedFallback).toBe(false);
      expect(result.routingMetadata.failedAttempts).toBeUndefined();
    });

    test('should include all failed attempts in routing metadata', async () => {
      router.initialize([gateway1, gateway2, gateway3]);
      
      gateway1.setShouldFail(true);
      gateway2.setShouldFail(true);
      
      const result = await router.routeCreateOrder({
        amount: 10000,
        currency: 'INR',
        receipt: 'test_receipt',
      });
      
      expect(result.gatewayUsed).toBe('gateway3');
      expect(result.routingMetadata.failedAttempts).toHaveLength(2);
      expect(result.routingMetadata.failedAttempts[0].gateway).toBe('gateway1');
      expect(result.routingMetadata.failedAttempts[1].gateway).toBe('gateway2');
    });
  });
});
