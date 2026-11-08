// Session helpers on top of Supabase Auth. A user with two-step sign-in set up only counts as
// signed in after the second step (aal2), matching the database policies.
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export async function fullySignedIn(): Promise<Session | null> {
  const sb = await supabase().catch(() => null);
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  if (!data.session) return null;
  const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') return null;
  return data.session;
}
