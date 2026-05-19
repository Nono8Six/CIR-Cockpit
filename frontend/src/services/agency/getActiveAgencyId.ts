import { getActiveAgencyContext } from './getActiveAgencyContext';

/**
 * @description Retrieves the active agency ID for the current user's active agency context.
 * @returns {Promise<string>} The active agency ID.
 */
export const getActiveAgencyId = async (): Promise<string> => {
  const context = await getActiveAgencyContext();
  return context.agency_id;
};
