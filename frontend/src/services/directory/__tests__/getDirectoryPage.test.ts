import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DirectoryListInput } from 'shared/schemas/directory.schema';

import { invokeTrpc } from '@/services/api/safeTrpc';

vi.mock('@/services/api/safeTrpc', () => ({
  invokeTrpc: vi.fn()
}));


const mockInvokeTrpc = vi.mocked(invokeTrpc);
let mockDirectoryResponse: unknown;

const baseInput: DirectoryListInput = {
  q: undefined,
  type: 'all',
  agencyIds: [],
  departments: [],
  city: undefined,
  cirCommercialIds: [],
  includeArchived: false,
  page: 1,
  pageSize: 50,
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

describe('getDirectoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('coerces a missing client_kind from the edge payload to null', async () => {
    mockInvokeTrpc.mockImplementation(async (_runner, parser) => parser(mockDirectoryResponse));
    mockDirectoryResponse = {
      request_id: 'req-1',
      ok: true,
      rows: [baseRow],
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
    mockInvokeTrpc.mockImplementation(async (_runner, parser) => parser(mockDirectoryResponse));
    mockDirectoryResponse = {
      request_id: 'req-2',
      ok: true,
      rows: [{ ...baseRow, client_kind: 'legacy' }],
      total: 1,
      page: 1,
      page_size: 50
    };

    const { getDirectoryPage } = await import('../getDirectoryPage');
    const response = await getDirectoryPage(baseInput);

    expect(response.rows[0]?.client_kind).toBeNull();
  });
});
