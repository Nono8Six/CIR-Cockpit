import { ResultAsync } from 'neverthrow';

import { getActiveAgencyId } from '@/services/agency/getActiveAgencyId';
import { type AppError } from '@/services/errors/AppError';
import { safeRpc } from '@/services/api/safeRpc';
import type { AgencyConfig } from './getAgencyConfig';

const parseVoidResponse = (): void => undefined;

export const saveAgencyConfig = (config: AgencyConfig): ResultAsync<void, AppError> =>
  safeRpc(
    async (api, init) => {
      const agencyId = await getActiveAgencyId();
      return api.data.config.$post({
        json: {
          agency_id: agencyId,
          statuses: config.statuses.map((s) => ({
            id: s.id,
            label: s.label,
            category: s.category
          })),
          services: config.services,
          entities: config.entities,
          families: config.families,
          interactionTypes: config.interactionTypes
        }
      }, init);
    },
    parseVoidResponse,
    'Impossible de mettre a jour la configuration.'
  );
