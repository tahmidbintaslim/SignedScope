// The signed-in user, from Clerk. Clerk finishes every sign-in step (including two-step) before
// it reports a session, so a user here is fully signed in.
import { clerk } from './clerk';

export interface Session { user: { id: string; email: string; name: string; imageUrl: string | null } }

export async function fullySignedIn(): Promise<Session | null> {
  const c = await clerk().catch(() => null);
  const u = c?.user;
  if (!c?.session || !u) return null;
  return { user: { id: u.id, email: u.primaryEmailAddress?.emailAddress ?? '', name: u.fullName ?? '', imageUrl: u.hasImage ? u.imageUrl : null } };
}
