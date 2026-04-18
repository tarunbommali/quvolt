/**
 * Unit tests for Gateway Abstraction Layer
 * Requirements: 4.1, 14.1
 */

const GatewayInterface = require('../services/gateways/GatewayInterface');
const RazorpayGateway = require('../services/gateways/RazorpayGateway');
const {
  parseGatewayConfig,
  validateGatewayConfig,
  loadGatewayConfigs,
} = require('../config/gateways');

// Mock Razorpay SDK to avoid real API calls
jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: { create: jest.fn() },
    payments: { fetch: jest.fn() },
  }));
});

// Mock logger to suppress output during tests
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// ─── GatewayInterface contract ────────────────────────────────────────────────

describe('GatewayInterface', () => {
  describe('abstract class enforcement', () => {
    it('cannot be instantiated directly', () => {
      expect(() => new GatewayInterface({ name: 'test', priority: 1, enabled: true }))
        .toThrow('GatewayInterface is abstract and cannot be instantiated directly');
    });

    it('can be subclassed', () => {
      class ConcreteGateway extends GatewayInterface {
        async createOrder() {}
        async verifyPayment() {}
        async fetchPaymentDetails() {}
        async healthCheck() {}
      }
      expect(() => new ConcreteGateway({ name: 'concrete', priority: 1, enabled: true }))
        .not.toThrow();
    });
  });

  describe('abstract method stubs throw when not overridden', () => {
    class PartialGateway extends GatewayInterface {}

    let gateway;
    beforeEach(() => {
      gateway = new PartialGateway({ name: 'partial', priority: 1, enabled: true });
    });

    it('createOrder() throws', async () => {
      await expect(gateway.createOrder({})).rejects.toThrow('createOrder() must be implemented');
    });

    it('verifyPayment() throws', async () => {
      await expect(gateway.verifyPayment({})).rejects.toThrow('verifyPayment() must be implemented');
    });

    it('fetchPaymentDetails() throws', async () => {
      await expect(gateway.fetchPaymentDetails('pay_123')).rejects.toThrow(
        'fetchPaymentDetails() must be implemented'
      );
    });

    it('healthCheck() throws', async () => {
      await expect(gateway.healthCheck()).rejects.toThrow('healthCheck() must be implemented');
    });
  });

  describe('concrete helper methods', () => {
    class ConcreteGateway extends GatewayInterface {
      async createOrder() {}
      async verifyPayment() {}
      async fetchPaymentDetails() {}
      async healthCheck() {}
    }

    it('getName() returns config name', () => {
      const gw = new ConcreteGateway({ name: 'mypay', priority: 2, enabled: true });
      expect(gw.getName()).toBe('mypay');
    });

    it('getPriority() returns config priority', () => {
      const gw = new ConcreteGateway({ name: 'mypay', priority: 5, enabled: true });
      expect(gw.getPriority()).toBe(5);
    });

    it('isEnabled() reflects config enabled flag', () => {
      const enabled = new ConcreteGateway({ name: 'a', priority: 1, enabled: true });
      const disabled = new ConcreteGateway({ name: 'b', priority: 1, enabled: false });
      expect(enabled.isEnabled()).toBe(true);
      expect(disabled.isEnabled()).toBe(false);
    });

    it('enable() / disable() toggle the flag', () => {
      const gw = new ConcreteGateway({ name: 'a', priority: 1, enabled: false });
      gw.enable();
      expect(gw.isEnabled()).toBe(true);
      gw.disable();
      expect(gw.isEnabled()).toBe(false);
    });

    it('defaults priority to 999 when not provided', () => {
      const gw = new ConcreteGateway({ name: 'a' });
      expect(gw.getPriority()).toBe(999);
    });

    it('defaults enabled to true when not provided', () => {
      const gw = new ConcreteGateway({ name: 'a' });
      expect(gw.isEnabled()).toBe(true);
    });
  });
});

