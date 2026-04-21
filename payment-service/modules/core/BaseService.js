const logger = require('../../utils/logger');

/**
 * Base Service Class
 * Provides common functionality for all services
 */
class BaseService {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.logger = logger;
  }

  logInfo(message, meta = {}) {
    this.logger.info(`[${this.serviceName}] ${message}`, meta);
  }

  logError(message, error, meta = {}) {
    this.logger.error(`[${this.serviceName}] ${message}`, {
      ...meta,
      errorMessage: error.message,
      stack: error.stack
    });
  }

  logWarn(message, meta = {}) {
    this.logger.warn(`[${this.serviceName}] ${message}`, meta);
  }

  /**
   * Helper to wrap results in a consistent format if needed
   */
  async execute(fn) {
    try {
      return await fn();
    } catch (error) {
      this.logError('Execution failed', error);
      throw error;
    }
  }
}

module.exports = BaseService;
