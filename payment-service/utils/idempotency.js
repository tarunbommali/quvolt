const logger = require('./logger');

/**
 * Global Idempotency Layer for Quvolt
 * Stores keys in memory (or Redis if enabled) to prevent double processing
 */
const processedKeys = new Set();

/**
 * Ensure an operation is idempotent by checking against a unique key
 * @param {string} key - Unique key (e.g. orderId:userId)
 * @param {Function} fn - Async operation to perform
 * @returns {Promise<any>}
 */
const ensureIdempotent = async (key, fn) => {
  if (processedKeys.has(key)) {
    logger.warn('Idempotency block: Operation already processed', { key });
    return { success: true, message: 'Already processed', cached: true };
  }

  try {
    const result = await fn();
    processedKeys.add(key);
    
    // Clear key from memory after 10 minutes to prevent memory leak
    // In production, this should use Redis TTL
    setTimeout(() => processedKeys.delete(key), 10 * 60 * 1000);
    
    return result;
  } catch (error) {
    logger.error('Idempotency error', { key, error: error.message });
    throw error;
  }
};

module.exports = { ensureIdempotent };
