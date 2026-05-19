import type { AgencyContext } from '@/types';
import { getCurrentUserId } from '@/services/auth/getCurrentUserId';
import { createAppError } from '@/services/errors/AppError';
import { getAgencyMemberships } from './getAgencyMemberships';
import { agencyContextCache } from './agencyContextCache';

/**
 * @description Retrieves the active agency context for the current user, utilizing caching.
 * @returns {Promise<AgencyContext>} The active agency context.
 */
export const getActiveAgencyContext = async (): Promise<AgencyContext> => {
  const userId = await getCurrentUserId();

  if (
    agencyContextCache.cachedContext &&
    agencyContextCache.cachedUserId === userId &&
    (!agencyContextCache.preferredAgencyId || agencyContextCache.cachedContext.agency_id === agencyContextCache.preferredAgencyId)
  ) {
    return agencyContextCache.cachedContext;
  }

  const memberships = await getAgencyMemberships();
  const selected =
    (agencyContextCache.preferredAgencyId &&
      memberships.find(member => member.agency_id === agencyContextCache.preferredAgencyId)) ||
    memberships[0];

  if (!selected) {
    throw createAppError({
      code: 'MEMBERSHIP_NOT_FOUND',
      message: 'Aucune agence associee a cet utilisateur.',
      source: 'db'
    });
  }

  const context: AgencyContext = {
    agency_id: selected.agency_id,
    agency_name: selected.agency_name
  };

  agencyContextCache.cachedContext = context;
  agencyContextCache.cachedUserId = userId;
  agencyContextCache.preferredAgencyId = context.agency_id;
  return context;
};
