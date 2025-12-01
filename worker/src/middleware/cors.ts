// CORS middleware for Cloudflare Workers

import type { Env } from '../types/env.js';

const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:3000'];

export function getCorsHeaders(request: Request, env: Env): Headers {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = env.CORS_ORIGINS
    ? env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : DEFAULT_ALLOWED_ORIGINS;

  const headers = new Headers();

  // Check if origin is allowed
  if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
    headers.set('Access-Control-Allow-Origin', origin);
  }
  // If origin is not allowed, don't set any CORS headers - request will fail CORS check

  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
  headers.set('Access-Control-Max-Age', '86400');
  headers.set('Access-Control-Allow-Credentials', 'true');

  return headers;
}

export function handleCorsPreflightRequest(request: Request, env: Env): Response {
  const corsHeaders = getCorsHeaders(request, env);
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export function addCorsHeaders(response: Response, request: Request, env: Env): Response {
  const corsHeaders = getCorsHeaders(request, env);
  const newHeaders = new Headers(response.headers);

  corsHeaders.forEach((value, key) => {
    newHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
