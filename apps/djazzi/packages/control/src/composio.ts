import type { Account } from './store.js';
import { dSvg } from './d-mark.js';
import { pickLang } from './sign-in-page.js';

// DJAZZI(28/11/2026): the apps' Composio through the control plane, with our
// one key (the founder's call: Gmail, Outlook, Slack, Notion… by Composio for
// now, Google's own connection later). The core speaks Composio's v3.1 API
// under `/v1/composio` (core composio/client.ts) and always says
// `user_id: 'rowboat-user'`: here each account gets its own Composio user,
// and a connected account is used only by the account that made it.

export const COMPOSIO_BASE_URL = 'https://backend.composio.dev/api/v3.1';

export interface ComposioDeps {
  composioKey: string;
  fetch: typeof globalThis.fetch;
  /** This control plane: after consenting, the browser lands on its page, not on a loopback. */
  publicUrl: string;
}

/** Where the browser lands once the person has consented (the app learns it by asking Composio). */
export const CONNECTED_PATH = '/composio/connected';

/** « Connected, back to Djazzi »: the browser may be on another device than the app that asked. */
export function connectedPage({ lang: acceptLanguage, nonce }: { lang: string | null; nonce: string }): string {
  const lang = pickLang(acceptLanguage);
  const t = lang === 'en'
    ? { title: 'Connected', lead: 'You can close this page and go back to Djazzi. The connection shows up there in a few seconds.' }
    : { title: 'C’est connecté', lead: 'Vous pouvez fermer cette page et revenir dans Djazzi. La connexion y apparaît en quelques secondes.' };
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t.title} · Djazzi</title>
<style nonce="${nonce}">
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0A0A0A;color:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
main{max-width:420px;padding:32px 24px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:18px}
h1{margin:0;font-family:Georgia,'Times New Roman',serif;font-weight:500;font-size:34px}
p{margin:0;font-size:17px;line-height:1.5;color:#B5B5B5}
</style>
</head>
<body><main>${dSvg({ size: 72, body: '#FFFFFF', eyes: '#0A0A0A' })}<h1>${t.title}</h1><p>${t.lead}</p></main></body>
</html>`;
}

/** The Composio user of a Djazzi account: never the app's `rowboat-user`. */
export function composioUserId(accountId: string): string {
  return `djazzi-${accountId}`;
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const refuse = (status: number, code: string, message: string) => json({ error: { code, message } }, status);

/** The connected accounts this account made, asked of Composio, kept a minute. */
const owned = new Map<string, { ids: Set<string>; at: number }>();
const OWNED_FOR_MS = 60_000;

async function ownsConnectedAccount(deps: ComposioDeps, accountId: string, connectedAccountId: string): Promise<boolean> {
  const known = owned.get(accountId);
  if (known && Date.now() - known.at < OWNED_FOR_MS && known.ids.has(connectedAccountId)) return true;
  const ids = new Set<string>();
  let cursor: string | null = null;
  // A few pages at most: a person has a handful of connections.
  for (let page = 0; page < 10; page++) {
    const url = new URL(`${COMPOSIO_BASE_URL}/connected_accounts`);
    url.searchParams.set('user_ids', composioUserId(accountId));
    url.searchParams.set('limit', '100');
    if (cursor) url.searchParams.set('cursor', cursor);
    const res = await deps.fetch(url, { headers: { 'x-api-key': deps.composioKey } });
    if (!res.ok) return false;
    const body = (await res.json().catch(() => null)) as { items?: Array<{ id?: unknown }>; next_cursor?: unknown } | null;
    for (const item of body?.items ?? []) if (typeof item.id === 'string') ids.add(item.id);
    cursor = typeof body?.next_cursor === 'string' && body.next_cursor ? body.next_cursor : null;
    if (!cursor) break;
  }
  owned.set(accountId, { ids, at: Date.now() });
  return ids.has(connectedAccountId);
}

/** Forgets what was learnt of an account's connections (tests, a deletion). */
export function forgetOwned(accountId?: string): void {
  if (accountId) owned.delete(accountId);
  else owned.clear();
}

type Body = Record<string, unknown>;
const isObject = (v: unknown): v is Body => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * `/v1/composio/<path>` → Composio `<path>`, for the calls the core makes
 * and no other: reading toolkits and tools, the Composio-managed auth
 * configs, linking, reading and removing one's own connected accounts, and
 * running a tool with one of them.
 */
export async function proxyComposio(deps: ComposioDeps, account: Account, req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/v1\/composio/, '') || '/';
  const method = req.method.toUpperCase();
  const user = composioUserId(account.id);
  const segments = path.split('/').filter(Boolean);

  const forward = async (body?: Body, query?: URLSearchParams) => {
    const target = new URL(`${COMPOSIO_BASE_URL}${path}`);
    (query ?? url.searchParams).forEach((value, key) => target.searchParams.set(key, value));
    const res = await deps.fetch(target, {
      method,
      headers: { 'x-api-key': deps.composioKey, ...(body ? { 'content-type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      redirect: 'manual',
    });
    return new Response(await res.text(), {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
    });
  };
  const readBody = async (): Promise<Body | null> => {
    const body = await req.json().catch(() => null);
    return isObject(body) ? body : null;
  };

  // Reading the catalogue: the same for everyone.
  if (method === 'GET' && segments[0] === 'toolkits' && segments.length <= 2) return forward();
  if (method === 'GET' && segments[0] === 'tools' && segments.length === 1) return forward();
  if (method === 'GET' && segments[0] === 'auth_configs' && segments.length === 1) return forward();

  // Only Composio's own OAuth apps: no account brings credentials of its own here.
  if (method === 'POST' && path === '/auth_configs') {
    const body = await readBody();
    const config = isObject(body?.auth_config) ? body.auth_config : null;
    if (!body || config?.type !== 'use_composio_managed_auth' || 'credentials' in config) {
      return refuse(403, 'forbidden', 'Only Composio-managed auth configs can be created.');
    }
    return forward(body);
  }

  // A new connection belongs to the account that makes it.
  if (method === 'POST' && path === '/connected_accounts/link') {
    const body = await readBody();
    if (!body) return refuse(400, 'invalid_request', 'A JSON body is expected.');
    forgetOwned(account.id);
    return forward({ ...body, user_id: user, callback_url: `${deps.publicUrl.replace(/\/+$/, '')}${CONNECTED_PATH}` });
  }
  if (method === 'POST' && path === '/connected_accounts') {
    const body = await readBody();
    if (!body) return refuse(400, 'invalid_request', 'A JSON body is expected.');
    const connection = isObject(body.connection) ? body.connection : {};
    forgetOwned(account.id);
    return forward({ ...body, connection: { ...connection, user_id: user, callback_url: `${deps.publicUrl.replace(/\/+$/, '')}${CONNECTED_PATH}` } });
  }

  // One's own connections, and no one else's.
  if ((method === 'GET' || method === 'DELETE') && segments[0] === 'connected_accounts' && segments.length === 2) {
    if (!(await ownsConnectedAccount(deps, account.id, decodeURIComponent(segments[1]!)))) {
      return refuse(404, 'not_found', 'No such connected account.');
    }
    if (method === 'DELETE') forgetOwned(account.id);
    return forward();
  }

  // Running a tool: as this account, with one of its connections if one is named.
  if (method === 'POST' && segments[0] === 'tools' && segments[1] === 'execute' && segments.length === 3) {
    const body = await readBody();
    if (!body) return refuse(400, 'invalid_request', 'A JSON body is expected.');
    const connected = body.connected_account_id;
    if (connected !== undefined && (typeof connected !== 'string' || !(await ownsConnectedAccount(deps, account.id, connected)))) {
      return refuse(404, 'not_found', 'No such connected account.');
    }
    return forward({ ...body, user_id: user });
  }

  return refuse(404, 'not_found', 'Not served.');
}