// ─── RazorpayGateway implements the interface ─────────────────────────────────

describe('RazorpayGateway', () => {
  const validConfig = {
    name: 'razorpay',
    priority: 1,
    enabled: true,
    keyId: 'rzp_test_abc123',
    keySecret: 'secret_xyz',
    timeout: 30000,
  };

  it('is an instance of GatewayInterface', () => {
    const gw = new RazorpayGateway(validConfig);
    expect(gw).toBeInstanceOf(GatewayInterface);
  });

  it('exposes getName(), getPriority(), isEnabled()', () => {
    const gw = new RazorpayGateway(validConfig);
    expect(gw.getName()).toBe('razorpay');
    expect(gw.getPriority()).toBe(1);
    expect(gw.isEnabled()).toBe(true);
  });

  it('exposes getPublicKeyId()', () => {
    const gw = new RazorpayGateway(validConfig);
    expect(gw.getPublicKeyId()).toBe('rzp_test_abc123');
  });

  it('throws when keyId is missing', () => {
    expect(() => new RazorpayGateway({ ...validConfig, keyId: '' }))
      .toThrow('Razorpay gateway requires keyId and keySecret');
  });

  it('throws when keySecret is missing', () => {
    expect(() => new RazorpayGateway({ ...validConfig, keySecret: '' }))
      .toThrow('Razorpay gateway requires keyId and keySecret');
  });

  it('implements all abstract methods (no throw on call)', () => {
    const gw = new RazorpayGateway(validConfig);
    // Methods exist and are functions
    expect(typeof gw.createOrder).toBe('function');
    expect(typeof gw.verifyPayment).toBe('function');
    expect(typeof gw.fetchPaymentDetails).toBe('function');
    expect(typeof gw.healthCheck).toBe('function');
  });
});

// ─── Configuration loading from environment variables ─────────────────────────

describe('parseGatewayConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('reads GATEWAY_<NAME>_* variables correctly', () => {
    process.env.GATEWAY_RAZORPAY_ENABLED = 'true';
    process.env.GATEWAY_RAZORPAY_PRIORITY = '2';
    process.env.GATEWAY_RAZORPAY_KEY_ID = 'rzp_test_key';
    process.env.GATEWAY_RAZORPAY_KEY_SECRET = 'secret';
    process.env.GATEWAY_RAZORPAY_TIMEOUT = '15000';

    const config = parseGatewayConfig('razorpay');

    expect(config.name).toBe('razorpay');
    expect(config.enabled).toBe(true);
    expect(config.priority).toBe(2);
    expect(config.keyId).toBe('rzp_test_key');
    expect(config.keySecret).toBe('secret');
    expect(config.timeout).toBe(15000);
  });

  it('defaults enabled to false when env var is absent', () => {
    delete process.env.GATEWAY_RAZORPAY_ENABLED;
    const config = parseGatewayConfig('razorpay');
    expect(config.enabled).toBe(false);
  });

  it('defaults priority to 999 when env var is absent', () => {
    delete process.env.GATEWAY_RAZORPAY_PRIORITY;
    const config = parseGatewayConfig('razorpay');
    expect(config.priority).toBe(999);
  });

  it('defaults timeout to 30000 when env var is absent', () => {
    delete process.env.GATEWAY_RAZORPAY_TIMEOUT;
    const config = parseGatewayConfig('razorpay');
    expect(config.timeout).toBe(30000);
  });

  it('is case-insensitive for gateway name', () => {
    process.env.GATEWAY_RAZORPAY_ENABLED = 'true';
    process.env.GATEWAY_RAZORPAY_KEY_ID = 'rzp_test_key';
    process.env.GATEWAY_RAZORPAY_KEY_SECRET = 'secret';

    const config = parseGatewayConfig('RAZORPAY');
    expect(config.name).toBe('razorpay');
    expect(config.keyId).toBe('rzp_test_key');
  });
});

