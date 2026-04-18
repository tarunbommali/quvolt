const util = require('util');
const { createLogger, format, transports } = require('winston');

const SERVICE_NAME = process.env.SERVICE_NAME || 'quiz-server';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ── JSON structured format (production) ─────────────────────────────────────
const jsonFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, stack, ...meta }) => {
        const entry = { timestamp, level, service: SERVICE_NAME, message, ...meta };
        if (stack) entry.stack = stack;
        // Production JSON stringify still risky but less so with winston defaults
        try {
            return JSON.stringify(entry);
        } catch (e) {
            return JSON.stringify({ timestamp, level, service: SERVICE_NAME, message: 'Serialization failed', error: e.message });
        }
    })
);

// ── Colorized human-readable format (development) ───────────────────────────
const devFormat = format.combine(
    format.colorize(),
    format.timestamp({ format: 'HH:mm:ss' }),
    format.printf(({ timestamp, level, message, ...meta }) => {
        const metaCopy = { ...meta };
        delete metaCopy[Symbol.for('level')];
        delete metaCopy[Symbol.for('message')];
        delete metaCopy[Symbol.for('splat')];

        const extras = Object.keys(metaCopy).length 
            ? ` ${util.inspect(metaCopy, { depth: 3, colors: true, compact: true })}` 
            : '';
        return `${timestamp} [${SERVICE_NAME}] ${level}: ${message}${extras}`;
    })
);

const logger = createLogger({
    level: process.env.LOG_LEVEL || (IS_PRODUCTION ? 'info' : 'debug'),
    format: IS_PRODUCTION ? jsonFormat : devFormat,
    defaultMeta: { service: SERVICE_NAME },
    transports: [new transports.Console()],
    exceptionHandlers: [new transports.Console()],
    rejectionHandlers: [new transports.Console()],
});

logger.audit = (message, meta = {}) => {
    logger.info(message, { eventType: 'audit', ...meta });
};

module.exports = logger;
