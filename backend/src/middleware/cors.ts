import cors from 'cors';
import { env } from '../config/env';

const allowedOrigins = [
  env.FRONTEND_URL,
  'http://localhost:3000',
  'https://app.unistudy.ai',
  'https://unistudy.vercel.app',
].filter(Boolean);

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, webhooks)
    if (!origin) return callback(null, true);
    // Allow any localhost origin (dev environments) regardless of port
    if (origin && origin.includes('localhost')) return callback(null, true);
    // Allow Vercel preview domains
    if (origin && origin.endsWith('vercel.app')) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400 // cache preflight for 24 hours
});
