// Worker environment bindings and types

export interface Env {
  // D1 Database
  DB: D1Database;

  // R2 Storage
  STORAGE: R2Bucket;

  // KV Namespaces
  CACHE: KVNamespace;
  SESSIONS: KVNamespace;

  // Environment variables
  ENVIRONMENT: string;
  API_VERSION: string;
  CORS_ORIGINS: string;

  // Secrets (set via wrangler secret put)
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  JWT_SECRET: string;
}

export interface RequestContext {
  env: Env;
  user?: AuthenticatedUser;
  requestId: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
  isCreator: boolean;
}

export interface RouteHandler {
  (request: Request, ctx: RequestContext): Promise<Response>;
}

export interface RouteConfig {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  handler: RouteHandler;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}
