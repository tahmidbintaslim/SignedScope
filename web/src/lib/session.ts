// The signed-in user for React: one cached query, kept fresh by Supabase auth events.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { fullySignedIn } from './auth';
import { supabase } from './supabase';

export const SESSION_KEY = ['session'] as const;

export function useSession() {
  const qc = useQueryClient();
  useEffect(() => {
    let off = () => {};
    supabase().then((sb) => {
      if (!sb) return;
      const { data } = sb.auth.onAuthStateChange(() => { void qc.invalidateQueries({ queryKey: SESSION_KEY }); });
      off = () => data.subscription.unsubscribe();
    }).catch(() => {});
    return () => off();
  }, [qc]);
  return useQuery({ queryKey: SESSION_KEY, queryFn: fullySignedIn, staleTime: 5 * 60_000 });
}

export async function signOut() {
  const sb = await supabase();
  await sb?.auth.signOut();
}

/** Same-origin path to return to after sign-in; anything else falls back to /app. */
export function safeNext(raw: string | null, origin: string): string {
  try {
    const u = new URL(raw || '/app', origin);
    return u.origin === origin ? u.pathname + u.search + u.hash : '/app';
  } catch {
    return '/app';
  }
}
