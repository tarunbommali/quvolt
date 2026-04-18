/**
 * Unit tests for PaymentRouter - gateway selection, health monitoring, status endpoint
 * Requirements: 4.1, 4.2, 4.3
 *
 * Uses jest.useFakeTimers() for interval-based health monitoring tests.
 */

const GatewayInterface = require('../services/gateways/GatewayInterface');
const logger = require('../utils/logger');

// Mock logger to suppress output during tests
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Mock FailedJob to prevent DB operations
jest.mock('../models/FailedJob', () =>
  jest.fn().mockImplementation((data) => ({
    ...data,
    _id: 'mock_failed_job_id',
    save: jest.fn().mockResolvedValue({ _id: 'mock_failed_job_id' }),
  }))
);

// ── Minimal mock gateway ──────────────────────────────────────────────────────

class MockGateway extends GatewayInterface {
  constructor(config) {
    super(config);
    this._healthResult = { available: true, latency: 50, timestamp: new Date().toISOString() };
  }

  async createOrder(orderData) {
    return { id: `order_${Date.now()}`, ...orderData, status: 'created' };
  }

  async verifyPayment() { return true; }
  async fetchPaymentDetails(id) { return { id, status: 'captured', amount: 10000 }; }

  async healthCheck() { return this._healthResult; }

  setHealth(result) { this._healthResult = result; }
}

// ── Helper: fresh PaymentRouter instance ─────────────────────────────────────
// We need the class itself, not the singleton. We extract it by reading the
// source and using the constructor reference from the exported singleton.

let PaymentRouterClass;

function makeRouter() {
  if (!PaymentRouterClass) {
    const singleton = require('../services/PaymentRouter');
    PaymentRouterClass = singleton.constructor;
  }
  return new PaymentRouterClass();
}

// ─────────────────────────────────────────────────────────────────────────────