// ─── Credential validation ────────────────────────────────────────────────────

describe('validateGatewayConfig', () => {
  const validConfig = {
    name: 'razorpay',
    enabled: true,
    priority: 1,
    keyId: 'rzp_test_abc',
    keySecret: 'secret',
    timeout: 30000,
  };

  it('returns no errors for a valid enabled config', () => {
    expect(validateGatewayConfig(validConfig)).toHaveLength(0);
  });

  it('returns no errors for a disabled config even without credentials', () => {
    const config = { name: 'razorpay', enabled: false, priority: 1, keyId: '', keySecret: '' };
    expect(validateGatewayConfig(config)).toHaveLength(0);
  });

  it('requires keyId when enabled', () => {
    const errors = validateGatewayConfig({ ...validConfig, keyId: '' });
    expect(errors.some(e => e.includes('keyId'))).toBe(true);
  });

  it('requires keySecret when enabled', () => {
    const errors = validateGatewayConfig({ ...validConfig, keySecret: '' });
    expect(errors.some(e => e.includes('keySecret'))).toBe(true);
  });

  it('rejects negative priority', () => {
    const errors = validateGatewayConfig({ ...validConfig, priority: -1 });
    expect(errors.some(e => e.includes('priority'))).toBe(true);
  });

  it('rejects zero timeout', () => {
    const errors = validateGatewayConfig({ ...validConfig, timeout: 0 });
    expect(errors.some(e => e.includes('timeout'))).toBe(true);
  });

  it('rejects negative timeout', () => {
    const errors = validateGatewayConfig({ ...validConfig, timeout: -100 });
    expect(errors.some(e => e.includes('timeout'))).toBe(true);
  });

  it('requires gateway name', () => {
    const errors = validateGatewayConfig({ ...validConfig, name: '' });
    expect(errors.some(e => e.includes('name'))).toBe(true);
  });
});

// ─── loadGatewayConfigs – invalid configuration rejection ─────────────────────

describe('loadGatewayConfigs', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Clear all gateway env vars
    Object.keys(process.env)
      .filter(k => k.startsWith('GATEWAY_') || k.startsWith('RAZORPAY_'))
      .forEach(k => delete process.env[k]);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns empty gateways array when no gateway is enabled', () => {
    const { gateways, errors } = loadGatewayConfigs();
    expect(gateways).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });

  it('loads a valid Razorpay gateway and returns it sorted by priority', () => {
    process.env.GATEWAY_RAZORPAY_ENABLED = 'true';
    process.env.GATEWAY_RAZORPAY_PRIORITY = '1';
    process.env.GATEWAY_RAZORPAY_KEY_ID = 'rzp_test_key';
    process.env.GATEWAY_RAZORPAY_KEY_SECRET = 'secret';

    const { gateways, errors } = loadGatewayConfigs();

    expect(errors).toHaveLength(0);
    expect(gateways).toHaveLength(1);
    expect(gateways[0]).toBeInstanceOf(RazorpayGateway);
    expect(gateways[0].getName()).toBe('razorpay');
  });

  it('rejects an enabled gateway with missing credentials and records errors', () => {
    process.env.GATEWAY_RAZORPAY_ENABLED = 'true';
    process.env.GATEWAY_RAZORPAY_PRIORITY = '1';
    // No KEY_ID or KEY_SECRET

    const { gateways, errors } = loadGatewayConfigs();

    expect(gateways).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('supports legacy RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET env vars', () => {
    process.env.RAZORPAY_KEY_ID = 'rzp_legacy_key';
    process.env.RAZORPAY_KEY_SECRET = 'legacy_secret';
    // No GATEWAY_RAZORPAY_* vars set

    const { gateways, errors } = loadGatewayConfigs();

    expect(errors).toHaveLength(0);
    expect(gateways).toHaveLength(1);
    expect(gateways[0].getName()).toBe('razorpay');
  });
});
