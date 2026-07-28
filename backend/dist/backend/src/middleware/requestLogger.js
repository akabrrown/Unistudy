"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = exports.logger = void 0;
const pino_http_1 = __importDefault(require("pino-http"));
const pino_1 = __importDefault(require("pino"));
// Initialize pino logger
exports.logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || 'info',
});
exports.requestLogger = (0, pino_http_1.default)({
    logger: exports.logger,
    serializers: {
        req: (req) => ({
            id: req.id,
            method: req.method,
            url: req.url,
            // Log custom user ID if attached by auth middleware
            user: req.raw?.user?.id || 'anonymous'
        }),
        res: (res) => ({
            statusCode: res.statusCode,
        }),
    },
    // Don't log successful health checks to keep logs clean
    autoLogging: {
        ignore: (req) => req.url === '/health'
    }
});
