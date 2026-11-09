// Typed client for the Node API in /api. Every endpoint takes and returns JSON over POST
// (GET /api/config is the one exception). Errors carry the HTTP status for callers and retries.

export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); this.name = 'ApiError'; }
}

type TokenSource = () => Promise<string | null>;
let tokenSource: TokenSource = async () => null;

/** Lets the auth layer attach the session token without this module importing Supabase. */
export function setTokenSource(fn: TokenSource) { tokenSource = fn; }

export async function api<T>(path: string, body: unknown = {}, init: { signal?: AbortSignal; auth?: boolean } = {}): Promise<T> {
  const token = init.auth === false ? null : await tokenSource();
  let r: Response;
  try {
    r = await fetch('/api/' + path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
      body: JSON.stringify(body),
      signal: init.signal,
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError('Network error. Check your connection and try again.', 0);
  }
  const j = (await r.json().catch(() => ({}))) as { error?: string };
  if (!r.ok) throw new ApiError(j.error || 'Request failed', r.status);
  return j as T;
}

export interface PublicConfig { enabled: boolean; supabaseUrl?: string; supabaseAnonKey?: string; clerkPublishableKey?: string }

export async function getConfig(signal?: AbortSignal): Promise<PublicConfig> {
  const r = await fetch('/api/config', { signal });
  if (!r.ok) throw new ApiError('Could not load settings', r.status);
  return r.json() as Promise<PublicConfig>;
}
