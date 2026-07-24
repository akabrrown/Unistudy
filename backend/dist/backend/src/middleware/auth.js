"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateUser = authenticateUser;
const jose_1 = require("jose");
const env_1 = require("../config/env");
const JWKS = (0, jose_1.createRemoteJWKSet)(new URL(`${env_1.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`));
async function authenticateUser(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing authorization header' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const { payload } = await (0, jose_1.jwtVerify)(token, JWKS, {
            issuer: `${env_1.env.SUPABASE_URL}/auth/v1`,
            audience: 'authenticated'
        });
        // Extend Request to include user (will be typed in express.d.ts)
        req.user = {
            id: payload.sub,
            email: payload.email,
            role: payload.user_metadata?.role || 'student',
            jwt: token
        };
        next();
    }
    catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}
