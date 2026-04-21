/**
 * Integration tests for PaymentRouter failover behaviour
 * Requirements: 5.1, 5.2, 5.3, 5.6
 *
 * These tests focus on integration-level scenarios that go beyond the unit
 * tests in paymentRouter.test.js:
 *   - Multi-gateway failover chains
 *   - Health state transitions affecting routing
 *   - Failed attempt recording in FailedJob model
 *   - Primary restoration after health recovery
 *   - Concurrent failover scenarios
 */

const PaymentRouter = require('../services/router/PaymentRouter');
const GatewayInterface = require('../services/gateways/GatewayInterface');

// ─── FailedJob mock ──────────────────────────────────────────────────────────
// Capture every save() call so we can assert on recorded failures.
const savedJobs = [];

jest.mock('../models/FailedJob', () => {
  return jest.fn().mockImplementation((data) => {
    const job = {
      ...data,
      _id: `mock_job_${savedJobs.length + 1}`,
      save: jest.fn().mockImplementation(function () {
        savedJobs.push(this);
        return Promise.resolve(this);
      }),
    };
    return job;
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a fresh PaymentRouter instance (the module exports a singleton). */
function makeRouter() {
  return new PaymentRouter.constructor();
}

/** Minimal order payload used across tests. */
const ORDER = { amount: 50000, currency: 'INR', receipt: 'rcpt_test' };

// ─── Mock gateway factory ─────────────────────────────────────────────────────

class MockGateway extends GatewayInterface {
  constructor(config) {
    super(config);
    this._shouldFail = false;
    this._delayMs = 0;
    this._healthResult = { available: true, latency: 50, timestamp: new Date().toISOString() };
  }

  async createOrder(orderData) {
    if (this._delayMs) {
      await new Promise(r => setTimeout(r, this._delayMs));
    }
    if (this._shouldFail) {
      const err = new Error(`${this.name} unavailable`);
      err.code = 'GATEWAY_ERROR';
      throw err;
    }
    return {
      id: `order_${this.name}_${Date.now()}`,
      amount: orderData.amount,
      currency: orderData.currency,
      receipt: orderData.receipt,
      status: 'created',
    };
  }

  async verifyPayment() {
    if (this._shouldFail) throw new Error(`${this.name} unavailable`);
    return true;
  }

  async fetchPaymentDetails(paymentId) {
    if (this._shouldFail) throw new Error(`${this.name} unavailable`);
    return { id: paymentId, status: 'captured', amount: 50000 };
  }

  async healthCheck() {
    return this._healthResult;
  }

  // Test helpers
  failWith(msg) { this._shouldFail = true; this._failMsg = msg; return this; }
  recover()     { this._shouldFail = false; return this; }
  setDelay(ms)  { this._delayMs = ms; return this; }
  setHealth(result) { this._healthResult = result; return this; }
  markUnhealthy()   { return this.setHealth({ available: false, latency: null, error: 'health check failed' }); }
  markHealthy()     { return this.setHealth({ available: true, latency: 50, timestamp: new Date().toISOString() }); }
}

function gw(name, priority) {
  return new MockGateway({ name, priority, enabled: true });
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('Failover Integration', () => {
  let router;

  beforeEach(() => {
    savedJobs.length = 0; // reset captured FailedJob saves
    jest.clearAllMocks(); // reset mock call counts between tests
    router = makeRouter();
  });

  afterEach(() => {
    if (router.healthCheckInterval) router.stopHealthMonitoring();
  });

  // ── 1. Multi-gateway failover chains ────────────────────────────────────────

  describe('Multi-gateway failover chains', () => {
    test('routes through a full 3-gateway chain and succeeds on the third (Req 5.1, 5.2)', async () => {
      const primary   = gw('primary',   1).failWith('primary down');
      const secondary = gw('secondary', 2).failWith('secondary down');
      const tertiary  = gw('tertiary',  3);

      router.initialize([primary, secondary, tertiary]);

      const result = await router.routeCreateOrder(ORDER);

      expect(result.gatewayUsed).toBe('tertiary');
      expect(result.routingMetadata.attemptNumber).toBe(3);
      expect(result.routingMetadata.usedFallback).toBe(true);
      expect(result.routingMetadata.failedAttempts).toHaveLength(2);
      expect(result.routingMetadata.failedAttempts[0].gateway).toBe('primary');
      expect(result.routingMetadata.failedAttempts[1].gateway).toBe('secondary');
    });

    test('stops at 3 attempts even when more gateways are configured (Req 5.2)', async () => {
      const gateways = [
        gw('gw1', 1).failWith('down'),
        gw('gw2', 2).failWith('down'),
        gw('gw3', 3).failWith('down'),
        gw('gw4', 4), // should never be tried
      ];

      router.initialize(gateways);

      await expect(router.routeCreateOrder(ORDER))
        .rejects.toMatchObject({ code: 'ALL_GATEWAYS_FAILED' });

      // gw4 must not have been called
      const gw4 = gateways[3];
      // Verify by checking that the error only lists 3 failed attempts
      try {
        await router.routeCreateOrder(ORDER);
      } catch (err) {
        expect(err.failedAttempts).toHaveLength(3);
        expect(err.failedAttempts.map(a => a.gateway)).not.toContain('gw4');
      }
    }, 15000);

    test('each failed attempt is recorded with gateway name, error, and latency (Req 5.1)', async () => {
      const primary   = gw('primary',   1).failWith('primary error');
      const secondary = gw('secondary', 2);

      router.initialize([primary, secondary]);

      const result = await router.routeCreateOrder(ORDER);

      expect(result.routingMetadata.failedAttempts[0]).toMatchObject({
        gateway: 'primary',
        error: expect.any(String),
        latency: expect.any(Number),
        timestamp: expect.any(Date),
      });
    });
  });

  // ── 2. Health state transitions affecting routing ────────────────────────────

  describe('Health state transitions affecting routing', () => {
    test('unhealthy primary is skipped; routing goes to secondary (Req 5.1)', async () => {
      const primary   = gw('primary',   1).markUnhealthy();
      const secondary = gw('secondary', 2);

      router.initialize([primary, secondary]);
      await router.performHealthChecks();

      const result = await router.routeCreateOrder(ORDER);

      expect(result.gatewayUsed).toBe('secondary');
    });

    test('gateway marked unhealthy mid-session is excluded from subsequent requests (Req 5.1)', async () => {
      const primary   = gw('primary',   1);
      const secondary = gw('secondary', 2);

      router.initialize([primary, secondary]);

      // First request uses primary
      const first = await router.routeCreateOrder(ORDER);
      expect(first.gatewayUsed).toBe('primary');

      // Primary becomes unhealthy
      primary.markUnhealthy();
      await router.performHealthChecks();

      // Second request should fall back to secondary
      const second = await router.routeCreateOrder(ORDER);
      expect(second.gatewayUsed).toBe('secondary');
    });

    test('all gateways unhealthy returns NO_AVAILABLE_GATEWAYS error (Req 5.1)', async () => {
      const primary   = gw('primary',   1).markUnhealthy();
      const secondary = gw('secondary', 2).markUnhealthy();

      router.initialize([primary, secondary]);
      await router.performHealthChecks();

      await expect(router.routeCreateOrder(ORDER))
        .rejects.toMatchObject({ code: 'NO_AVAILABLE_GATEWAYS' });
    });
  });

  // ── 3. Failed attempt recording in FailedJob model ──────────────────────────

  describe('FailedJob recording', () => {
    test('records a FailedJob when all gateways fail (Req 5.1, 5.2)', async () => {
      const FailedJob = require('../models/FailedJob');

      const primary   = gw('primary',   1).failWith('down');
      const secondary = gw('secondary', 2).failWith('down');

      router.initialize([primary, secondary]);

      await expect(router.routeCreateOrder(ORDER)).rejects.toThrow();

      expect(FailedJob).toHaveBeenCalledTimes(1);
      const constructorArg = FailedJob.mock.calls[0][0];
      expect(constructorArg.type).toBe('other');
      expect(constructorArg.payload.operation).toBe('payment_gateway_routing');
      expect(constructorArg.payload.failedAttempts).toHaveLength(2);
      expect(constructorArg.error.code).toBe('ALL_GATEWAYS_FAILED');
    }, 15000);

    test('FailedJob payload contains sanitised order data (no sensitive fields)', async () => {
      const FailedJob = require('../models/FailedJob');

      const primary = gw('primary', 1).failWith('down');
      router.initialize([primary]);

      const sensitiveOrder = {
        amount: 99900,
        currency: 'INR',
        receipt: 'rcpt_123',
        cardNumber: '4111111111111111', // should NOT be stored
        cvv: '123',                     // should NOT be stored
      };

      await expect(router.routeCreateOrder(sensitiveOrder)).rejects.toThrow();

      const payload = FailedJob.mock.calls[0][0].payload.orderData;
      expect(payload).not.toHaveProperty('cardNumber');
      expect(payload).not.toHaveProperty('cvv');
      expect(payload.amount).toBe(99900);
    }, 10000);

    test('does NOT record a FailedJob when payment succeeds', async () => {
      const FailedJob = require('../models/FailedJob');

      const primary = gw('primary', 1);
      router.initialize([primary]);

      await router.routeCreateOrder(ORDER);

      expect(FailedJob).not.toHaveBeenCalled();
    });

    test('FailedJob save failure does not propagate to caller', async () => {
      const FailedJob = require('../models/FailedJob');
      FailedJob.mockImplementationOnce((data) => ({
        ...data,
        _id: 'mock_id',
        save: jest.fn().mockRejectedValue(new Error('DB write failed')),
      }));

      const primary = gw('primary', 1).failWith('down');
      router.initialize([primary]);

      // Should still throw the payment error, not the DB error
      await expect(router.routeCreateOrder(ORDER))
        .rejects.toMatchObject({ code: 'ALL_GATEWAYS_FAILED' });
    }, 10000);
  });

  // ── 4. Primary restoration after health recovery ─────────────────────────────

  describe('Primary restoration after health recovery (Req 5.6)', () => {
    test('restores routing to primary after health check passes', async () => {
      const primary   = gw('primary',   1).markUnhealthy();
      const secondary = gw('secondary', 2);

      router.initialize([primary, secondary]);
      await router.performHealthChecks();

      // While primary is unhealthy, secondary is used
      const before = await router.routeCreateOrder(ORDER);
      expect(before.gatewayUsed).toBe('secondary');

      // Primary recovers
      primary.markHealthy();
      await router.performHealthChecks();

      // Now primary should be selected again
      const after = await router.routeCreateOrder(ORDER);
      expect(after.gatewayUsed).toBe('primary');
      expect(after.routingMetadata.usedFallback).toBe(false);
    });

    test('health status reflects recovery immediately after performHealthChecks (Req 5.6)', async () => {
      const primary = gw('primary', 1).markUnhealthy();
      router.initialize([primary]);
      await router.performHealthChecks();

      let health = router.gatewayHealth.get('primary');
      expect(health.available).toBe(false);

      primary.markHealthy();
      await router.performHealthChecks();

      health = router.gatewayHealth.get('primary');
      expect(health.available).toBe(true);
      expect(health.lastCheck).toBeInstanceOf(Date);
    });

    test('multiple health cycles: primary oscillates between healthy and unhealthy', async () => {
      const primary   = gw('primary',   1);
      const secondary = gw('secondary', 2);

      router.initialize([primary, secondary]);

      // Cycle 1: primary healthy → uses primary
      await router.performHealthChecks();
      let result = await router.routeCreateOrder(ORDER);
      expect(result.gatewayUsed).toBe('primary');

      // Cycle 2: primary unhealthy → uses secondary
      primary.markUnhealthy();
      await router.performHealthChecks();
      result = await router.routeCreateOrder(ORDER);
      expect(result.gatewayUsed).toBe('secondary');

      // Cycle 3: primary healthy again → back to primary
      primary.markHealthy();
      await router.performHealthChecks();
      result = await router.routeCreateOrder(ORDER);
      expect(result.gatewayUsed).toBe('primary');
    });
  });

  // ── 5. Timeout-based failover (Req 5.3) ─────────────────────────────────────

  describe('Timeout-based failover (Req 5.3)', () => {
    test('times out slow gateway and falls back within 5 seconds', async () => {
      const slow      = gw('slow',      1).setDelay(8000); // exceeds 5 s timeout
      const secondary = gw('secondary', 2);

      router.initialize([slow, secondary]);

      const start = Date.now();
      const result = await router.routeCreateOrder(ORDER);
      const elapsed = Date.now() - start;

      expect(result.gatewayUsed).toBe('secondary');
      expect(result.routingMetadata.usedFallback).toBe(true);
      // Should complete well under 2× the timeout
      expect(elapsed).toBeLessThan(7000);
    }, 12000);

    test('timeout error is recorded in failedAttempts with GATEWAY_TIMEOUT code', async () => {
      const slow      = gw('slow',      1).setDelay(8000);
      const secondary = gw('secondary', 2);

      router.initialize([slow, secondary]);

      const result = await router.routeCreateOrder(ORDER);

      const timedOutAttempt = result.routingMetadata.failedAttempts[0];
      expect(timedOutAttempt.gateway).toBe('slow');
      expect(timedOutAttempt.errorCode).toBe('GATEWAY_TIMEOUT');
    }, 12000);
  });

  // ── 6. Concurrent failover scenarios ─────────────────────────────────────────

  describe('Concurrent failover scenarios', () => {
    test('concurrent requests all succeed when primary is healthy', async () => {
      const primary = gw('primary', 1);
      router.initialize([primary]);

      const results = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          router.routeCreateOrder({ ...ORDER, receipt: `rcpt_${i}` })
        )
      );

      expect(results).toHaveLength(5);
      results.forEach(r => expect(r.gatewayUsed).toBe('primary'));
    });

    test('concurrent requests all fall back when primary fails (Req 5.1)', async () => {
      const primary   = gw('primary',   1).failWith('down');
      const secondary = gw('secondary', 2);

      router.initialize([primary, secondary]);

      const results = await Promise.all(
        Array.from({ length: 4 }, (_, i) =>
          router.routeCreateOrder({ ...ORDER, receipt: `rcpt_${i}` })
        )
      );

      results.forEach(r => {
        expect(r.gatewayUsed).toBe('secondary');
        expect(r.routingMetadata.usedFallback).toBe(true);
      });
    });

    test('concurrent requests all fail when all gateways are down (Req 5.2)', async () => {
      const primary   = gw('primary',   1).failWith('down');
      const secondary = gw('secondary', 2).failWith('down');

      router.initialize([primary, secondary]);

      const results = await Promise.allSettled(
        Array.from({ length: 3 }, (_, i) =>
          router.routeCreateOrder({ ...ORDER, receipt: `rcpt_${i}` })
        )
      );

      results.forEach(r => {
        expect(r.status).toBe('rejected');
        expect(r.reason.code).toBe('ALL_GATEWAYS_FAILED');
      });
    }, 20000);
  });

  // ── 7. Error shape validation (Req 5.5) ──────────────────────────────────────

  describe('Error shape when all gateways fail', () => {
    test('error includes retry guidance and failed attempt details', async () => {
      const primary   = gw('primary',   1).failWith('down');
      const secondary = gw('secondary', 2).failWith('down');

      router.initialize([primary, secondary]);

      let caughtError;
      try {
        await router.routeCreateOrder(ORDER);
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).toBeDefined();
      expect(caughtError.code).toBe('ALL_GATEWAYS_FAILED');
      expect(caughtError.retryGuidance).toBeDefined();
      expect(typeof caughtError.retryGuidance).toBe('string');
      expect(caughtError.failedAttempts).toHaveLength(2);
    }, 15000);
  });
});
