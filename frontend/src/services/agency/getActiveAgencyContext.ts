import { AgencyContext } from '@/types';
import { getCurrentUserId } from '@/services/auth/getCurrentUserId';
import { createAppError } from '@/services/errors/AppError';
import { getAgencyMemberships } from './getAgencyMemberships';

let cachedContext: AgencyContext | null = null;
let cachedUserId: string | null = null;
let preferredAgencyId: string | null = null;

export const setActiveAgencyId = (agencyId: string | null): void => {
  if (preferredAgencyId === agencyId) return;
  preferredAgencyId = agencyId;
  cachedContext = null;
};

export const getActiveAgencyContext = async (): Promise<AgencyContext> => {
  const userId = await getCurrentUserId();

  if (
    cachedContext &&
    cachedUserId === userId &&
    (!preferredAgencyId || cachedContext.agency_id === preferredAgencyId)
  ) {
    return cachedContext;
  }

  const memberships = await getAgencyMemberships();
  const selected =
    (preferredAgencyId &&
      memberships.find(member => member.agency_id === preferredAgencyId)) ||
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

  cachedContext = context;
  cachedUserId = userId;
  preferredAgencyId = context.agency_id;
  return context;
};
