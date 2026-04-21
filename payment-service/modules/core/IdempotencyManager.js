const logger = require('../../utils/logger');

/**
 * Idempotency Manager (OOP Wrapper)
 * Requirements: SOLID SRP
 */
class IdempotencyManager {
  constructor() {
    this.processedKeys = new Set();
  }

  /**
   * Ensure an operation is idempotent
   * @param {string} key - Unique key
   * @param {Function} fn - Async operation
   */
  async ensureIdempotent(key, fn) {
    if (this.processedKeys.has(key)) {
      logger.warn('Idempotency block: Operation already processed', { key });
      return { success: true, message: 'Already processed', cached: true };
    }

    try {
      const result = await fn();
      this.processedKeys.add(key);
      
      // Memory management: clear after 10m
      setTimeout(() => this.processedKeys.delete(key), 10 * 60 * 1000);
      
      return result;
    } catch (error) {
      logger.error('Idempotency error', { key, error: error.message });
      throw error;
    }
  }
}

module.exports = new IdempotencyManager();
