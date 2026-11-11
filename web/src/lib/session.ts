// The signed-in user for React: one cached query, kept fresh by Clerk's session events.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { fullySignedIn } from './auth';
import { clerk } from './clerk';
import { setSignedInHint } from './signedInHint';

export const SESSION_KEY = ['session'] as const;

export function useSession() {
  const qc = useQueryClient();
  useEffect(() => {
    let off = () => {};
    let cancelled = false;
    let last: string | null | undefined;
    clerk().then((c) => {
      if (!c || cancelled) return;
      // Fires on sign-in, sign-out, user switch and token refresh; only the user change matters.
      // A different account must never see the last one's cached rows, so the cache is dropped.
      off = c.addListener(({ user }) => {
        const id = user?.id ?? null;
        setSignedInHint(Boolean(id));
        if (last !== undefined && id !== last) { qc.clear(); void qc.invalidateQueries({ queryKey: SESSION_KEY }); }
        last = id;
      });
    }).catch(() => {});
    return () => { cancelled = true; off(); };
  }, [qc]);
  return useQuery({ queryKey: SESSION_KEY, queryFn: fullySignedIn, staleTime: Infinity });
}

/** Signs out and drops every cached query, so the next account never sees the last one's data. */
export async function signOut(qc?: { clear: () => void }) {
  const c = await clerk().catch(() => null);
  await c?.signOut();
  setSignedInHint(false);
  qc?.clear();
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
