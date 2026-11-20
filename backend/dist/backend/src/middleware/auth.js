"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateUser = authenticateUser;
const crypto_1 = require("crypto");
const jose_1 = require("jose");
const env_1 = require("../config/env");
const supabase_1 = require("../lib/supabase");
const cpuOptimization_1 = require("../../../shared/lib/cpuOptimization");
const JWKS = (0, jose_1.createRemoteJWKSet)(new URL(`${env_1.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`));
const AUTH_CACHE_TTL_MS = 60_000;
const tokenAuthCache = new cpuOptimization_1.TTLCache(AUTH_CACHE_TTL_MS, 500);
function hashToken(token) {
    return (0, crypto_1.createHash)('sha256').update(token).digest('hex');
}
function readJwtExpMs(token) {
    try {
        const parts = token.split('.');
        if (parts.length < 2)
            return undefined;
        const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
        const parsed = JSON.parse(payloadJson);
        return typeof parsed.exp === 'number' ? parsed.exp * 1000 : undefined;
    }
    catch {
        return undefined;
    }
}
async function authenticateUser(req, res, next) {
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
        let userId = null;
        let email = '';
        let role = 'student';
        let expMs = readJwtExpMs(token);
        try {
            const { payload } = await (0, jose_1.jwtVerify)(token, JWKS, {
                issuer: `${env_1.env.SUPABASE_URL}/auth/v1`,
                audience: 'authenticated',
            });
            userId = payload.sub;
            email = payload.email || '';
            role = payload.user_metadata?.role || 'student';
            if (typeof payload.exp === 'number') {
                expMs = payload.exp * 1000;
            }
        }
        catch {
            // Fallback: Validate via Supabase GoTrue directly (handles HS256 symmetric signing & custom secrets)
            const { data, error } = await supabase_1.supabaseAdmin.auth.getUser(token);
            if (error || !data?.user) {
                return res.status(401).json({ error: 'Invalid or expired token' });
            }
            userId = data.user.id;
            email = data.user.email || '';
            role = data.user.user_metadata?.role || 'student';
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
    }
    catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}
