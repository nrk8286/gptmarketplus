// Authentication middleware

import type { Env, AuthenticatedUser } from '../types/env.js';

interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  isAdmin: boolean;
  isCreator: boolean;
  exp: number;
  iat: number;
}

export async function verifyAuthToken(
  request: Request,
  env: Env
): Promise<AuthenticatedUser | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  try {
    // Verify JWT token
    const payload = await verifyJwt(token, env.JWT_SECRET);
    if (!payload) {
      return null;
    }

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null;
    }

    // Verify session exists in KV
    const sessionKey = `session:${payload.sub}:${token.substring(0, 16)}`;
    const sessionData = await env.SESSIONS.get(sessionKey);
    if (!sessionData) {
      return null;
    }

    return {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      isAdmin: payload.isAdmin,
      isCreator: payload.isCreator,
    };
  } catch {
    return null;
  }
}

export async function verifyApiKey(
  request: Request,
  env: Env
): Promise<AuthenticatedUser | null> {
  const apiKey = request.headers.get('X-API-Key');
  if (!apiKey) {
    return null;
  }

  try {
    // Hash the API key for lookup
    const keyHash = await hashApiKey(apiKey);
    
    // Query the database for the API key
    const result = await env.DB.prepare(`
      SELECT 
        ak.user_id,
        ak.permissions,
        ak.rate_limit,
        ak.monthly_usage,
        ak.is_active,
        ak.expires_at,
        u.email,
        u.username,
        u.is_admin,
        u.is_creator
      FROM user_api_keys ak
      JOIN users u ON ak.user_id = u.id
      WHERE ak.key_hash = ?
    `).bind(keyHash).first();

    if (!result) {
      return null;
    }

    // Check if key is active and not expired
    if (!result.is_active) {
      return null;
    }

    if (result.expires_at && new Date(result.expires_at as string) < new Date()) {
      return null;
    }

    // Update last used timestamp
    await env.DB.prepare(`
      UPDATE user_api_keys 
      SET last_used_at = datetime('now'), monthly_usage = monthly_usage + 1
      WHERE key_hash = ?
    `).bind(keyHash).run();

    return {
      id: result.user_id as string,
      email: result.email as string,
      username: result.username as string,
      isAdmin: Boolean(result.is_admin),
      isCreator: Boolean(result.is_creator),
    };
  } catch {
    return null;
  }
}

async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    
    // Verify signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureData = Uint8Array.from(
      atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0)
    );

    const dataToVerify = encoder.encode(`${headerB64}.${payloadB64}`);

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureData,
      dataToVerify
    );

    if (!isValid) {
      return null;
    }

    // Decode payload
    const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson) as JwtPayload;

    return payload;
  } catch {
    return null;
  }
}

async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function generateJwt(
  payload: Omit<JwtPayload, 'exp' | 'iat'>,
  secret: string,
  expiresInSeconds: number = 86400
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encoder = new TextEncoder();
  
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = btoa(JSON.stringify(header))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  const payloadB64 = btoa(JSON.stringify(fullPayload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${headerB64}.${payloadB64}`)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}
