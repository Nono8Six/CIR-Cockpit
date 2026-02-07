import { getActiveAgencyContext } from './getActiveAgencyContext';

export const getActiveAgencyId = async (): Promise<string> => {
  const context = await getActiveAgencyContext();
  return context.agency_id;
};
