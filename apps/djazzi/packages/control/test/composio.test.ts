import { beforeEach, describe, expect, it } from 'vitest';
import { COMPOSIO_BASE_URL, composioUserId, connectedPage, forgetOwned, proxyComposio } from '../src/composio.js';
import type { Account } from '../src/store.js';

// The apps' Composio through our key (28/11/2026): the core always says
// `rowboat-user`; here each account is its own Composio user and touches
// only its own connections.

const awa: Account = { id: 'acc-awa', email: 'awa@example.test', planId: 'essentiel', createdAt: 0 };
const ben: Account = { id: 'acc-ben', email: 'ben@example.test', planId: 'essentiel', createdAt: 0 };

interface Call { url: string; method: string; headers: Record<string, string>; body: unknown }

function composio(connections: Record<string, string[]> = {}) {
  const calls: Call[] = [];
  const fetch = (async (input: URL | string, init: RequestInit = {}) => {
    const url = new URL(String(input));
    calls.push({
      url: String(url),
      method: init.method ?? 'GET',
      headers: init.headers as Record<string, string>,
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    });
    if (url.pathname.endsWith('/connected_accounts') && (init.method ?? 'GET') === 'GET') {
      const ids = connections[url.searchParams.get('user_ids') ?? ''] ?? [];
      return Response.json({ items: ids.map((id) => ({ id })), next_cursor: null });
    }
    return Response.json({ ok: true, path: url.pathname });
  }) as typeof globalThis.fetch;
  return { calls, deps: { composioKey: 'our-key', fetch, publicUrl: 'https://control.example.test/' } };
}

const req = (method: string, path: string, body?: unknown) =>
  new Request(`https://control.example.test/v1/composio${path}`, {
    method,
    headers: { authorization: 'Bearer app-token', ...(body ? { 'content-type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

beforeEach(() => forgetOwned());

describe('/v1/composio', () => {
  it('reads the catalogue with our key, never the app token', async () => {
    const { calls, deps } = composio();
    const res = await proxyComposio(deps, awa, req('GET', '/toolkits?sort_by=usage'));
    expect(res.status).toBe(200);
    expect(calls[0]!.url).toBe(`${COMPOSIO_BASE_URL}/toolkits?sort_by=usage`);
    expect(calls[0]!.headers['x-api-key']).toBe('our-key');
    expect(JSON.stringify(calls[0]!.headers)).not.toContain('app-token');
  });

  it('links a new connection to the account, whatever user the app names, and brings the browser back to our page', async () => {
    const { calls, deps } = composio();
    await proxyComposio(deps, awa, req('POST', '/connected_accounts/link', { auth_config_id: 'ac_1', user_id: 'rowboat-user', callback_url: 'http://localhost:8081/oauth/callback' }));
    expect(calls[0]!.body).toEqual({ auth_config_id: 'ac_1', user_id: composioUserId('acc-awa'), callback_url: 'https://control.example.test/composio/connected' });
  });

  it('says « connected » in the browser, in its language', () => {
    expect(connectedPage({ lang: 'fr-FR,fr;q=0.9', nonce: 'n' })).toContain('C’est connecté');
    expect(connectedPage({ lang: 'en-US', nonce: 'n' })).toContain('Connected');
  });

  it('runs a tool as the account, with its own connection only', async () => {
    const { calls, deps } = composio({ [composioUserId('acc-awa')]: ['ca_awa'] });
    const mine = await proxyComposio(deps, awa, req('POST', '/tools/execute/GMAIL_FETCH_EMAILS', { connected_account_id: 'ca_awa', user_id: 'rowboat-user', arguments: {} }));
    expect(mine.status).toBe(200);
    expect(calls.at(-1)!.body).toMatchObject({ connected_account_id: 'ca_awa', user_id: composioUserId('acc-awa') });

    const before = calls.length;
    const theirs = await proxyComposio(deps, ben, req('POST', '/tools/execute/GMAIL_FETCH_EMAILS', { connected_account_id: 'ca_awa', arguments: {} }));
    expect(theirs.status).toBe(404);
    expect(calls.slice(before).some((c) => c.url.includes('/tools/execute'))).toBe(false);
  });

  it('reads and removes only its own connections', async () => {
    const { calls, deps } = composio({ [composioUserId('acc-awa')]: ['ca_awa'] });
    expect((await proxyComposio(deps, awa, req('GET', '/connected_accounts/ca_awa'))).status).toBe(200);
    expect((await proxyComposio(deps, ben, req('DELETE', '/connected_accounts/ca_awa'))).status).toBe(404);
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
  });

  it('creates Composio-managed auth configs, never ones with credentials', async () => {
    const { calls, deps } = composio();
    const managed = await proxyComposio(deps, awa, req('POST', '/auth_configs', { toolkit: { slug: 'gmail' }, auth_config: { type: 'use_composio_managed_auth', name: 'rowboat-gmail' } }));
    expect(managed.status).toBe(200);
    const custom = await proxyComposio(deps, awa, req('POST', '/auth_configs', { toolkit: { slug: 'gmail' }, auth_config: { type: 'use_custom_auth', authScheme: 'OAUTH2', credentials: { client_id: 'x' } } }));
    expect(custom.status).toBe(403);
    expect(calls).toHaveLength(1);
  });

  it('serves nothing else', async () => {
    const { calls, deps } = composio();
    expect((await proxyComposio(deps, awa, req('GET', '/connected_accounts'))).status).toBe(404);
    expect((await proxyComposio(deps, awa, req('DELETE', '/auth_configs/ac_1'))).status).toBe(404);
    expect(calls).toHaveLength(0);
  });
});
