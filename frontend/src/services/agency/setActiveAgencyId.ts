import { agencyContextCache } from './agencyContextCache';

/**
 * @description Sets the preferred agency ID, clearing the cached context if it changes.
 * @param {string | null} agencyId - The new agency ID to set as preferred, or null.
 * @returns {void}
 */
export const setActiveAgencyId = (agencyId: string | null): void => {
  if (agencyContextCache.preferredAgencyId === agencyId) return;
  agencyContextCache.preferredAgencyId = agencyId;
  agencyContextCache.cachedContext = null;
};
