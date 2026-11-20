"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.telemetryMiddleware = telemetryMiddleware;
const cpuOptimization_1 = require("../../../shared/lib/cpuOptimization");
const requestLogger_1 = require("./requestLogger");
const UUID_SEGMENT_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const NUMERIC_SEGMENT_RE = /\/\d+(?=\/|$)/g;
function normalizeRouteLabel(req) {
    const matchedRoute = req.route?.path && typeof req.route.path === 'string'
        ? `${req.baseUrl || ''}${req.route.path}`
        : req.path || req.originalUrl?.split('?')[0] || '/';
    return matchedRoute
        .replace(UUID_SEGMENT_RE, ':id')
        .replace(NUMERIC_SEGMENT_RE, '/:id') || '/';
}
function telemetryMiddleware(req, res, next) {
    if (req.path === '/ping' || req.path === '/api/health') {
        return next();
    }
    const startHr = process.hrtime.bigint();
    const startCpu = process.cpuUsage();
    res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - startHr) / 1_000_000;
        const cpuDelta = process.cpuUsage(startCpu);
        const cpuTimeMs = (cpuDelta.user + cpuDelta.system) / 1000;
        const route = normalizeRouteLabel(req);
        cpuOptimization_1.globalTelemetry.recordRequest({
            route,
            method: req.method,
            durationMs,
            cpuTimeMs,
            statusCode: res.statusCode,
        });
        if (durationMs > 1500 || cpuTimeMs > 250) {
            requestLogger_1.logger.warn({
                route,
                method: req.method,
                statusCode: res.statusCode,
                durationMs: Math.round(durationMs * 100) / 100,
                cpuTimeMs: Math.round(cpuTimeMs * 100) / 100,
            }, '[Telemetry] Slow or CPU-heavy API request detected');
        }
    });
    next();
}
