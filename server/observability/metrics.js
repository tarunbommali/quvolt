const client = require('prom-client');

client.collectDefaultMetrics({ prefix: 'quizbolt_' });

const httpRequestDurationMs = new client.Histogram({
    name: 'quizbolt_http_request_duration_ms',
    help: 'HTTP request latency in milliseconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [50, 100, 250, 500, 1000, 2000, 5000],
});

const httpRequestTotal = new client.Counter({
    name: 'quizbolt_http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
});

const httpRequestErrorsTotal = new client.Counter({
    name: 'quizbolt_http_request_errors_total',
    help: 'Total HTTP 5xx responses',
    labelNames: ['method', 'route', 'status_code'],
});

const socketConnectionsActive = new client.Gauge({
    name: 'quizbolt_socket_connections_active',
    help: 'Current active socket connections',
});

const socketSessionDropsTotal = new client.Counter({
    name: 'quizbolt_socket_session_drops_total',
    help: 'Socket session drops/disconnects',
    labelNames: ['reason'],
});

const paymentFailuresTotal = new client.Counter({
    name: 'quizbolt_payment_failures_total',
    help: 'Payment proxy or service failures',
    labelNames: ['route', 'status_code'],
});

module.exports = {
    client,
    httpRequestDurationMs,
    httpRequestTotal,
    httpRequestErrorsTotal,
    socketConnectionsActive,
    socketSessionDropsTotal,
    paymentFailuresTotal,
};
