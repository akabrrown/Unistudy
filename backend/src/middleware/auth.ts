import { createHash } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { env } from '../config/env';
import { supabaseAdmin } from '../lib/supabase';
import { TTLCache } from '../../../shared/lib/cpuOptimization';

const JWKS = createRemoteJWKSet(
  new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
);

interface CachedAuthUser {
  id: string;
  email: string;
  role: string;
  expMs?: number;
}

const AUTH_CACHE_TTL_MS = 60_000;
const tokenAuthCache = new TTLCache<CachedAuthUser>(AUTH_CACHE_TTL_MS, 500);

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function readJwtExpMs(token: string): number | undefined {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return undefined;
    const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
    const parsed = JSON.parse(payloadJson) as { exp?: number };
    return typeof parsed.exp === 'number' ? parsed.exp * 1000 : undefined;
  } catch {
    return undefined;
  }
}

export async function authenticateUser(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.split(' ')[1];
  const tokenKey = hashToken(token);
  const now = Date.now();

  const cached = tokenAuthCache.get(tokenKey);
  if (cached) {
    if (!cached.expMs || cached.expMs > now) {
      req.user = {
        id: cached.id,
        email: cached.email,
        role: cached.role,
        jwt: token,
      };
      return next();
    }
    tokenAuthCache.delete(tokenKey);
  }

  try {
    let userId: string | null = null;
    let email = '';
    let role = 'student';
    let expMs = readJwtExpMs(token);

    try {
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: `${env.SUPABASE_URL}/auth/v1`,
        audience: 'authenticated',
      });
      userId = payload.sub as string;
      email = (payload.email as string) || '';
      role = (payload.user_metadata as any)?.role || 'student';
      if (typeof payload.exp === 'number') {
        expMs = payload.exp * 1000;
      }
    } catch {
      // Fallback: Validate via Supabase GoTrue directly (handles HS256 symmetric signing & custom secrets)
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !data?.user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      userId = data.user.id;
      email = data.user.email || '';
      role = (data.user.user_metadata as any)?.role || 'student';
    }

    if (expMs && expMs <= now) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const ttlMs = expMs ? Math.min(AUTH_CACHE_TTL_MS, expMs - now) : AUTH_CACHE_TTL_MS;
    if (ttlMs > 0) {
      tokenAuthCache.set(tokenKey, { id: userId, email, role, expMs }, ttlMs);
    }

    req.user = {
      id: userId,
      email,
      role,
      jwt: token,
    };

    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
