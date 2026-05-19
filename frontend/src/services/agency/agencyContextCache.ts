import type { AgencyContext } from '@/types';

export interface AgencyContextCache {
  cachedContext: AgencyContext | null;
  cachedUserId: string | null;
  preferredAgencyId: string | null;
}

/**
 * @description Shared cache for active agency context operations.
 */
export const agencyContextCache: AgencyContextCache = {
  cachedContext: null,
  cachedUserId: null,
  preferredAgencyId: null
};
