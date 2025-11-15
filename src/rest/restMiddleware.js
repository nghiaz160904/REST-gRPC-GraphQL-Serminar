const client = require('prom-client'); // Import prom-client
// Tạo Histogram để đo thời gian xử lý REST API
const restLatencyHistogram = new client.Histogram({
    name: 'rest_article_request_duration_seconds', // đổi tên metric
    help: 'Duration of REST /articles requests in seconds',
    labelNames: ['method', 'status_code'], // chỉ method, status
    buckets: [0.1, 0.5, 1, 1.5, 2, 5] // Buckets cho latency
});

const METRICS_DEBUG = process.env.METRICS_DEBUG === '1';

// Middleware để đo thời gian xử lý REST API
const restMiddleware = (req, res, next) => {
    // Bỏ qua metrics, favicon, OPTIONS
    if (req.path === '/metrics' || req.path === '/favicon.ico' || req.method === 'OPTIONS') return next();

    // Chỉ ghi metric cho /articles
    if (!req.originalUrl.startsWith('/articles')) return next();

    const start = process.hrtime.bigint();
    const end = restLatencyHistogram.startTimer();

    if (METRICS_DEBUG) console.log(`[metrics] start ${req.method} ${req.originalUrl}`);

    res.on('finish', () => {
        try {
            end({ method: req.method, status_code: String(res.statusCode) });
        } catch (e) {
            console.error('[metrics] observe error:', e.message);
        }
        if (METRICS_DEBUG) {
            const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
            console.log(`[metrics] finish ${req.method} ${req.originalUrl} -> ${res.statusCode}; ~${elapsedMs.toFixed(1)}ms`);
        }
    });

    res.on('close', () => {
        if (METRICS_DEBUG) console.warn(`[metrics] closed ${req.method} ${req.originalUrl} before finish`);
    });

    next();
};

module.exports = restMiddleware;