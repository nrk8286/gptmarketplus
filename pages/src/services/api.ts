// API service for making requests to the Worker API

import type { ApiResponse } from '../types';

const API_BASE_URL = '/api/v1';

class ApiService {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = API_BASE_URL;
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null): void {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();
      return data as ApiResponse<T>;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Auth endpoints
  async register(email: string, username: string, password: string, displayName?: string) {
    return this.request<{ token: string; user: unknown }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password, displayName }),
    });
  }

  async login(email: string, password: string) {
    return this.request<{ token: string; user: unknown }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getProfile() {
    return this.request<unknown>('/auth/profile');
  }

  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  // Models endpoints
  async getModels(params?: { category?: string; featured?: boolean; page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.featured) searchParams.set('featured', 'true');
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return this.request<{ models: unknown[]; pagination: unknown }>(`/models${query ? `?${query}` : ''}`);
  }

  async getFeaturedModels() {
    return this.request<{ models: unknown[] }>('/models/featured');
  }

  async getModel(id: string) {
    return this.request<unknown>(`/models/${id}`);
  }

  async getCategories() {
    return this.request<{ categories: unknown[] }>('/models/categories');
  }

  // Rentals endpoints
  async getRentals(status?: string) {
    const query = status ? `?status=${status}` : '';
    return this.request<{ rentals: unknown[] }>(`/rentals${query}`);
  }

  async getRental(id: string) {
    return this.request<unknown>(`/rentals/${id}`);
  }

  async createRental(modelId: string, pricingTierId: string, rentalType: string, paymentMethod: string) {
    return this.request<unknown>('/rentals', {
      method: 'POST',
      body: JSON.stringify({ modelId, pricingTierId, rentalType, paymentMethod }),
    });
  }

  async cancelRental(id: string) {
    return this.request('/rentals/' + id + '/cancel', { method: 'POST' });
  }

  // Subscription endpoints
  async getSubscriptionPlans() {
    return this.request<{ plans: unknown[] }>('/subscriptions/plans');
  }

  async getUserSubscription() {
    return this.request<{ subscription: unknown | null }>('/subscriptions');
  }

  async createSubscription(planId: string, billingCycle: 'monthly' | 'yearly') {
    return this.request<unknown>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ planId, billingCycle }),
    });
  }

  async cancelSubscription() {
    return this.request('/subscriptions/cancel', { method: 'POST' });
  }

  // Markets endpoints
  async getMarkets(params?: { category?: string; status?: string; featured?: boolean; page?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.featured) searchParams.set('featured', 'true');
    if (params?.page) searchParams.set('page', params.page.toString());
    
    const query = searchParams.toString();
    return this.request<{ markets: unknown[]; pagination: unknown }>(`/markets${query ? `?${query}` : ''}`);
  }

  async getMarket(id: string) {
    return this.request<unknown>(`/markets/${id}`);
  }

  async createMarket(data: {
    title: string;
    description?: string;
    category: string;
    resolutionCriteria: string;
    marketType?: 'binary' | 'multiple';
    outcomes?: string[];
    initialLiquidity?: number;
    resolvesAt: string;
  }) {
    return this.request<{ id: string }>('/markets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async placeTrade(marketId: string, outcomeId: string, tradeType: 'buy' | 'sell', amount: number) {
    return this.request<unknown>(`/markets/${marketId}/trade`, {
      method: 'POST',
      body: JSON.stringify({ outcomeId, tradeType, amount }),
    });
  }

  async getUserPositions() {
    return this.request<{ positions: unknown[] }>('/markets/positions');
  }

  // Wallet endpoints
  async getWallet() {
    return this.request<{ balance: number; currency: string }>('/wallet');
  }

  async getWalletTransactions(page?: number) {
    const query = page ? `?page=${page}` : '';
    return this.request<{ transactions: unknown[]; pagination: unknown }>(`/wallet/transactions${query}`);
  }

  async addFunds(amount: number) {
    return this.request<{ paymentId: string; amount: number; newBalance: number }>('/wallet/deposit', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  async withdrawFunds(amount: number) {
    return this.request<{ amount: number; newBalance: number }>('/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  async getPaymentHistory(page?: number) {
    const query = page ? `?page=${page}` : '';
    return this.request<{ payments: unknown[]; pagination: unknown }>(`/payments${query}`);
  }
}

export const api = new ApiService();
export default api;
