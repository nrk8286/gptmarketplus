import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

interface UseApiOptions<T> {
  initialData?: T;
  immediate?: boolean;
}

interface UseApiResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useApi<T>(
  fetcher: () => Promise<{ success: boolean; data?: T; error?: string }>,
  options: UseApiOptions<T> = {}
): UseApiResult<T> {
  const { initialData = null, immediate = true } = options;
  
  const [data, setData] = useState<T | null>(initialData);
  const [isLoading, setIsLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetcher();
      if (response.success && response.data !== undefined) {
        setData(response.data);
      } else {
        setError(response.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    if (immediate) {
      refetch();
    }
  }, [immediate, refetch]);

  return { data, isLoading, error, refetch };
}

// Specific hooks for common data fetching
export function useModels(params?: { category?: string; featured?: boolean; page?: number }) {
  return useApi(() => api.getModels(params), { immediate: true });
}

export function useFeaturedModels() {
  return useApi(() => api.getFeaturedModels());
}

export function useModel(id: string) {
  return useApi(() => api.getModel(id), { immediate: !!id });
}

export function useCategories() {
  return useApi(() => api.getCategories());
}

export function useRentals(status?: string) {
  return useApi(() => api.getRentals(status));
}

export function useSubscriptionPlans() {
  return useApi(() => api.getSubscriptionPlans());
}

export function useUserSubscription() {
  return useApi(() => api.getUserSubscription());
}

export function useMarkets(params?: { category?: string; status?: string; featured?: boolean }) {
  return useApi(() => api.getMarkets(params));
}

export function useMarket(id: string) {
  return useApi(() => api.getMarket(id), { immediate: !!id });
}

export function usePositions() {
  return useApi(() => api.getUserPositions());
}

export function useWallet() {
  return useApi(() => api.getWallet());
}

export function useWalletTransactions(page?: number) {
  return useApi(() => api.getWalletTransactions(page));
}

export default useApi;
