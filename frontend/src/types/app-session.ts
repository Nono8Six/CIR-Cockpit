import type { Session } from '@supabase/supabase-js';

import type { UserProfile } from '@/services/auth/getProfile';
import type { AgencyContext, AgencyMembershipSummary } from '@/types';

export type AppSessionContextValue = {
  authReady: boolean;
  session: Session | null;
  profile: UserProfile | null;
  profileLoading: boolean;
  profileError: string | null;
  agencyContext: AgencyContext | null;
  agencyMemberships: AgencyMembershipSummary[];
  activeAgencyId: string | null;
  mustChangePassword: boolean;
  isContextLoading: boolean;
  contextError: string | null;
  canLoadData: boolean;
  refreshProfile: () => Promise<void>;
  retryProfile: () => void;
  changeActiveAgency: (agencyId: string) => Promise<boolean>;
  signOutUser: () => Promise<boolean>;
};
