const winston = require('winston');

const SERVICE_NAME = process.env.SERVICE_NAME || 'payment-service';

const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const logEntry = {
      timestamp,
      level,
      service: SERVICE_NAME,
      message,
      ...meta
    };
    if (stack) {
      logEntry.stack = stack;
    }
    return JSON.stringify(logEntry);
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: jsonFormat,
  defaultMeta: { service: SERVICE_NAME },
  transports: [
    new winston.transports.Console()
  ]
});

module.exports = logger;
