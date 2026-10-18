import cors from 'cors';
import { env } from '../config/env';

// Collect static allowed origins
const configuredOrigins = env.FRONTEND_URL
  ? env.FRONTEND_URL.split(',').map(u => u.trim().replace(/\/+$/, '')).filter(Boolean)
  : [];

const defaultAllowedOrigins = new Set([
  ...configuredOrigins,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'https://app.unistudy.ai',
  'https://unistudy.ai',
  'https://www.unistudy.ai',
  'https://unistudy.vercel.app',
  'https://unistudy-silk.vercel.app',
]);

// Allow all Unistudy Vercel deployments (production, preview, and branch deployments)
// e.g. https://unistudy-silk.vercel.app, https://unistudy-*.vercel.app
const UNISTUDY_VERCEL_REGEX = /^https:\/\/(?:[a-z0-9-]+\.)?unistudy[a-z0-9-]*\.vercel\.app$|^https:\/\/unistudy[a-z0-9-]*\.vercel\.app$/i;

function isOriginAllowed(origin: string): boolean {
  if (!origin) return true;

  const normalized = origin.trim().replace(/\/+$/, '');

  // Exact match from configured or default domains
  if (defaultAllowedOrigins.has(normalized)) return true;

  // Local development ports (http://localhost:* or http://127.0.0.1:*)
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalized)) return true;

  // Any unistudy vercel preview / production domain
  if (UNISTUDY_VERCEL_REGEX.test(normalized)) return true;

  return false;
}

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (mobile native, Postman, webhooks)
    if (!origin) return callback(null, true);

    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }

    console.warn(`[CORS] Origin rejected: ${origin}`);
    // Return null, false so preflight OPTIONS doesn't throw a 500 error
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-ID',
    'x-model-tier',
    'x-client-info',
    'Accept',
    'Origin',
    'X-Requested-With',
    'Range'
  ],
  exposedHeaders: ['X-RateLimit-Remaining', 'X-RateLimit-Reset', 'Content-Range'],
  optionsSuccessStatus: 204,
  maxAge: 86400 // Cache preflight for 24 hours
});

