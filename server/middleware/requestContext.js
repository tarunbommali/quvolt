const crypto = require('crypto');

const requestContext = (req, res, next) => {
    const requestId = req.headers['x-request-id'] || req.headers['x-correlation-id'] || crypto.randomUUID();
    req.requestId = String(requestId);
    res.setHeader('X-Request-Id', req.requestId);
    next();
};

module.exports = requestContext;
