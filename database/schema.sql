-- GPT Marketplace Plus Database Schema
-- 29+ tables for users, GPT rentals, subscriptions, payments, prediction markets

-- ============================================
-- CORE USER MANAGEMENT (Tables 1-4)
-- ============================================

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    stripe_customer_id TEXT,
    email_verified INTEGER DEFAULT 0,
    is_admin INTEGER DEFAULT 0,
    is_creator INTEGER DEFAULT 0,
    wallet_balance REAL DEFAULT 0.0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 2. User sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 3. User API keys
CREATE TABLE IF NOT EXISTS user_api_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    permissions TEXT DEFAULT '[]',
    rate_limit INTEGER DEFAULT 1000,
    monthly_usage INTEGER DEFAULT 0,
    last_used_at TEXT,
    expires_at TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 4. User notifications
CREATE TABLE IF NOT EXISTS user_notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    data TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- GPT MODELS & RENTALS (Tables 5-10)
-- ============================================

-- 5. GPT Models listing
CREATE TABLE IF NOT EXISTS gpt_models (
    id TEXT PRIMARY KEY,
    creator_id TEXT NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    description TEXT,
    short_description TEXT,
    category TEXT NOT NULL,
    tags TEXT DEFAULT '[]',
    model_type TEXT NOT NULL,
    api_endpoint TEXT,
    system_prompt TEXT,
    configuration TEXT DEFAULT '{}',
    thumbnail_url TEXT,
    demo_url TEXT,
    documentation_url TEXT,
    is_public INTEGER DEFAULT 1,
    is_verified INTEGER DEFAULT 0,
    is_featured INTEGER DEFAULT 0,
    total_rentals INTEGER DEFAULT 0,
    total_revenue REAL DEFAULT 0.0,
    average_rating REAL DEFAULT 0.0,
    rating_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 6. GPT Model versions
CREATE TABLE IF NOT EXISTS gpt_model_versions (
    id TEXT PRIMARY KEY,
    model_id TEXT NOT NULL REFERENCES gpt_models(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    changelog TEXT,
    configuration TEXT DEFAULT '{}',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 7. GPT Pricing tiers
CREATE TABLE IF NOT EXISTS gpt_pricing_tiers (
    id TEXT PRIMARY KEY,
    model_id TEXT NOT NULL REFERENCES gpt_models(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price_per_hour REAL DEFAULT 0.0,
    price_per_day REAL DEFAULT 0.0,
    price_per_month REAL DEFAULT 0.0,
    price_per_request REAL DEFAULT 0.0,
    included_requests INTEGER DEFAULT 0,
    max_concurrent_users INTEGER DEFAULT 1,
    features TEXT DEFAULT '[]',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 8. GPT Rentals (active and historical)
CREATE TABLE IF NOT EXISTS gpt_rentals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    model_id TEXT NOT NULL REFERENCES gpt_models(id),
    pricing_tier_id TEXT NOT NULL REFERENCES gpt_pricing_tiers(id),
    status TEXT DEFAULT 'active',
    rental_type TEXT NOT NULL,
    starts_at TEXT NOT NULL,
    ends_at TEXT,
    total_cost REAL NOT NULL,
    requests_used INTEGER DEFAULT 0,
    requests_limit INTEGER,
    auto_renew INTEGER DEFAULT 0,
    payment_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 9. GPT Usage logs
CREATE TABLE IF NOT EXISTS gpt_usage_logs (
    id TEXT PRIMARY KEY,
    rental_id TEXT NOT NULL REFERENCES gpt_rentals(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    model_id TEXT NOT NULL REFERENCES gpt_models(id),
    request_type TEXT NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    latency_ms INTEGER,
    cost REAL DEFAULT 0.0,
    status TEXT DEFAULT 'success',
    error_message TEXT,
    metadata TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
);

-- 10. GPT Reviews
CREATE TABLE IF NOT EXISTS gpt_reviews (
    id TEXT PRIMARY KEY,
    model_id TEXT NOT NULL REFERENCES gpt_models(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    rental_id TEXT REFERENCES gpt_rentals(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    content TEXT,
    helpful_count INTEGER DEFAULT 0,
    is_verified_purchase INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- SUBSCRIPTIONS (Tables 11-14)
-- ============================================

-- 11. Subscription plans
CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    tier TEXT NOT NULL,
    price_monthly REAL NOT NULL,
    price_yearly REAL,
    features TEXT DEFAULT '[]',
    api_calls_limit INTEGER DEFAULT 0,
    models_access_limit INTEGER DEFAULT 0,
    storage_limit_mb INTEGER DEFAULT 0,
    priority_support INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    stripe_price_id_monthly TEXT,
    stripe_price_id_yearly TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 12. User subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
    stripe_subscription_id TEXT,
    status TEXT DEFAULT 'active',
    billing_cycle TEXT DEFAULT 'monthly',
    current_period_start TEXT,
    current_period_end TEXT,
    cancel_at_period_end INTEGER DEFAULT 0,
    canceled_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 13. Subscription usage tracking
CREATE TABLE IF NOT EXISTS subscription_usage (
    id TEXT PRIMARY KEY,
    subscription_id TEXT NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    api_calls_used INTEGER DEFAULT 0,
    models_accessed INTEGER DEFAULT 0,
    storage_used_mb REAL DEFAULT 0.0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 14. Subscription benefits
CREATE TABLE IF NOT EXISTS subscription_benefits (
    id TEXT PRIMARY KEY,
    subscription_id TEXT NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    benefit_type TEXT NOT NULL,
    benefit_value TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- PAYMENTS & TRANSACTIONS (Tables 15-19)
-- ============================================

-- 15. Payments
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    stripe_payment_intent_id TEXT,
    stripe_charge_id TEXT,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'usd',
    status TEXT DEFAULT 'pending',
    payment_method TEXT,
    description TEXT,
    metadata TEXT DEFAULT '{}',
    refunded_amount REAL DEFAULT 0.0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 16. Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    stripe_invoice_id TEXT,
    subscription_id TEXT REFERENCES user_subscriptions(id),
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'usd',
    status TEXT DEFAULT 'draft',
    due_date TEXT,
    paid_at TEXT,
    invoice_pdf_url TEXT,
    line_items TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now'))
);

-- 17. Wallet transactions
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    balance_before REAL NOT NULL,
    balance_after REAL NOT NULL,
    description TEXT,
    reference_type TEXT,
    reference_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 18. Payouts (for creators)
CREATE TABLE IF NOT EXISTS creator_payouts (
    id TEXT PRIMARY KEY,
    creator_id TEXT NOT NULL REFERENCES users(id),
    stripe_transfer_id TEXT,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'usd',
    status TEXT DEFAULT 'pending',
    payout_method TEXT,
    period_start TEXT,
    period_end TEXT,
    items_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    processed_at TEXT
);

-- 19. Revenue shares
CREATE TABLE IF NOT EXISTS revenue_shares (
    id TEXT PRIMARY KEY,
    rental_id TEXT REFERENCES gpt_rentals(id),
    payment_id TEXT REFERENCES payments(id),
    creator_id TEXT NOT NULL REFERENCES users(id),
    gross_amount REAL NOT NULL,
    platform_fee REAL NOT NULL,
    creator_amount REAL NOT NULL,
    payout_id TEXT REFERENCES creator_payouts(id),
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- PREDICTION MARKETS (Tables 20-25)
-- ============================================

-- 20. Markets
CREATE TABLE IF NOT EXISTS prediction_markets (
    id TEXT PRIMARY KEY,
    creator_id TEXT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    resolution_criteria TEXT NOT NULL,
    market_type TEXT DEFAULT 'binary',
    outcomes TEXT DEFAULT '[]',
    initial_liquidity REAL DEFAULT 0.0,
    current_liquidity REAL DEFAULT 0.0,
    trading_volume REAL DEFAULT 0.0,
    status TEXT DEFAULT 'open',
    resolution_source TEXT,
    resolves_at TEXT NOT NULL,
    resolved_at TEXT,
    winning_outcome TEXT,
    is_featured INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 21. Market outcomes
CREATE TABLE IF NOT EXISTS market_outcomes (
    id TEXT PRIMARY KEY,
    market_id TEXT NOT NULL REFERENCES prediction_markets(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    probability REAL DEFAULT 0.5,
    total_shares REAL DEFAULT 0.0,
    current_price REAL DEFAULT 0.5,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 22. Market positions
CREATE TABLE IF NOT EXISTS market_positions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    market_id TEXT NOT NULL REFERENCES prediction_markets(id),
    outcome_id TEXT NOT NULL REFERENCES market_outcomes(id),
    shares REAL NOT NULL,
    average_price REAL NOT NULL,
    total_cost REAL NOT NULL,
    realized_pnl REAL DEFAULT 0.0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 23. Market trades
CREATE TABLE IF NOT EXISTS market_trades (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    market_id TEXT NOT NULL REFERENCES prediction_markets(id),
    outcome_id TEXT NOT NULL REFERENCES market_outcomes(id),
    position_id TEXT REFERENCES market_positions(id),
    trade_type TEXT NOT NULL,
    shares REAL NOT NULL,
    price_per_share REAL NOT NULL,
    total_amount REAL NOT NULL,
    fee REAL DEFAULT 0.0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 24. Market comments
CREATE TABLE IF NOT EXISTS market_comments (
    id TEXT PRIMARY KEY,
    market_id TEXT NOT NULL REFERENCES prediction_markets(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    parent_id TEXT REFERENCES market_comments(id),
    content TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 25. Market liquidity events
CREATE TABLE IF NOT EXISTS market_liquidity_events (
    id TEXT PRIMARY KEY,
    market_id TEXT NOT NULL REFERENCES prediction_markets(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    event_type TEXT NOT NULL,
    amount REAL NOT NULL,
    shares_received TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- API & PLATFORM (Tables 26-29+)
-- ============================================

-- 26. API rate limits
CREATE TABLE IF NOT EXISTS api_rate_limits (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    identifier_type TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    window_start TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(identifier, endpoint, window_start)
);

-- 27. Platform settings
CREATE TABLE IF NOT EXISTS platform_settings (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    is_public INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 28. Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    old_value TEXT,
    new_value TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 29. Feature flags
CREATE TABLE IF NOT EXISTS feature_flags (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_enabled INTEGER DEFAULT 0,
    rollout_percentage INTEGER DEFAULT 0,
    allowed_users TEXT DEFAULT '[]',
    metadata TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 30. Categories
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT,
    parent_id TEXT REFERENCES categories(id),
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 31. Tags
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    usage_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 32. Favorites/Wishlist
CREATE TABLE IF NOT EXISTS user_favorites (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    model_id TEXT NOT NULL REFERENCES gpt_models(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, model_id)
);

-- 33. Promotional codes
CREATE TABLE IF NOT EXISTS promo_codes (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL,
    discount_value REAL NOT NULL,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    min_purchase_amount REAL DEFAULT 0.0,
    applies_to TEXT DEFAULT 'all',
    starts_at TEXT,
    expires_at TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 34. Promo code redemptions
CREATE TABLE IF NOT EXISTS promo_redemptions (
    id TEXT PRIMARY KEY,
    promo_id TEXT NOT NULL REFERENCES promo_codes(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    payment_id TEXT REFERENCES payments(id),
    discount_amount REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token_hash);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON user_api_keys(key_hash);

CREATE INDEX IF NOT EXISTS idx_gpt_models_creator ON gpt_models(creator_id);
CREATE INDEX IF NOT EXISTS idx_gpt_models_category ON gpt_models(category);
CREATE INDEX IF NOT EXISTS idx_gpt_models_featured ON gpt_models(is_featured);

CREATE INDEX IF NOT EXISTS idx_rentals_user ON gpt_rentals(user_id);
CREATE INDEX IF NOT EXISTS idx_rentals_model ON gpt_rentals(model_id);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON gpt_rentals(status);

CREATE INDEX IF NOT EXISTS idx_usage_rental ON gpt_usage_logs(rental_id);
CREATE INDEX IF NOT EXISTS idx_usage_created ON gpt_usage_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON user_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe ON payments(stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_markets_status ON prediction_markets(status);
CREATE INDEX IF NOT EXISTS idx_markets_category ON prediction_markets(category);
CREATE INDEX IF NOT EXISTS idx_markets_resolves ON prediction_markets(resolves_at);

CREATE INDEX IF NOT EXISTS idx_positions_user ON market_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_market ON market_positions(market_id);

CREATE INDEX IF NOT EXISTS idx_trades_user ON market_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_market ON market_trades(market_id);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON api_rate_limits(identifier, endpoint, window_start);
