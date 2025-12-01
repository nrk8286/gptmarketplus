// Main Worker entry point with fetch handler

import type { Env, RequestContext } from './types/env.js';
import { handleCorsPreflightRequest, addCorsHeaders } from './middleware/cors.js';
import { verifyAuthToken, verifyApiKey } from './middleware/auth.js';
import { errorResponse, generateId } from './utils/helpers.js';

// Import handlers
import { handleRegister, handleLogin, handleGetProfile, handleLogout } from './handlers/auth.js';
import { handleListModels, handleGetModel, handleCreateModel, handleGetFeaturedModels, handleGetCategories } from './handlers/models.js';
import { handleCreateRental, handleListUserRentals, handleGetRental, handleCancelRental } from './handlers/rentals.js';
import { handleListSubscriptionPlans, handleGetUserSubscription, handleCreateSubscription, handleCancelSubscription } from './handlers/subscriptions.js';
import { handleListMarkets, handleGetMarket, handleCreateMarket, handlePlaceTrade, handleGetUserPositions } from './handlers/markets.js';
import { handleGetWallet, handleGetWalletTransactions, handleAddFunds, handleWithdrawFunds, handleGetPaymentHistory } from './handlers/payments.js';

// Route definition
interface Route {
  pattern: RegExp;
  method: string;
  handler: (request: Request, ctx: RequestContext) => Promise<Response>;
  requireAuth?: boolean;
}

// Define API routes
const routes: Route[] = [
  // Auth routes
  { pattern: /^\/api\/v1\/auth\/register$/, method: 'POST', handler: handleRegister },
  { pattern: /^\/api\/v1\/auth\/login$/, method: 'POST', handler: handleLogin },
  { pattern: /^\/api\/v1\/auth\/profile$/, method: 'GET', handler: handleGetProfile, requireAuth: true },
  { pattern: /^\/api\/v1\/auth\/logout$/, method: 'POST', handler: handleLogout, requireAuth: true },

  // Models routes
  { pattern: /^\/api\/v1\/models$/, method: 'GET', handler: handleListModels },
  { pattern: /^\/api\/v1\/models\/featured$/, method: 'GET', handler: handleGetFeaturedModels },
  { pattern: /^\/api\/v1\/models\/categories$/, method: 'GET', handler: handleGetCategories },
  { pattern: /^\/api\/v1\/models\/[a-zA-Z0-9]+$/, method: 'GET', handler: handleGetModel },
  { pattern: /^\/api\/v1\/models$/, method: 'POST', handler: handleCreateModel, requireAuth: true },

  // Rentals routes
  { pattern: /^\/api\/v1\/rentals$/, method: 'GET', handler: handleListUserRentals, requireAuth: true },
  { pattern: /^\/api\/v1\/rentals$/, method: 'POST', handler: handleCreateRental, requireAuth: true },
  { pattern: /^\/api\/v1\/rentals\/[a-zA-Z0-9]+$/, method: 'GET', handler: handleGetRental, requireAuth: true },
  { pattern: /^\/api\/v1\/rentals\/[a-zA-Z0-9]+\/cancel$/, method: 'POST', handler: handleCancelRental, requireAuth: true },

  // Subscription routes
  { pattern: /^\/api\/v1\/subscriptions\/plans$/, method: 'GET', handler: handleListSubscriptionPlans },
  { pattern: /^\/api\/v1\/subscriptions$/, method: 'GET', handler: handleGetUserSubscription, requireAuth: true },
  { pattern: /^\/api\/v1\/subscriptions$/, method: 'POST', handler: handleCreateSubscription, requireAuth: true },
  { pattern: /^\/api\/v1\/subscriptions\/cancel$/, method: 'POST', handler: handleCancelSubscription, requireAuth: true },

  // Prediction markets routes
  { pattern: /^\/api\/v1\/markets$/, method: 'GET', handler: handleListMarkets },
  { pattern: /^\/api\/v1\/markets\/positions$/, method: 'GET', handler: handleGetUserPositions, requireAuth: true },
  { pattern: /^\/api\/v1\/markets\/[a-zA-Z0-9]+$/, method: 'GET', handler: handleGetMarket },
  { pattern: /^\/api\/v1\/markets$/, method: 'POST', handler: handleCreateMarket, requireAuth: true },
  { pattern: /^\/api\/v1\/markets\/[a-zA-Z0-9]+\/trade$/, method: 'POST', handler: handlePlaceTrade, requireAuth: true },

  // Payment/Wallet routes
  { pattern: /^\/api\/v1\/wallet$/, method: 'GET', handler: handleGetWallet, requireAuth: true },
  { pattern: /^\/api\/v1\/wallet\/transactions$/, method: 'GET', handler: handleGetWalletTransactions, requireAuth: true },
  { pattern: /^\/api\/v1\/wallet\/deposit$/, method: 'POST', handler: handleAddFunds, requireAuth: true },
  { pattern: /^\/api\/v1\/wallet\/withdraw$/, method: 'POST', handler: handleWithdrawFunds, requireAuth: true },
  { pattern: /^\/api\/v1\/payments$/, method: 'GET', handler: handleGetPaymentHistory, requireAuth: true },
];

function matchRoute(pathname: string, method: string): Route | null {
  for (const route of routes) {
    if (route.method === method && route.pattern.test(pathname)) {
      return route;
    }
  }
  return null;
}

// Health check handler
function handleHealthCheck(): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data: {
        status: 'healthy',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// Main fetch handler
async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  // Generate request ID
  const requestId = generateId();

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return handleCorsPreflightRequest(request, env);
  }

  // Health check endpoint
  if (pathname === '/api/v1/health' && method === 'GET') {
    const response = handleHealthCheck();
    return addCorsHeaders(response, request, env);
  }

  // Match route
  const route = matchRoute(pathname, method);

  if (!route) {
    const response = errorResponse('Not found', 404);
    return addCorsHeaders(response, request, env);
  }

  // Build request context
  const ctx: RequestContext = {
    env,
    requestId,
  };

  // Authenticate if required
  if (route.requireAuth) {
    // Try JWT token first
    let user = await verifyAuthToken(request, env);

    // Fall back to API key
    if (!user) {
      user = await verifyApiKey(request, env);
    }

    if (!user) {
      const response = errorResponse('Unauthorized', 401);
      return addCorsHeaders(response, request, env);
    }

    ctx.user = user;
  }

  try {
    // Execute handler
    const response = await route.handler(request, ctx);
    return addCorsHeaders(response, request, env);
  } catch (error) {
    console.error(`Error handling request ${requestId}:`, error);
    const response = errorResponse('Internal server error', 500);
    return addCorsHeaders(response, request, env);
  }
}

// Export fetch handler
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env);
  },
};
