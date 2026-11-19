// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../services/api';
import { useFeaturedModels, useMarket, useMarkets, useModels } from './useApi';

vi.mock('../services/api', () => ({
  default: {
    getFeaturedModels: vi.fn(),
    getMarkets: vi.fn(),
    getModels: vi.fn(),
    getMarket: vi.fn(),
  },
}));

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

describe('API hooks', () => {
  it('finishes loading without starting another request after a successful response', async () => {
    const data = { models: [] };
    // A second request stays pending so the regression fails without an infinite loop.
    vi.mocked(api.getFeaturedModels)
      .mockResolvedValueOnce({ success: true, data })
      .mockImplementation(() => new Promise(() => {}));

    const { result, rerender } = renderHook(() => useFeaturedModels());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    rerender();

    expect(result.current.data).toEqual(data);
    expect(api.getFeaturedModels).toHaveBeenCalledTimes(1);
  });

  it('refetches model filters only when their values change', async () => {
    vi.mocked(api.getModels).mockImplementation(() => new Promise(() => {}));
    const { rerender } = renderHook(
      ({ page }) => useModels({ category: 'text', featured: true, page }),
      { initialProps: { page: 1 } },
    );

    expect(api.getModels).toHaveBeenCalledTimes(1);
    rerender({ page: 1 });
    expect(api.getModels).toHaveBeenCalledTimes(1);
    rerender({ page: 2 });
    expect(api.getModels).toHaveBeenCalledTimes(2);
    expect(api.getModels).toHaveBeenLastCalledWith({ category: 'text', featured: true, page: 2 });
  });

  it('keeps inline market filters stable and refreshes when the status changes', () => {
    vi.mocked(api.getMarkets).mockImplementation(() => new Promise(() => {}));
    const { rerender } = renderHook(
      ({ status }) => useMarkets({ category: 'science', featured: true, status }),
      { initialProps: { status: 'open' } },
    );

    rerender({ status: 'open' });
    expect(api.getMarkets).toHaveBeenCalledTimes(1);
    rerender({ status: 'closed' });
    expect(api.getMarkets).toHaveBeenCalledTimes(2);
    expect(api.getMarkets).toHaveBeenLastCalledWith({ category: 'science', featured: true, status: 'closed' });
  });

  it('defers a detail request until an ID exists and still supports manual refresh', async () => {
    vi.mocked(api.getMarket).mockResolvedValue({ success: true, data: { id: 'market1' } });
    const { result, rerender } = renderHook(({ id }) => useMarket(id), { initialProps: { id: '' } });
    expect(api.getMarket).not.toHaveBeenCalled();
    rerender({ id: 'market1' });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(api.getMarket).toHaveBeenCalledTimes(1);

    await act(async () => result.current.refetch());
    expect(api.getMarket).toHaveBeenCalledTimes(2);
  });

  it('keeps the latest detail result when an older request finishes last', async () => {
    let finishOld!: (value: { success: boolean; data: { id: string } }) => void;
    vi.mocked(api.getMarket)
      .mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }))
      .mockResolvedValueOnce({ success: true, data: { id: 'new' } });
    const { result, rerender } = renderHook(({ id }) => useMarket(id), { initialProps: { id: 'old' } });
    rerender({ id: 'new' });
    await waitFor(() => expect(result.current.data).toEqual({ id: 'new' }));

    await act(async () => finishOld({ success: true, data: { id: 'old' } }));
    expect(result.current.data).toEqual({ id: 'new' });
    expect(result.current.isLoading).toBe(false);
  });
});