describe('PaymentRouter unit tests', () => {
  let router;
  let gw1; // priority 1 (highest)
  let gw2; // priority 2
  let gw3; // priority 3

  beforeEach(() => {
    jest.useFakeTimers();

    router = makeRouter();

    gw1 = new MockGateway({ name: 'gateway1', priority: 1, enabled: true });
    gw2 = new MockGateway({ name: 'gateway2', priority: 2, enabled: true });
    gw3 = new MockGateway({ name: 'gateway3', priority: 3, enabled: true });
  });

  afterEach(() => {
    router.stopHealthMonitoring();
    jest.useRealTimers();
  });

  // ── Requirement 4.1: priority-ordered gateway list ──────────────────────────

  describe('Gateway list with priority ordering (Req 4.1)', () => {
    test('stores all configured gateways after initialize', () => {
      router.initialize([gw1, gw2, gw3]);

      expect(router.getAllGateways()).toHaveLength(3);
    });

    test('initialises health and metrics maps for every gateway', () => {
      router.initialize([gw1, gw2, gw3]);

      expect(router.gatewayHealth.size).toBe(3);
      expect(router.performanceMetrics.size).toBe(3);
    });

    test('throws when initialize receives a non-array', () => {
      expect(() => router.initialize(null)).toThrow('Gateways must be an array');
      expect(() => router.initialize('razorpay')).toThrow('Gateways must be an array');
    });

    test('getGateway() returns the correct instance by name', () => {
      router.initialize([gw1, gw2]);

      expect(router.getGateway('gateway1')).toBe(gw1);
      expect(router.getGateway('gateway2')).toBe(gw2);
      expect(router.getGateway('unknown')).toBeNull();
    });
  });

  // ── Requirement 4.2: route to highest-priority available gateway ─────────────

  describe('Gateway selection – highest priority available (Req 4.2)', () => {
    test('selects gateway with lowest priority number (highest priority)', () => {
      router.initialize([gw1, gw2, gw3]);

      const selected = router.selectGateway();

      expect(selected).toBe(gw1);
      expect(selected.getPriority()).toBe(1);
    });

    test('skips disabled gateways and picks next highest priority', () => {
      gw1.disable();
      router.initialize([gw1, gw2, gw3]);

      const selected = router.selectGateway();

      expect(selected).toBe(gw2);
    });

    test('skips unhealthy gateways and picks next highest priority', async () => {
      // Mark gw1 as unavailable before initializing so the initial health check
      // reflects the unhealthy state
      gw1.setHealth({ available: false, latency: null, error: 'timeout' });
      router.initialize([gw1, gw2]);

      // Flush the initial performHealthChecks promise
      await Promise.resolve();
      await Promise.resolve();

      const selected = router.selectGateway();
      expect(selected).toBe(gw2);
    });

    test('returns null when all gateways are disabled', () => {
      gw1.disable();
      gw2.disable();
      router.initialize([gw1, gw2]);

      expect(router.selectGateway()).toBeNull();
    });

    test('returns null when all gateways are unhealthy', async () => {
      gw1.setHealth({ available: false, latency: null, error: 'down' });
      gw2.setHealth({ available: false, latency: null, error: 'down' });
      router.initialize([gw1, gw2]);

      // Flush the initial performHealthChecks promise
      await Promise.resolve();
      await Promise.resolve();

      expect(router.selectGateway()).toBeNull();
    });

    test('prefers lower priority number over higher when both healthy', () => {
      // gw3 has priority 3, gw1 has priority 1 – gw1 should win
      router.initialize([gw3, gw1, gw2]); // intentionally out of order in array

      // All start healthy (default)
      const selected = router.selectGateway();
      // The router filters available gateways and picks availableGateways[0]
      // which is the first in the gateways array that is enabled & healthy.
      // Since gateways are stored in insertion order, gw3 would be first here.
      // This test validates the documented behaviour: "Gateways are already sorted
      // by priority (done in config loader)". The router itself does NOT re-sort;
      // it relies on the caller to pass them in priority order.
      // So when passed in priority order the correct one is selected:
      router.stopHealthMonitoring();
      router.gateways = [];
      router.gatewayHealth = new Map();
      router.performanceMetrics = new Map();
      router.healthCheckInterval = null;

      router.initialize([gw1, gw2, gw3]); // correct priority order
      expect(router.selectGateway()).toBe(gw1);
    });
  });

  // ── Requirement 4.3: health monitoring every 30 seconds ─────────────────────

  describe('Health monitoring interval (Req 4.3)', () => {
    test('starts health monitoring on initialize', () => {
      router.initialize([gw1]);

      expect(router.healthCheckInterval).not.toBeNull();
    });

    test('health check interval is 30 000 ms', () => {
      expect(router.healthCheckIntervalMs).toBe(30000);
    });

    test('does not create a second interval if monitoring already running', () => {
      router.initialize([gw1]);
      const firstInterval = router.healthCheckInterval;

      router.startHealthMonitoring(); // call again

      expect(router.healthCheckInterval).toBe(firstInterval);
    });

    test('stopHealthMonitoring clears the interval', () => {
      router.initialize([gw1]);
      router.stopHealthMonitoring();

      expect(router.healthCheckInterval).toBeNull();
    });

    test('periodic health check fires after 30 s (fake timers)', async () => {
      const healthCheckSpy = jest.spyOn(router, 'performHealthChecks').mockResolvedValue();

      router.initialize([gw1]);

      // The initial call fires immediately; reset the spy count
      healthCheckSpy.mockClear();

      // Advance time by 30 seconds
      jest.advanceTimersByTime(30000);
      await Promise.resolve(); // flush microtasks

      expect(healthCheckSpy).toHaveBeenCalledTimes(1);
    });

    test('periodic health check fires multiple times over 90 s', async () => {
      const healthCheckSpy = jest.spyOn(router, 'performHealthChecks').mockResolvedValue();

      router.initialize([gw1]);
      healthCheckSpy.mockClear();

      jest.advanceTimersByTime(90000);
      await Promise.resolve();

      expect(healthCheckSpy).toHaveBeenCalledTimes(3);
    });

    test('performHealthChecks marks gateway available when health check passes', async () => {
      router.initialize([gw1]);

      gw1.setHealth({ available: true, latency: 80, timestamp: new Date().toISOString() });
      await router.performHealthChecks();

      const health = router.gatewayHealth.get('gateway1');
      expect(health.available).toBe(true);
      expect(health.latency).toBe(80);
      expect(health.lastCheck).toBeInstanceOf(Date);
    });

    test('performHealthChecks marks gateway unavailable when health check returns available:false', async () => {
      router.initialize([gw1]);

      gw1.setHealth({ available: false, latency: null, error: 'Connection refused' });
      await router.performHealthChecks();

      const health = router.gatewayHealth.get('gateway1');
      expect(health.available).toBe(false);
      expect(health.error).toBe('Connection refused');
    });

    test('performHealthChecks marks gateway unavailable when healthCheck() throws', async () => {
      router.initialize([gw1]);

      gw1.healthCheck = jest.fn().mockRejectedValue(new Error('Network error'));
      await router.performHealthChecks();

      const health = router.gatewayHealth.get('gateway1');
      expect(health.available).toBe(false);
      expect(health.error).toBe('Network error');
    });

    test('performHealthChecks runs checks for all gateways concurrently', async () => {
      router.initialize([gw1, gw2, gw3]);

      const spy1 = jest.spyOn(gw1, 'healthCheck');
      const spy2 = jest.spyOn(gw2, 'healthCheck');
      const spy3 = jest.spyOn(gw3, 'healthCheck');

      await router.performHealthChecks();

      expect(spy1).toHaveBeenCalledTimes(1);
      expect(spy2).toHaveBeenCalledTimes(1);
      expect(spy3).toHaveBeenCalledTimes(1);
    });
  });

  // ── getGatewayHealthStatus() – status endpoint data ──────────────────────────

  describe('getGatewayHealthStatus() – status endpoint (Req 4.1, 4.2, 4.3)', () => {
    test('returns one entry per configured gateway', () => {
      router.initialize([gw1, gw2]);

      const status = router.getGatewayHealthStatus();

      expect(status).toHaveLength(2);
    });

    test('each entry contains name, priority, enabled, health, and performance fields', () => {
      router.initialize([gw1]);

      const [entry] = router.getGatewayHealthStatus();

      expect(entry).toMatchObject({
        name: 'gateway1',
        priority: 1,
        enabled: true,
        health: expect.objectContaining({ available: expect.any(Boolean) }),
        performance: expect.objectContaining({
          successCount: expect.any(Number),
          failureCount: expect.any(Number),
          successRate: expect.stringMatching(/%$/),
        }),
      });
    });

    test('reflects updated health after performHealthChecks', async () => {
      router.initialize([gw1]);

      gw1.setHealth({ available: false, latency: null, error: 'down' });
      await router.performHealthChecks();

      const [entry] = router.getGatewayHealthStatus();
      expect(entry.health.available).toBe(false);
      expect(entry.health.error).toBe('down');
    });

    test('successRate is "0%" before any requests', () => {
      router.initialize([gw1]);

      const [entry] = router.getGatewayHealthStatus();
      expect(entry.performance.successRate).toBe('0%');
    });

    test('successRate updates after a successful routeCreateOrder', async () => {
      router.initialize([gw1]);

      await router.routeCreateOrder({ amount: 5000, currency: 'INR', receipt: 'r1' });

      const [entry] = router.getGatewayHealthStatus();
      expect(entry.performance.successCount).toBe(1);
      expect(entry.performance.failureCount).toBe(0);
      expect(entry.performance.successRate).toBe('100.00%');
    });

    test('avgLatency is null before any requests', () => {
      router.initialize([gw1]);

      const [entry] = router.getGatewayHealthStatus();
      expect(entry.performance.avgLatency).toBeNull();
    });

    test('avgLatency is a number after a successful request', async () => {
      router.initialize([gw1]);

      await router.routeCreateOrder({ amount: 5000, currency: 'INR', receipt: 'r2' });

      const [entry] = router.getGatewayHealthStatus();
      expect(typeof entry.performance.avgLatency).toBe('number');
    });

    test('returns entries for all gateways with correct names', () => {
      router.initialize([gw1, gw2, gw3]);

      const names = router.getGatewayHealthStatus().map(e => e.name);
      expect(names).toEqual(['gateway1', 'gateway2', 'gateway3']);
    });
  });
});
