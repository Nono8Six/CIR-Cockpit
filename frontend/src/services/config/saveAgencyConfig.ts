import { ResultAsync } from 'neverthrow';

import { safeApiCall } from '@/lib/result';
import { getActiveAgencyId } from '@/services/agency/getActiveAgencyId';
import { type AppError } from '@/services/errors/AppError';
import { safeInvoke } from '@/services/api/client';
import type { AgencyConfig } from './getAgencyConfig';

const parseVoidResponse = (): void => undefined;

export const saveAgencyConfig = (config: AgencyConfig): ResultAsync<void, AppError> =>
  safeApiCall(
    (async () => {
      const agencyId = await getActiveAgencyId();
      return safeInvoke('/data/config', {
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
      }, parseVoidResponse);
    })(),
    'Impossible de mettre a jour la configuration.'
  );
