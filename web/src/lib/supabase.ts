// The Supabase client is created on first use from /api/config, so pages that never touch
// accounts (the client sign page, verify) don't download it. Requests carry the Clerk session
// token (Supabase third-party auth); Row Level Security reads the Clerk user id from it.
import type { SupabaseClient } from '@supabase/supabase-js';
import { getConfig, setTokenSource } from './api';
import { sessionToken } from './clerk';

let client: Promise<SupabaseClient | null> | null = null;

export function supabase(): Promise<SupabaseClient | null> {
  if (!client) {
    client = (async () => {
      const cfg = await getConfig();
      if (!cfg.enabled || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return null;
      const { createClient } = await import('@supabase/supabase-js');
      setTokenSource(sessionToken);
      return createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { accessToken: sessionToken });
    })().catch((e) => { client = null; throw e; });
  }
  return client;
}
