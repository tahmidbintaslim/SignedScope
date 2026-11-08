import type { User } from '@supabase/supabase-js';
import { useOutletContext } from 'react-router';
import type { Profile } from '../../lib/db';

/** `signOut` ends the session and goes home without the signed-out guard sending you to /login. */
export interface AppContext { user: User; profile: Profile | null | undefined; signOut: () => void }
export const useApp = () => useOutletContext<AppContext>();
