import pinoHttp from 'pino-http';
import pino from 'pino';

// Initialize pino logger
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

export const requestLogger = pinoHttp({
  logger,
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
