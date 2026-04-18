const RazorpayGateway = require('../services/gateways/RazorpayGateway');
const logger = require('../utils/logger');

/**
 * Payment Gateway Configuration System
 * 
 * Loads and validates payment gateway configurations from environment variables.
 * Supports multiple gateways with priority ordering and enable/disable flags.
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.4
 */

/**
 * Parse gateway configuration from environment variables
 * 
 * Expected format:
 * GATEWAY_<NAME>_ENABLED=true|false
 * GATEWAY_<NAME>_PRIORITY=<number>
 * GATEWAY_<NAME>_KEY_ID=<key>
 * GATEWAY_<NAME>_KEY_SECRET=<secret>
 * GATEWAY_<NAME>_TIMEOUT=<milliseconds>
 * 
 * Example for Razorpay:
 * GATEWAY_RAZORPAY_ENABLED=true
 * GATEWAY_RAZORPAY_PRIORITY=1
 * GATEWAY_RAZORPAY_KEY_ID=rzp_test_xxx
 * GATEWAY_RAZORPAY_KEY_SECRET=xxx
 * GATEWAY_RAZORPAY_TIMEOUT=30000
 */
function parseGatewayConfig(gatewayName) {
  const prefix = `GATEWAY_${gatewayName.toUpperCase()}_`;
  
  const config = {
    name: gatewayName.toLowerCase(),
    enabled: String(process.env[`${prefix}ENABLED`] || 'false').toLowerCase() === 'true',
    priority: parseInt(process.env[`${prefix}PRIORITY`] || '999', 10),
    keyId: process.env[`${prefix}KEY_ID`] || '',
    keySecret: process.env[`${prefix}KEY_SECRET`] || '',
    timeout: parseInt(process.env[`${prefix}TIMEOUT`] || '30000', 10),
  };

  return config;
}

/**
 * Validate gateway credentials
 * Requirements: 14.3
 */
function validateGatewayConfig(config) {
  const errors = [];

  if (!config.name) {
    errors.push('Gateway name is required');
  }

  if (config.enabled) {
    if (!config.keyId || config.keyId.trim() === '') {
      errors.push(`${config.name}: keyId is required when gateway is enabled`);
    }

    if (!config.keySecret || config.keySecret.trim() === '') {
      errors.push(`${config.name}: keySecret is required when gateway is enabled`);
    }

    if (isNaN(config.priority) || config.priority < 0) {
      errors.push(`${config.name}: priority must be a non-negative number`);
    }

    if (isNaN(config.timeout) || config.timeout <= 0) {
      errors.push(`${config.name}: timeout must be a positive number`);
    }
  }

  return errors;
}

/**
 * Create gateway instance from configuration
 */
function createGatewayInstance(config) {
  const gatewayName = config.name.toLowerCase();

  switch (gatewayName) {
    case 'razorpay':
      return new RazorpayGateway(config);
    
    // Add more gateway types here as they are implemented
    // case 'stripe':
    //   return new StripeGateway(config);
    
    default:
      throw new Error(`Unknown gateway type: ${gatewayName}`);
  }
}

/**
 * Load all gateway configurations from environment
 * Requirements: 14.1, 14.2, 14.3, 14.4
 */
function loadGatewayConfigs() {
  const gateways = [];
  const errors = [];

  // List of supported gateway names
  // Add new gateways here as they are implemented
  const supportedGateways = ['razorpay'];

  // Also check for legacy RAZORPAY_KEY_ID for backward compatibility
  const hasLegacyRazorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET;
  
  for (const gatewayName of supportedGateways) {
    let config = parseGatewayConfig(gatewayName);

    // Backward compatibility: if GATEWAY_RAZORPAY_* not set, fall back to RAZORPAY_*
    if (gatewayName === 'razorpay' && !config.keyId && hasLegacyRazorpay) {
      logger.info('Using legacy RAZORPAY_KEY_ID configuration (consider migrating to GATEWAY_RAZORPAY_* format)');
      config = {
        name: 'razorpay',
        enabled: String(process.env.PAYMENTS_ENABLED || 'true').toLowerCase() === 'true',
        priority: 1,
        keyId: process.env.RAZORPAY_KEY_ID,
        keySecret: process.env.RAZORPAY_KEY_SECRET,
        timeout: 30000,
      };
    }

    // Skip if not enabled
    if (!config.enabled) {
      logger.info(`Gateway ${gatewayName} is disabled, skipping`, { gateway: gatewayName });
      continue;
    }

    // Validate configuration
    const validationErrors = validateGatewayConfig(config);
    if (validationErrors.length > 0) {
      // Requirement 14.4: Log errors and skip invalid gateway
      logger.error(`Gateway ${gatewayName} configuration is invalid, skipping`, {
        gateway: gatewayName,
        errors: validationErrors,
      });
      errors.push(...validationErrors);
      continue;
    }

    try {
      // Create gateway instance
      const gateway = createGatewayInstance(config);
      gateways.push(gateway);
      
      logger.info(`Gateway ${gatewayName} loaded successfully`, {
        gateway: gatewayName,
        priority: config.priority,
        enabled: config.enabled,
      });
    } catch (error) {
      // Requirement 14.4: Log errors and skip gateway that fails to initialize
      logger.error(`Failed to initialize gateway ${gatewayName}, skipping`, {
        gateway: gatewayName,
        error: error.message,
      });
      errors.push(`${gatewayName}: ${error.message}`);
    }
  }

  // Sort gateways by priority (lower number = higher priority)
  // Requirement 14.2: Support priority ordering
  gateways.sort((a, b) => a.getPriority() - b.getPriority());

  logger.info(`Loaded ${gateways.length} payment gateway(s)`, {
    gateways: gateways.map(g => ({
      name: g.getName(),
      priority: g.getPriority(),
      enabled: g.isEnabled(),
    })),
    errors: errors.length > 0 ? errors : undefined,
  });

  return {
    gateways,
    errors,
  };
}

/**
 * Get configuration summary for monitoring endpoint
 * Requirement 14.5: Expose configuration endpoint with credentials redacted
 */
function getGatewayConfigSummary(gateways) {
  return gateways.map(gateway => ({
    name: gateway.getName(),
    priority: gateway.getPriority(),
    enabled: gateway.isEnabled(),
    timeout: gateway.config.timeout,
    // Credentials are redacted for security
    keyId: gateway.config.keyId ? `${gateway.config.keyId.substring(0, 8)}...` : null,
  }));
}

/**
 * Reload gateway configurations
 * Requirement 14.2: Support enabling/disabling without service restart
 * 
 * Note: This function reloads from environment variables.
 * For file-based config reload (Requirement 14.7), implement file watching separately.
 */
function reloadGatewayConfigs() {
  logger.info('Reloading gateway configurations');
  return loadGatewayConfigs();
}

module.exports = {
  loadGatewayConfigs,
  reloadGatewayConfigs,
  getGatewayConfigSummary,
  parseGatewayConfig,
  validateGatewayConfig,
};
