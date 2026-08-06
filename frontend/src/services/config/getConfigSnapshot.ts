import {
  configGetResponseSchema,
  type ConfigGetResponse
} from '../../../../shared/schemas/system/api-responses';
import type { ConfigGetInput, ResolvedConfigSnapshot } from '../../../../shared/schemas/system/config.schema';

import {
  createTrpcResponseParser,
  invokeTrpc
} from '@/services/api/invokeTrpc';
import { isRecord } from '@/utils/recordNarrowing/isRecord';

import { getActiveAgencyId } from '@/services/agency/getActiveAgencyId';

const normalizeStatusPayload = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  return {
    ...value,
    is_active: typeof value.is_active === 'boolean' ? value.is_active : true
  };
};

export const normalizeConfigGetPayload = (payload: unknown): unknown => {
  if (!isRecord(payload) || !isRecord(payload.snapshot) || !isRecord(payload.snapshot.references)) {
    return payload;
  }

  const references = payload.snapshot.references;
  return {
    ...payload,
    snapshot: {
      references: {
        statuses: Array.isArray(references.statuses)
          ? references.statuses.map(normalizeStatusPayload)
          : references.statuses,
        historical_statuses: Array.isArray(references.historical_statuses)
          ? references.historical_statuses.map(normalizeStatusPayload)
          : [],
        services: references.services,
        families: references.families,
        interaction_types: references.interaction_types,
        departments: references.departments
      }
    }
  };
};

export const parseConfigGetResponse = (payload: unknown): ConfigGetResponse => {
  return parseConfigGetContract(payload);
};

const parseConfigGetContract = createTrpcResponseParser(
  configGetResponseSchema,
  (response) => response,
  undefined,
  normalizeConfigGetPayload
);

const resolveConfigGetInput = async (
  agencyIdOverride?: string
): Promise<ConfigGetInput> => ({
  agency_id: agencyIdOverride ?? (await getActiveAgencyId())
});

export const getConfigSnapshot = async (
  agencyIdOverride?: string
): Promise<ResolvedConfigSnapshot> => {
  const input = await resolveConfigGetInput(agencyIdOverride);
  const response = await invokeTrpc(
    (api, options) => api.config.get.query(input, options),
    parseConfigGetContract,
    'Impossible de charger la configuration.'
  );

  return response.snapshot;
};
