// Database service with parameterized queries

import { generateId } from '../utils/helpers.js';

// ============================================
// USER OPERATIONS
// ============================================

export interface CreateUserParams {
  email: string;
  username: string;
  passwordHash: string;
  displayName?: string;
}

export async function createUser(
  db: D1Database,
  params: CreateUserParams
): Promise<string> {
  const id = generateId();
  
  await db.prepare(`
    INSERT INTO users (id, email, username, password_hash, display_name)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    id,
    params.email,
    params.username,
    params.passwordHash,
    params.displayName || null
  ).run();
  
  return id;
}

export async function getUserById(
  db: D1Database,
  id: string
): Promise<Record<string, unknown> | null> {
  const result = await db.prepare(`
    SELECT id, email, username, display_name, avatar_url, bio,
           stripe_customer_id, email_verified, is_admin, is_creator,
           wallet_balance, created_at, updated_at
    FROM users WHERE id = ?
  `).bind(id).first();
  
  return result;
}

export async function getUserByEmail(
  db: D1Database,
  email: string
): Promise<Record<string, unknown> | null> {
  const result = await db.prepare(`
    SELECT id, email, username, password_hash, display_name, avatar_url,
           bio, stripe_customer_id, email_verified, is_admin, is_creator,
           wallet_balance, created_at, updated_at
    FROM users WHERE email = ?
  `).bind(email).first();
  
  return result;
}

export async function updateUserWallet(
  db: D1Database,
  userId: string,
  amount: number,
  type: string,
  description: string,
  referenceType?: string,
  referenceId?: string
): Promise<void> {
  const transactionId = generateId();
  
  // Get current balance
  const user = await db.prepare(`
    SELECT wallet_balance FROM users WHERE id = ?
  `).bind(userId).first();
  
  if (!user) {
    throw new Error('User not found');
  }
  
  const balanceBefore = user.wallet_balance as number;
  const balanceAfter = balanceBefore + amount;
  
  // Update wallet balance
  await db.prepare(`
    UPDATE users SET wallet_balance = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(balanceAfter, userId).run();
  
  // Record transaction
  await db.prepare(`
    INSERT INTO wallet_transactions 
    (id, user_id, type, amount, balance_before, balance_after, description, reference_type, reference_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    transactionId,
    userId,
    type,
    amount,
    balanceBefore,
    balanceAfter,
    description,
    referenceType || null,
    referenceId || null
  ).run();
}

// ============================================
// GPT MODEL OPERATIONS
// ============================================

export interface CreateGptModelParams {
  creatorId: string;
  name: string;
  description?: string;
  shortDescription?: string;
  category: string;
  tags?: string[];
  modelType: string;
  apiEndpoint?: string;
  systemPrompt?: string;
  configuration?: Record<string, unknown>;
}

export async function createGptModel(
  db: D1Database,
  params: CreateGptModelParams
): Promise<string> {
  const id = generateId();
  
  await db.prepare(`
    INSERT INTO gpt_models 
    (id, creator_id, name, description, short_description, category, tags, model_type, api_endpoint, system_prompt, configuration)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    params.creatorId,
    params.name,
    params.description || null,
    params.shortDescription || null,
    params.category,
    JSON.stringify(params.tags || []),
    params.modelType,
    params.apiEndpoint || null,
    params.systemPrompt || null,
    JSON.stringify(params.configuration || {})
  ).run();
  
  return id;
}

export async function getGptModels(
  db: D1Database,
  options: {
    category?: string;
    isPublic?: boolean;
    isFeatured?: boolean;
    creatorId?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<{ models: Record<string, unknown>[]; total: number }> {
  let query = 'SELECT * FROM gpt_models WHERE 1=1';
  let countQuery = 'SELECT COUNT(*) as count FROM gpt_models WHERE 1=1';
  const params: unknown[] = [];
  
  if (options.category) {
    query += ' AND category = ?';
    countQuery += ' AND category = ?';
    params.push(options.category);
  }
  
  if (options.isPublic !== undefined) {
    query += ' AND is_public = ?';
    countQuery += ' AND is_public = ?';
    params.push(options.isPublic ? 1 : 0);
  }
  
  if (options.isFeatured !== undefined) {
    query += ' AND is_featured = ?';
    countQuery += ' AND is_featured = ?';
    params.push(options.isFeatured ? 1 : 0);
  }
  
  if (options.creatorId) {
    query += ' AND creator_id = ?';
    countQuery += ' AND creator_id = ?';
    params.push(options.creatorId);
  }
  
  const sortBy = options.sortBy || 'created_at';
  const sortOrder = options.sortOrder || 'desc';
  query += ` ORDER BY ${sortBy} ${sortOrder}`;
  
  const limit = options.limit || 20;
  const offset = options.offset || 0;
  query += ' LIMIT ? OFFSET ?';
  
  // Get count
  let countStmt = db.prepare(countQuery);
  for (let i = 0; i < params.length; i++) {
    countStmt = countStmt.bind(params[i]);
  }
  const countResult = await countStmt.first();
  const total = (countResult?.count as number) || 0;
  
  // Get models
  let stmt = db.prepare(query);
  for (let i = 0; i < params.length; i++) {
    stmt = stmt.bind(params[i]);
  }
  stmt = stmt.bind(limit, offset);
  
  const result = await stmt.all();
  
  return {
    models: result.results || [],
    total,
  };
}

export async function getGptModelById(
  db: D1Database,
  id: string
): Promise<Record<string, unknown> | null> {
  const result = await db.prepare(`
    SELECT m.*, u.username as creator_username, u.display_name as creator_display_name
    FROM gpt_models m
    JOIN users u ON m.creator_id = u.id
    WHERE m.id = ?
  `).bind(id).first();
  
  return result;
}

// ============================================
// RENTAL OPERATIONS
// ============================================

export interface CreateRentalParams {
  userId: string;
  modelId: string;
  pricingTierId: string;
  rentalType: 'hourly' | 'daily' | 'monthly' | 'pay_per_use';
  startsAt: string;
  endsAt?: string;
  totalCost: number;
  requestsLimit?: number;
  paymentId?: string;
}

export async function createRental(
  db: D1Database,
  params: CreateRentalParams
): Promise<string> {
  const id = generateId();
  
  await db.prepare(`
    INSERT INTO gpt_rentals 
    (id, user_id, model_id, pricing_tier_id, rental_type, starts_at, ends_at, total_cost, requests_limit, payment_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    params.userId,
    params.modelId,
    params.pricingTierId,
    params.rentalType,
    params.startsAt,
    params.endsAt || null,
    params.totalCost,
    params.requestsLimit || null,
    params.paymentId || null
  ).run();
  
  // Update model rental count
  await db.prepare(`
    UPDATE gpt_models 
    SET total_rentals = total_rentals + 1, 
        total_revenue = total_revenue + ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).bind(params.totalCost, params.modelId).run();
  
  return id;
}

export async function getUserRentals(
  db: D1Database,
  userId: string,
  status?: string
): Promise<Record<string, unknown>[]> {
  let query = `
    SELECT r.*, m.name as model_name, m.thumbnail_url
    FROM gpt_rentals r
    JOIN gpt_models m ON r.model_id = m.id
    WHERE r.user_id = ?
  `;
  
  if (status) {
    query += ' AND r.status = ?';
    const result = await db.prepare(query).bind(userId, status).all();
    return result.results || [];
  }
  
  query += ' ORDER BY r.created_at DESC';
  const result = await db.prepare(query).bind(userId).all();
  return result.results || [];
}

// ============================================
// SUBSCRIPTION OPERATIONS
// ============================================

export async function getSubscriptionPlans(
  db: D1Database
): Promise<Record<string, unknown>[]> {
  const result = await db.prepare(`
    SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY price_monthly ASC
  `).all();
  
  return result.results || [];
}

export async function getUserSubscription(
  db: D1Database,
  userId: string
): Promise<Record<string, unknown> | null> {
  const result = await db.prepare(`
    SELECT s.*, p.name as plan_name, p.tier, p.features
    FROM user_subscriptions s
    JOIN subscription_plans p ON s.plan_id = p.id
    WHERE s.user_id = ? AND s.status = 'active'
  `).bind(userId).first();
  
  return result;
}

export interface CreateSubscriptionParams {
  userId: string;
  planId: string;
  stripeSubscriptionId?: string;
  billingCycle: 'monthly' | 'yearly';
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

export async function createSubscription(
  db: D1Database,
  params: CreateSubscriptionParams
): Promise<string> {
  const id = generateId();
  
  await db.prepare(`
    INSERT INTO user_subscriptions 
    (id, user_id, plan_id, stripe_subscription_id, billing_cycle, current_period_start, current_period_end)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    params.userId,
    params.planId,
    params.stripeSubscriptionId || null,
    params.billingCycle,
    params.currentPeriodStart,
    params.currentPeriodEnd
  ).run();
  
  return id;
}

// ============================================
// PREDICTION MARKET OPERATIONS
// ============================================

export interface CreateMarketParams {
  creatorId: string;
  title: string;
  description?: string;
  category: string;
  resolutionCriteria: string;
  marketType?: 'binary' | 'multiple';
  outcomes: string[];
  initialLiquidity: number;
  resolvesAt: string;
}

export async function createPredictionMarket(
  db: D1Database,
  params: CreateMarketParams
): Promise<string> {
  const id = generateId();
  
  await db.prepare(`
    INSERT INTO prediction_markets 
    (id, creator_id, title, description, category, resolution_criteria, market_type, outcomes, initial_liquidity, current_liquidity, resolves_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    params.creatorId,
    params.title,
    params.description || null,
    params.category,
    params.resolutionCriteria,
    params.marketType || 'binary',
    JSON.stringify(params.outcomes),
    params.initialLiquidity,
    params.initialLiquidity,
    params.resolvesAt
  ).run();
  
  // Create outcomes
  for (let i = 0; i < params.outcomes.length; i++) {
    const outcomeId = generateId();
    const initialProbability = 1 / params.outcomes.length;
    
    await db.prepare(`
      INSERT INTO market_outcomes (id, market_id, name, probability, current_price)
      VALUES (?, ?, ?, ?, ?)
    `).bind(outcomeId, id, params.outcomes[i], initialProbability, initialProbability).run();
  }
  
  return id;
}

export async function getPredictionMarkets(
  db: D1Database,
  options: {
    category?: string;
    status?: string;
    isFeatured?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ markets: Record<string, unknown>[]; total: number }> {
  let query = 'SELECT * FROM prediction_markets WHERE 1=1';
  let countQuery = 'SELECT COUNT(*) as count FROM prediction_markets WHERE 1=1';
  const params: unknown[] = [];
  
  if (options.category) {
    query += ' AND category = ?';
    countQuery += ' AND category = ?';
    params.push(options.category);
  }
  
  if (options.status) {
    query += ' AND status = ?';
    countQuery += ' AND status = ?';
    params.push(options.status);
  }
  
  if (options.isFeatured !== undefined) {
    query += ' AND is_featured = ?';
    countQuery += ' AND is_featured = ?';
    params.push(options.isFeatured ? 1 : 0);
  }
  
  query += ' ORDER BY created_at DESC';
  
  const limit = options.limit || 20;
  const offset = options.offset || 0;
  query += ' LIMIT ? OFFSET ?';
  
  // Get count
  let countStmt = db.prepare(countQuery);
  for (let i = 0; i < params.length; i++) {
    countStmt = countStmt.bind(params[i]);
  }
  const countResult = await countStmt.first();
  const total = (countResult?.count as number) || 0;
  
  // Get markets
  let stmt = db.prepare(query);
  for (let i = 0; i < params.length; i++) {
    stmt = stmt.bind(params[i]);
  }
  stmt = stmt.bind(limit, offset);
  
  const result = await stmt.all();
  
  return {
    markets: result.results || [],
    total,
  };
}

// ============================================
// PAYMENT OPERATIONS
// ============================================

export interface CreatePaymentParams {
  userId: string;
  amount: number;
  currency?: string;
  stripePaymentIntentId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export async function createPayment(
  db: D1Database,
  params: CreatePaymentParams
): Promise<string> {
  const id = generateId();
  
  await db.prepare(`
    INSERT INTO payments 
    (id, user_id, stripe_payment_intent_id, amount, currency, description, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    params.userId,
    params.stripePaymentIntentId || null,
    params.amount,
    params.currency || 'usd',
    params.description || null,
    JSON.stringify(params.metadata || {})
  ).run();
  
  return id;
}

export async function updatePaymentStatus(
  db: D1Database,
  paymentId: string,
  status: string,
  chargeId?: string
): Promise<void> {
  await db.prepare(`
    UPDATE payments 
    SET status = ?, stripe_charge_id = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(status, chargeId || null, paymentId).run();
}

// ============================================
// USAGE LOGGING
// ============================================

export interface LogUsageParams {
  rentalId: string;
  userId: string;
  modelId: string;
  requestType: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  cost?: number;
  status?: 'success' | 'error';
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export async function logUsage(
  db: D1Database,
  params: LogUsageParams
): Promise<string> {
  const id = generateId();
  
  await db.prepare(`
    INSERT INTO gpt_usage_logs 
    (id, rental_id, user_id, model_id, request_type, input_tokens, output_tokens, latency_ms, cost, status, error_message, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    params.rentalId,
    params.userId,
    params.modelId,
    params.requestType,
    params.inputTokens || 0,
    params.outputTokens || 0,
    params.latencyMs || null,
    params.cost || 0,
    params.status || 'success',
    params.errorMessage || null,
    JSON.stringify(params.metadata || {})
  ).run();
  
  // Update rental usage count
  await db.prepare(`
    UPDATE gpt_rentals 
    SET requests_used = requests_used + 1, updated_at = datetime('now')
    WHERE id = ?
  `).bind(params.rentalId).run();
  
  return id;
}

// ============================================
// RATE LIMITING
// ============================================

export async function checkRateLimit(
  db: D1Database,
  identifier: string,
  identifierType: string,
  endpoint: string,
  limit: number,
  windowMinutes: number = 1
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  
  // Get current count
  const result = await db.prepare(`
    SELECT SUM(request_count) as total
    FROM api_rate_limits
    WHERE identifier = ? AND identifier_type = ? AND endpoint = ? AND window_start >= ?
  `).bind(identifier, identifierType, endpoint, windowStart).first();
  
  const currentCount = (result?.total as number) || 0;
  const remaining = Math.max(0, limit - currentCount);
  const resetAt = new Date(Date.now() + windowMinutes * 60 * 1000);
  
  if (currentCount >= limit) {
    return { allowed: false, remaining: 0, resetAt };
  }
  
  // Increment count
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO api_rate_limits (id, identifier, identifier_type, endpoint, window_start, request_count)
    VALUES (?, ?, ?, ?, ?, 1)
    ON CONFLICT(identifier, endpoint, window_start) DO UPDATE SET request_count = request_count + 1
  `).bind(generateId(), identifier, identifierType, endpoint, now).run();
  
  return { allowed: true, remaining: remaining - 1, resetAt };
}
