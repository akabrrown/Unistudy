import { Request, Response, NextFunction } from 'express';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { env } from '../config/env';
import { supabaseAdmin } from '../lib/supabase';

const JWKS = createRemoteJWKSet(
  new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
);

export async function authenticateUser(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }
  
  const token = authHeader.split(' ')[1];
  try {
    let userId: string | null = null;
    let email = '';
    let role = 'student';

    try {
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: `${env.SUPABASE_URL}/auth/v1`,
        audience: 'authenticated'
      });
      userId = payload.sub as string;
      email = (payload.email as string) || '';
      role = (payload.user_metadata as any)?.role || 'student';
    } catch (jwksErr) {
      // Fallback: Validate via Supabase GoTrue directly (handles HS256 symmetric signing & custom secrets)
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !data?.user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      userId = data.user.id;
      email = data.user.email || '';
      role = (data.user.user_metadata as any)?.role || 'student';
    }

    req.user = {
      id: userId,
      email,
      role,
      jwt: token
    };
    
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
