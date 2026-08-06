import {
  configUsageResponseSchema,
  type ConfigUsageResponse
} from '../../../../shared/schemas/system/api-responses';
import type {
  ConfigUsageInput,
  ConfigUsageSnapshot
} from '../../../../shared/schemas/system/config.schema';

import {
  createTrpcResponseParser,
  invokeTrpc
} from '@/services/api/invokeTrpc';
import { isRecord } from '@/utils/recordNarrowing/isRecord';

const normalizeUsageRowPayload = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  return {
    ...value,
    category: 'category' in value ? value.category : null,
    is_active: typeof value.is_active === 'boolean' ? value.is_active : true
  };
};

export const normalizeConfigUsagePayload = (payload: unknown): unknown => {
  if (!isRecord(payload) || !isRecord(payload.usage) || !isRecord(payload.usage.dimensions)) {
    return payload;
  }

  return {
    ...payload,
    usage: {
      ...payload.usage,
      dimensions: Object.fromEntries(
        Object.entries(payload.usage.dimensions).map(([dimension, rows]) => [
          dimension,
          Array.isArray(rows) ? rows.map(normalizeUsageRowPayload) : rows
        ])
      )
    }
  };
};

export const parseConfigUsageResponse = (payload: unknown): ConfigUsageResponse => {
  return parseConfigUsageContract(payload);
};

const parseConfigUsageContract = createTrpcResponseParser(
  configUsageResponseSchema,
  (response) => response,
  undefined,
  normalizeConfigUsagePayload
);

export const getConfigUsage = async (
  agencyId: string
): Promise<ConfigUsageSnapshot> => {
  const input: ConfigUsageInput = { agency_id: agencyId };
  const response = await invokeTrpc(
    (api, options) => api.config.usage.query(input, options),
    parseConfigUsageContract,
    "Impossible de charger l'impact des paramètres."
  );

  return response.usage;
};
