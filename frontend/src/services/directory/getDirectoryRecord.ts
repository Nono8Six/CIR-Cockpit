import {
  directoryRecordResponseSchema,
  type DirectoryRecordResponse
} from '../../../../shared/schemas/system/api-responses';
import { type DirectoryRecord, type DirectoryRouteRef } from '../../../../shared/schemas/system/directory.schema';
import type { TierOrganizationRead } from '../../../../shared/schemas/entity/tier-foundation.schema';
import { invokeTrpc } from '@/services/api/invokeTrpc';
import { createAppError } from '@/services/errors/AppError';

export type CanonicalDirectoryRecordResponse = DirectoryRecordResponse & {
  record: DirectoryRecord;
  tier: TierOrganizationRead;
};

const applyCanonicalAccount = (response: DirectoryRecordResponse): CanonicalDirectoryRecordResponse => {
  const { record, tier } = response;
  if (!tier) {
    throw createAppError({
      code: 'REQUEST_FAILED',
      message: 'Contrat Tiers incomplet pour la fiche annuaire.',
      source: 'edge'
    });
  }
  const account = tier.customer_account;
  return {
    ...response,
    tier,
    record: {
      ...record,
      name: tier.name,
      city: tier.city ?? record.city,
      primary_phone: tier.primary_phone ?? record.primary_phone,
      primary_email: tier.primary_email ?? record.primary_email,
      naf_code: tier.naf_code ?? record.naf_code,
      archived_at: tier.archived_at,
      updated_at: tier.updated_at,
      client_number: account?.client_number ?? record.client_number,
      account_type: account?.account_type ?? record.account_type,
      agency_id: tier.responsible_agency?.id ?? record.agency_id,
      agency_name: tier.responsible_agency?.name ?? record.agency_name,
      cir_commercial_id: account?.primary_commercial?.id ?? null,
      cir_commercial_name: account?.primary_commercial?.display_name ?? null
    }
  };
};

export const getDirectoryRecord = (input: DirectoryRouteRef): Promise<CanonicalDirectoryRecordResponse> =>
  invokeTrpc(
    (api, options) => api.directory.record.query({ ...input, includeCanonicalTier: true }, options),
    directoryRecordResponseSchema,
    "Impossible de charger la fiche annuaire."
  ).then(applyCanonicalAccount);
