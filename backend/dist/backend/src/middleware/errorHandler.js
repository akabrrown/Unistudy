"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
function errorHandler(err, req, res, next) {
    // Use req.log from pino-http if available, otherwise fallback to console
    if (req.log) {
        req.log.error(err);
    }
    else {
        console.error(err);
    }
    // Handle specific known error types
    if (err.name === 'ZodError') {
        return res.status(400).json({
            error: 'Validation Error',
            details: err.errors
        });
    }
    if (err.status) {
        return res.status(err.status).json({
            error: err.message || 'Error occurred'
        });
    }
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    });
}
