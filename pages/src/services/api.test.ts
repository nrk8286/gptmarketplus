import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiService } from './api';

function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe('ApiService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('localStorage', createStorage());
  });

  it('persists and sends the authentication token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { id: 'user-1' } }), {
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const api = new ApiService();
    api.setToken('test-token');
    const response = await api.getProfile();

    expect(localStorage.getItem('auth_token')).toBe('test-token');
    expect(response.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/auth/profile',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
  });

  it('returns a structured failure when the network request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const response = await new ApiService().getModels();

    expect(response).toEqual({ success: false, error: 'offline' });
  });
});
