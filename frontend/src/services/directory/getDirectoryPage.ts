import {
  directoryListResponseSchema,
  type DirectoryListResponse
} from '../../../../shared/schemas/system/api-responses';
import { type DirectoryListInput, type DirectoryListRow } from '../../../../shared/schemas/system/directory.schema';
import type { TierOrganizationRead } from '../../../../shared/schemas/entity/tier-foundation.schema';

import { invokeTrpc } from '@/services/api/invokeTrpc';
import { createAppError } from '@/services/errors/AppError';

export type CanonicalDirectoryListRow = DirectoryListRow & {
  canonical_tier: TierOrganizationRead;
};

export type CanonicalDirectoryListResponse = Omit<DirectoryListResponse, 'rows'> & {
  rows: CanonicalDirectoryListRow[];
};

const applyCanonicalTierReads = (response: DirectoryListResponse): CanonicalDirectoryListResponse => {
  const tiersById = new Map(response.tiers.map((tier) => [tier.id, tier]));
  const rows = response.rows.map((row) => {
    const tier = tiersById.get(row.id);
    if (!tier) {
      throw createAppError({
        code: 'REQUEST_FAILED',
        message: 'Contrat Tiers incomplet pour l’annuaire.',
        source: 'edge',
        details: `Organisation canonique absente pour ${row.id}.`
      });
    }
    const account = tier.customer_account;
    return {
      ...row,
      name: tier.name,
      city: tier.city ?? row.city,
      primary_phone: tier.primary_phone ?? row.primary_phone,
      primary_email: tier.primary_email ?? row.primary_email,
      naf_code: tier.naf_code ?? row.naf_code,
      archived_at: tier.archived_at,
      updated_at: tier.updated_at,
      client_number: account?.client_number ?? row.client_number,
      account_type: account?.account_type ?? row.account_type,
      agency_id: tier.responsible_agency?.id ?? row.agency_id,
      agency_name: tier.responsible_agency?.name ?? row.agency_name,
      cir_commercial_id: account?.primary_commercial?.id ?? null,
      cir_commercial_name: account?.primary_commercial?.display_name ?? null,
      canonical_tier: tier
    } satisfies CanonicalDirectoryListRow;
  });
  return { ...response, rows };
};

export const getDirectoryPage = (input: DirectoryListInput): Promise<CanonicalDirectoryListResponse> =>
  invokeTrpc(
    (api, options) => api.directory.list.query(input, options),
    directoryListResponseSchema,
    "Impossible de charger l'annuaire."
  ).then(applyCanonicalTierReads);
