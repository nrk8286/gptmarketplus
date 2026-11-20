// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('API connection', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    vi.stubEnv('VITE_API_URL', '');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ success: true, data: { categories: [] } }),
      { headers: { 'Content-Type': 'application/json' } },
    )));
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('uses the same-origin API proxy by default', async () => {
    const { api } = await import('./api');
    await api.getCategories();
    expect(fetch).toHaveBeenCalledWith('/api/v1/models/categories', expect.any(Object));
  });

  it('uses the configured Worker URL and keeps authentication headers', async () => {
    vi.stubEnv('VITE_API_URL', ' https://api.example.test/api/v1/ ');
    const { api } = await import('./api');
    api.setToken('test-session');
    await api.getCategories();
    expect(fetch).toHaveBeenCalledWith('https://api.example.test/api/v1/models/categories',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-session' }) }));
  });

  it('rejects a successful SPA fallback instead of treating HTML as API data', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('<html>SPA</html>', { headers: { 'Content-Type': 'text/html' } }));
    const { api } = await import('./api');
    expect(await api.getCategories()).toMatchObject({ success: false, error: expect.stringContaining('unexpected response') });
  });

  it('preserves an API error and rejects HTTP failures even with a success body', async () => {
    const { api } = await import('./api');
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }));
    expect(await api.getCategories()).toEqual({ success: false, error: 'Unauthorized' });
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ success: true }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }));
    expect(await api.getCategories()).toEqual({ success: false, error: 'Request failed (502)' });
  });
});
