// Core shared types for GPT Marketplace Plus

// ============================================
// USER TYPES
// ============================================

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  stripeCustomerId: string | null;
  emailVerified: boolean;
  isAdmin: boolean;
  isCreator: boolean;
  walletBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserSession {
  id: string;
  userId: string;
  tokenHash: string;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface UserApiKey {
  id: string;
  userId: string;
  name: string;
  keyHash: string;
  permissions: string[];
  rateLimit: number;
  monthlyUsage: number;
  lastUsedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

// ============================================
// GPT MODEL TYPES
// ============================================

export interface GptModel {
  id: string;
  creatorId: string;
  name: string;
  description: string | null;
  shortDescription: string | null;
  category: string;
  tags: string[];
  modelType: string;
  apiEndpoint: string | null;
  systemPrompt: string | null;
  configuration: Record<string, unknown>;
  thumbnailUrl: string | null;
  demoUrl: string | null;
  documentationUrl: string | null;
  isPublic: boolean;
  isVerified: boolean;
  isFeatured: boolean;
  totalRentals: number;
  totalRevenue: number;
  averageRating: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GptPricingTier {
  id: string;
  modelId: string;
  name: string;
  description: string | null;
  pricePerHour: number;
  pricePerDay: number;
  pricePerMonth: number;
  pricePerRequest: number;
  includedRequests: number;
  maxConcurrentUsers: number;
  features: string[];
  isActive: boolean;
  createdAt: string;
}

export interface GptRental {
  id: string;
  userId: string;
  modelId: string;
  pricingTierId: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  rentalType: 'hourly' | 'daily' | 'monthly' | 'pay_per_use';
  startsAt: string;
  endsAt: string | null;
  totalCost: number;
  requestsUsed: number;
  requestsLimit: number | null;
  autoRenew: boolean;
  paymentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GptUsageLog {
  id: string;
  rentalId: string;
  userId: string;
  modelId: string;
  requestType: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number | null;
  cost: number;
  status: 'success' | 'error';
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface GptReview {
  id: string;
  modelId: string;
  userId: string;
  rentalId: string | null;
  rating: number;
  title: string | null;
  content: string | null;
  helpfulCount: number;
  isVerifiedPurchase: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// SUBSCRIPTION TYPES
// ============================================

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  tier: 'free' | 'basic' | 'pro' | 'enterprise';
  priceMonthly: number;
  priceYearly: number | null;
  features: string[];
  apiCallsLimit: number;
  modelsAccessLimit: number;
  storageLimitMb: number;
  prioritySupport: boolean;
  isActive: boolean;
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
  createdAt: string;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  stripeSubscriptionId: string | null;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  billingCycle: 'monthly' | 'yearly';
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// PAYMENT TYPES
// ============================================

export interface Payment {
  id: string;
  userId: string;
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  paymentMethod: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  refundedAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'rental' | 'refund' | 'payout' | 'bonus';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
}

export interface CreatorPayout {
  id: string;
  creatorId: string;
  stripeTransferId: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payoutMethod: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  itemsCount: number;
  createdAt: string;
  processedAt: string | null;
}

// ============================================
// PREDICTION MARKET TYPES
// ============================================

export interface PredictionMarket {
  id: string;
  creatorId: string;
  title: string;
  description: string | null;
  category: string;
  resolutionCriteria: string;
  marketType: 'binary' | 'multiple';
  outcomes: string[];
  initialLiquidity: number;
  currentLiquidity: number;
  tradingVolume: number;
  status: 'open' | 'closed' | 'resolved' | 'cancelled';
  resolutionSource: string | null;
  resolvesAt: string;
  resolvedAt: string | null;
  winningOutcome: string | null;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MarketOutcome {
  id: string;
  marketId: string;
  name: string;
  description: string | null;
  probability: number;
  totalShares: number;
  currentPrice: number;
  createdAt: string;
}

export interface MarketPosition {
  id: string;
  userId: string;
  marketId: string;
  outcomeId: string;
  shares: number;
  averagePrice: number;
  totalCost: number;
  realizedPnl: number;
  createdAt: string;
  updatedAt: string;
}

export interface MarketTrade {
  id: string;
  userId: string;
  marketId: string;
  outcomeId: string;
  positionId: string | null;
  tradeType: 'buy' | 'sell';
  shares: number;
  pricePerShare: number;
  totalAmount: number;
  fee: number;
  createdAt: string;
}

// ============================================
// PLATFORM TYPES
// ============================================

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxUses: number | null;
  currentUses: number;
  minPurchaseAmount: number;
  appliesTo: string;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

// ============================================
// API TYPES
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// MONETIZATION TYPES
// ============================================

export interface PlatformFees {
  rentalFeePercentage: number;
  subscriptionFeePercentage: number;
  marketTradingFeePercentage: number;
  apiUsageFeePerRequest: number;
  minimumWithdrawal: number;
  payoutProcessingFee: number;
}

export interface MonetizationConfig {
  fees: PlatformFees;
  subscriptionTiers: SubscriptionPlan[];
  apiPricing: {
    freeMonthlyLimit: number;
    pricePerThousandRequests: number;
  };
}
