// API service types

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

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  isCreator: boolean;
  walletBalance: number;
  emailVerified: boolean;
  createdAt: string;
}

export interface GptModel {
  id: string;
  name: string;
  description: string | null;
  shortDescription: string | null;
  category: string;
  tags: string[];
  modelType: string;
  thumbnailUrl: string | null;
  demoUrl: string | null;
  documentationUrl: string | null;
  isVerified: boolean;
  isFeatured: boolean;
  totalRentals: number;
  averageRating: number;
  ratingCount: number;
  creator?: {
    username: string;
    displayName: string | null;
  };
  pricingTiers?: PricingTier[];
  createdAt: string;
}

export interface PricingTier {
  id: string;
  name: string;
  description: string | null;
  pricePerHour: number;
  pricePerDay: number;
  pricePerMonth: number;
  pricePerRequest: number;
  includedRequests: number;
  maxConcurrentUsers: number;
  features: string[];
}

export interface Rental {
  id: string;
  modelId: string;
  modelName: string;
  thumbnailUrl: string | null;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  rentalType: 'hourly' | 'daily' | 'monthly' | 'pay_per_use';
  startsAt: string;
  endsAt: string | null;
  totalCost: number;
  requestsUsed: number;
  requestsLimit: number | null;
  autoRenew: boolean;
  createdAt: string;
}

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
}

export interface UserSubscription {
  id: string;
  planId: string;
  planName: string;
  tier: string;
  status: string;
  billingCycle: 'monthly' | 'yearly';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  features: string[];
}

export interface PredictionMarket {
  id: string;
  title: string;
  description: string | null;
  category: string;
  resolutionCriteria?: string;
  marketType: 'binary' | 'multiple';
  outcomes: string[];
  currentLiquidity: number;
  tradingVolume: number;
  status: 'open' | 'closed' | 'resolved' | 'cancelled';
  resolvesAt: string;
  resolvedAt: string | null;
  winningOutcome: string | null;
  isFeatured: boolean;
  creator?: { username: string };
  createdAt: string;
}

export interface MarketOutcome {
  id: string;
  name: string;
  description: string | null;
  probability: number;
  totalShares: number;
  currentPrice: number;
}

export interface MarketPosition {
  id: string;
  marketId: string;
  marketTitle: string;
  outcomeId: string;
  outcomeName: string;
  shares: number;
  averagePrice: number;
  currentPrice: number;
  totalCost: number;
  currentValue: number;
  realizedPnl: number;
}

export interface WalletTransaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'rental' | 'refund' | 'payout' | 'bonus';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  parentId: string | null;
}
