import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DirectoryListInput } from '../../../../../shared/schemas/system/directory.schema';
import { tierOrganizationReadSchema } from '../../../../../shared/schemas/entity/tier-foundation.schema';

import { invokeTrpc, parseTrpcContract } from '@/services/api/invokeTrpc';
import { buildTierOrganizationRead } from '@/__tests__/test-utils';

vi.mock('@/services/api/invokeTrpc', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api/invokeTrpc')>()),
  invokeTrpc: vi.fn()
}));


const mockInvokeTrpc = vi.mocked(invokeTrpc);
let mockDirectoryResponse: unknown;

const baseInput: DirectoryListInput = {
  scope: { mode: 'active_agency' },
  type: 'all',
  filters: {
    departments: [],
    cirCommercialIds: [],
    includeArchived: false
  },
  pagination: {
    page: 1,
    pageSize: 50,
    includeTotal: false
  },
  sorting: [{ id: 'name', desc: false }]
};

const baseRow = {
  id: '8494b111-3e90-4714-9d2f-27a6d684bbff',
  entity_type: 'Prospect / Particulier',
  client_number: null,
  account_type: null,
  name: 'PONTAC Thierry',
  city: null,
  department: null,
  agency_id: 'a5b5598a-2934-44ff-b038-5b0a506ba676',
  agency_name: 'CIR Bordeaux',
  cir_commercial_id: null,
  cir_commercial_name: null,
  archived_at: null,
  updated_at: '2026-02-04 14:09:02.049138+00'
};

const prospectTier = buildTierOrganizationRead(['prospect'], {
  id: baseRow.id,
  legacy_entity_id: baseRow.id,
  name: baseRow.name,
  city: null,
  responsible_agency: {
    id: baseRow.agency_id,
    name: baseRow.agency_name
  },
  customer_account_state: 'not_applicable',
  customer_account: null,
  primary_commercial_state: 'not_applicable'
});

describe('getDirectoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses a fixture accepted by the strict canonical tier schema', () => {
    const parsed = tierOrganizationReadSchema.safeParse(prospectTier);
    if (!parsed.success) {
      throw new Error(JSON.stringify(parsed.error.issues));
    }
    expect(parsed.data.id).toBe(baseRow.id);
  });

  it('coerces a missing client_kind from the edge payload to null', async () => {
    mockInvokeTrpc.mockImplementation(async (_runner, parser) => parseTrpcContract(parser, mockDirectoryResponse));
    mockDirectoryResponse = {
      request_id: 'req-1',
      ok: true,
      rows: [baseRow],
      tiers: [prospectTier],
      total: 1,
      page: 1,
      page_size: 50
    };

    const { getDirectoryPage } = await import('../getDirectoryPage');
    const response = await getDirectoryPage(baseInput);

    expect(response.rows).toHaveLength(1);
    expect(response.rows[0]?.client_kind).toBeNull();
  });

  it('coerces an unknown client_kind from the edge payload to null', async () => {
    mockInvokeTrpc.mockImplementation(async (_runner, parser) => parseTrpcContract(parser, mockDirectoryResponse));
    mockDirectoryResponse = {
      request_id: 'req-2',
      ok: true,
      rows: [{ ...baseRow, client_kind: 'legacy' }],
      tiers: [prospectTier],
      total: 1,
      page: 1,
      page_size: 50
    };

    const { getDirectoryPage } = await import('../getDirectoryPage');
    const response = await getDirectoryPage(baseInput);

    expect(response.rows[0]?.client_kind).toBeNull();
  });

  it('uses canonical roles and account data while preserving historical fields', async () => {
    mockInvokeTrpc.mockImplementation(async (_runner, parser) => parseTrpcContract(parser, mockDirectoryResponse));
    const tier = buildTierOrganizationRead(['client', 'supplier'], {
      id: baseRow.id,
      legacy_entity_id: baseRow.id,
      name: 'Nom canonique',
      compatibility: {
        entity_type: 'Client',
        agency_id: baseRow.agency_id,
        cir_commercial_id: null,
        client_number: '116277',
        account_type: 'cash'
      }
    });
    mockDirectoryResponse = {
      request_id: 'req-3',
      ok: true,
      rows: [{ ...baseRow, address: 'Adresse historique', entity_type: 'Client' }],
      tiers: [tier],
      total: 1,
      page: 1,
      page_size: 50
    };

    const { getDirectoryPage } = await import('../getDirectoryPage');
    const response = await getDirectoryPage(baseInput);

    expect(response.rows[0]).toMatchObject({
      id: baseRow.id,
      name: 'Nom canonique',
      client_number: '116277',
      address: 'Adresse historique'
    });
    expect(response.rows[0]?.canonical_tier.roles.map((role) => role.code)).toEqual([
      'client',
      'supplier'
    ]);
  });
});
