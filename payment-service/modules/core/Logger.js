const logger = require('../../utils/logger');

/**
 * Logger Service (OOP Wrapper)
 * Requirements: SOLID SRP
 */
class Logger {
  static info(message, meta = {}) {
    logger.info(message, meta);
  }

  static error(message, meta = {}) {
    logger.error(message, meta);
  }

  static warn(message, meta = {}) {
    logger.warn(message, meta);
  }

  static debug(message, meta = {}) {
    logger.debug(message, meta);
  }
}

module.exports = Logger;
