import { useState, useEffect, useCallback, useRef } from 'react';
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
  const requestSequence = useRef(0);

  const refetch = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetcher();
      if (requestId !== requestSequence.current) return;
      if (response.success && response.data !== undefined) {
        setData(response.data);
      } else {
        setError(response.error || 'Failed to fetch data');
      }
    } catch (err) {
      if (requestId === requestSequence.current) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      if (requestId === requestSequence.current) setIsLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    if (immediate) {
      refetch();
    } else {
      setIsLoading(false);
    }
    // Ignore results from a previous filter, a superseded refresh, or an unmounted page.
    return () => { requestSequence.current += 1; };
  }, [immediate, refetch]);

  return { data, isLoading, error, refetch };
}

// Specific hooks for common data fetching
export function useModels(params?: { category?: string; featured?: boolean; page?: number }) {
  const { category, featured, page } = params ?? {};
  const fetcher = useCallback(() => api.getModels({ category, featured, page }), [category, featured, page]);
  return useApi(fetcher);
}

export function useFeaturedModels() {
  return useApi(useCallback(() => api.getFeaturedModels(), []));
}

export function useModel(id: string) {
  return useApi(useCallback(() => api.getModel(id), [id]), { immediate: !!id });
}

export function useCategories() {
  return useApi(useCallback(() => api.getCategories(), []));
}

export function useRentals(status?: string) {
  return useApi(useCallback(() => api.getRentals(status), [status]));
}

export function useSubscriptionPlans() {
  return useApi(useCallback(() => api.getSubscriptionPlans(), []));
}

export function useUserSubscription() {
  return useApi(useCallback(() => api.getUserSubscription(), []));
}

export function useMarkets(params?: { category?: string; status?: string; featured?: boolean }) {
  const { category, status, featured } = params ?? {};
  const fetcher = useCallback(() => api.getMarkets({ category, status, featured }), [category, status, featured]);
  return useApi(fetcher);
}

export function useMarket(id: string) {
  return useApi(useCallback(() => api.getMarket(id), [id]), { immediate: !!id });
}

export function usePositions() {
  return useApi(useCallback(() => api.getUserPositions(), []));
}

export function useWallet() {
  return useApi(useCallback(() => api.getWallet(), []));
}

export function useWalletTransactions(page?: number) {
  return useApi(useCallback(() => api.getWalletTransactions(page), [page]));
}

export default useApi;
