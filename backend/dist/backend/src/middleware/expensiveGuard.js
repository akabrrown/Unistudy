"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.protectExpensiveEndpoint = protectExpensiveEndpoint;
exports.deduplicateInFlightRequests = deduplicateInFlightRequests;
const crypto_1 = require("crypto");
const cpuOptimization_1 = require("../../../shared/lib/cpuOptimization");
function protectExpensiveEndpoint(options) {
    const protector = new cpuOptimization_1.ExpensiveEndpointProtector({
        maxRequests: options?.maxPerMinute ?? 10,
        windowMs: 60_000,
        maxConcurrent: options?.maxConcurrent ?? 2,
    });
    return (req, res, next) => {
        const key = req.user?.id || req.ip || req.headers['x-forwarded-for']?.toString() || 'anon';
        const result = protector.acquire(key);
        if (!result.allowed) {
            res.setHeader('Retry-After', String(result.retryAfterSec));
            return res.status(429).json({
                error: result.reason || 'rate_limit',
                message: result.reason === 'concurrency_limit'
                    ? 'Another request is still running for your account. Please wait a moment.'
                    : 'Too many requests to this endpoint. Please slow down and try again shortly.',
                retryAfter: result.retryAfterSec,
            });
        }
        res.on('finish', result.release);
        res.on('close', result.release);
        next();
    };
}
function buildRequestKey(req) {
    const identity = req.user?.id || req.ip || 'anon';
    const path = `${req.baseUrl || ''}${req.path || ''}`;
    let bodyHash = 'empty';
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body && typeof req.body === 'object') {
        try {
            bodyHash = (0, crypto_1.createHash)('sha256').update(JSON.stringify(req.body)).digest('hex').slice(0, 16);
        }
        catch {
            bodyHash = 'unserializable';
        }
    }
    const queryPart = req.originalUrl?.includes('?') ? req.originalUrl.split('?')[1] : '';
    return `${identity}:${req.method}:${path}:${queryPart}:${bodyHash}`;
}
function deduplicateInFlightRequests(options) {
    const dedup = new cpuOptimization_1.InFlightDeduplicator();
    const allowedMethods = new Set((options?.methods || ['GET', 'POST']).map((m) => m.toUpperCase()));
    const activeLeaderKeys = new Set();
    return (req, res, next) => {
        if (!allowedMethods.has(req.method.toUpperCase())) {
            return next();
        }
        if (req.is('multipart/form-data') ||
            req.body?.stream === true ||
            req.body?.payload?.stream === true ||
            /explain-slide|stream/i.test(req.path) ||
            req.headers.accept?.includes('text/event-stream')) {
            return next();
        }
        const key = buildRequestKey(req);
        // If a leader is already executing for this exact key, coalesce and replay its result
        if (activeLeaderKeys.has(key)) {
            void dedup
                .run(key, async () => ({ passthrough: true, status: 200, body: null, isJson: false }))
                .then((buffered) => {
                if (res.headersSent)
                    return;
                if (buffered.passthrough) {
                    return next();
                }
                if (buffered.isJson) {
                    return res.status(buffered.status).json(buffered.body);
                }
                return res.status(buffered.status).send(buffered.body);
            })
                .catch(() => {
                if (!res.headersSent)
                    next();
            });
            return;
        }
        activeLeaderKeys.add(key);
        void dedup
            .run(key, () => new Promise((resolve) => {
            let settled = false;
            const origJson = res.json.bind(res);
            const origSend = res.send.bind(res);
            const finishWith = (payload) => {
                if (!settled) {
                    settled = true;
                    activeLeaderKeys.delete(key);
                    resolve(payload);
                }
            };
            res.json = ((body) => {
                finishWith({
                    passthrough: false,
                    status: res.statusCode || 200,
                    body,
                    isJson: true,
                });
                return origJson(body);
            });
            res.send = ((body) => {
                finishWith({
                    passthrough: false,
                    status: res.statusCode || 200,
                    body,
                    isJson: false,
                });
                return origSend(body);
            });
            const fallbackSettle = () => {
                finishWith({
                    passthrough: true,
                    status: res.statusCode || 200,
                    body: null,
                    isJson: false,
                });
            };
            res.on('finish', fallbackSettle);
            res.on('close', fallbackSettle);
            next();
        }))
            .catch(() => {
            activeLeaderKeys.delete(key);
        });
    };
}
