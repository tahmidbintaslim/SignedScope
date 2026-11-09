import type { Session } from '../../lib/auth';
import { useOutletContext } from 'react-router';
import type { Profile } from '../../lib/db';

/** `signOut` ends the session and goes home without the signed-out guard sending you to /login. */
export interface AppContext { user: Session['user']; profile: Profile | null | undefined; signOut: () => void }
export const useApp = () => useOutletContext<AppContext>();
