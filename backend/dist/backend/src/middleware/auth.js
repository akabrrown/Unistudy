"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateUser = authenticateUser;
const jose_1 = require("jose");
const env_1 = require("../config/env");
const supabase_1 = require("../lib/supabase");
const JWKS = (0, jose_1.createRemoteJWKSet)(new URL(`${env_1.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`));
async function authenticateUser(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing authorization header' });
    }
    const token = authHeader.split(' ')[1];
    try {
        let userId = null;
        let email = '';
        let role = 'student';
        try {
            const { payload } = await (0, jose_1.jwtVerify)(token, JWKS, {
                issuer: `${env_1.env.SUPABASE_URL}/auth/v1`,
                audience: 'authenticated'
            });
            userId = payload.sub;
            email = payload.email || '';
            role = payload.user_metadata?.role || 'student';
        }
        catch (jwksErr) {
            // Fallback: Validate via Supabase GoTrue directly (handles HS256 symmetric signing & custom secrets)
            const { data, error } = await supabase_1.supabaseAdmin.auth.getUser(token);
            if (error || !data?.user) {
                return res.status(401).json({ error: 'Invalid or expired token' });
            }
            userId = data.user.id;
            email = data.user.email || '';
            role = data.user.user_metadata?.role || 'student';
        }
        req.user = {
            id: userId,
            email,
            role,
            jwt: token
        };
        next();
    }
    catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}
