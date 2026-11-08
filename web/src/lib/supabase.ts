// The Supabase client is created on first use from /api/config, so pages that never touch
// accounts (the client sign page, verify) don't download it.
import type { SupabaseClient } from '@supabase/supabase-js';
import { getConfig, setTokenSource } from './api';

let client: Promise<SupabaseClient | null> | null = null;

export function supabase(): Promise<SupabaseClient | null> {
  if (!client) {
    client = (async () => {
      const cfg = await getConfig();
      if (!cfg.enabled || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return null;
      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
      setTokenSource(async () => (await sb.auth.getSession()).data.session?.access_token ?? null);
      return sb;
    })().catch((e) => { client = null; throw e; });
  }
  return client;
}
