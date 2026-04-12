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
        return JSON.stringify(entry);
    })
);

// ── Colorized human-readable format (development) ───────────────────────────
const devFormat = format.combine(
    format.colorize(),
    format.timestamp({ format: 'HH:mm:ss' }),
    format.printf(({ timestamp, level, message, ...meta }) => {
        const extras = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
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
