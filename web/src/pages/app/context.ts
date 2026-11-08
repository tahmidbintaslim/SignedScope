import type { User } from '@supabase/supabase-js';
import { useOutletContext } from 'react-router';
import type { Profile } from '../../lib/db';

export interface AppContext { user: User; profile: Profile | null | undefined }
export const useApp = () => useOutletContext<AppContext>();
