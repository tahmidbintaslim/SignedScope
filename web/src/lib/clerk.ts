// Clerk (sign-in, social login, two-step) loaded on first use, only on pages that need an
// account. The JS and its UI are bundled from npm ("no-rhc": no remotely hosted code), so the
// site's CSP keeps script-src 'self'; only Clerk's API host is added to connect-src.
import type { Clerk as ClerkType } from '@clerk/clerk-js';
import { getConfig } from './api';

let loading: Promise<ClerkType | null> | null = null;

// Browser tests put a stand-in Clerk on window (see web/e2e/fake-supabase.mjs). A page that can
// set this can already run any script, so it opens nothing new.
declare global { interface Window { __ssTestClerk?: ClerkType } }

export function clerk(): Promise<ClerkType | null> {
  if (typeof window !== 'undefined' && window.__ssTestClerk) return Promise.resolve(window.__ssTestClerk);
  if (!loading) {
    loading = (async () => {
      const cfg = await getConfig();
      if (!cfg.enabled || !cfg.clerkPublishableKey) return null;
      const [{ Clerk }, { ui }] = await Promise.all([import('@clerk/clerk-js/no-rhc'), import('@clerk/ui/no-rhc')]);
      const c = new Clerk(cfg.clerkPublishableKey);
      await c.load({ ui, signInUrl: '/login', signUpUrl: '/login', afterSignOutUrl: '/' });
      return c as unknown as ClerkType;
    })().catch((e) => { loading = null; throw e; });
  }
  return loading;
}

/** A short-lived Clerk session token for Supabase and /api, or null when signed out. */
export async function sessionToken(): Promise<string | null> {
  const c = await clerk().catch(() => null);
  return (await c?.session?.getToken()) ?? null;
}
