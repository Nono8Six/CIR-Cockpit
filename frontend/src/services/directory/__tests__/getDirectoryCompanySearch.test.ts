import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppError } from '@/services/errors/AppError';
import { invokeTrpc } from '@/services/api/invokeTrpc';
import { callTrpcQuery } from '@/services/api/trpcClient';

vi.mock('@/services/api/invokeTrpc', () => ({
  invokeTrpc: vi.fn()
}));

vi.mock('@/services/api/trpcClient', () => ({
  callTrpcQuery: vi.fn()
}));

const mockInvokeTrpc = vi.mocked(invokeTrpc);
const mockCallTrpcQuery = vi.mocked(callTrpcQuery);

const makeCompany = (overrides: Record<string, unknown> = {}) => ({
  name: 'KB EQUIPEMENT',
  official_name: 'KB EQUIPEMENT',
  siren: '800929689',
  siret: '80092968900018',
  naf_code: '46.69B',
  address: 'Adresse test',
  postal_code: '33700',
  city: 'Merignac',
  department: '33',
  region: 'Nouvelle-Aquitaine',
  date_creation: '2020-01-01',
  date_debut_activite: '2020-01-01',
  employee_range: '10 à 19 salariés',
  employee_range_year: 2024,
  is_employer: true,
  establishment_diffusion_status: 'O',
  brands: ['KB'],
  is_head_office: true,
  is_former_head_office: false,
  establishment_status: 'open' as const,
  establishment_closed_at: null,
  commercial_name: null,
  company_establishments_count: 1,
  company_open_establishments_count: 1,
  match_quality: 'exact' as const,
  match_explanation: 'Correspondance exacte',
  official_data_source: 'api-recherche-entreprises' as const,
  official_data_synced_at: '2026-03-10T00:00:00.000Z',
  ...overrides
});

describe('getDirectoryCompanySearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('delegates the request to the tRPC directory.company-search route', async () => {
    mockInvokeTrpc.mockImplementation(async (runner, parser) => parser(await runner()));
    mockCallTrpcQuery.mockResolvedValue({
      request_id: 'req-1',
      ok: true,
      companies: [makeCompany()]
    });

    const { getDirectoryCompanySearch } = await import('../getDirectoryCompanySearch');
    const response = await getDirectoryCompanySearch({
      query: 'KB EQUIP',
      department: '33'
    });

    expect(mockInvokeTrpc).toHaveBeenCalledTimes(1);
    expect(mockCallTrpcQuery).toHaveBeenCalledWith('directory.company-search', {
      query: 'KB EQUIP',
      department: '33'
    });
    expect(response.companies[0]).toMatchObject({
      name: 'KB EQUIPEMENT',
      department: '33',
      match_quality: 'exact'
    });
  });

  it('validates the server payload before returning it', async () => {
    mockInvokeTrpc.mockImplementation(async (runner, parser) => parser(await runner()));
    mockCallTrpcQuery.mockResolvedValue({
      request_id: 'req-2',
      ok: true,
      companies: [{ wrong: true }]
    });

    const { getDirectoryCompanySearch } = await import('../getDirectoryCompanySearch');

    await expect(getDirectoryCompanySearch({ query: 'sea' })).rejects.toMatchObject({
      code: 'REQUEST_FAILED',
      message: 'Reponse serveur invalide.'
    });
  });

  it('surfaces invokeTrpc errors unchanged', async () => {
    const edgeError = createAppError({
      code: 'EDGE_FUNCTION_ERROR',
      message: "Impossible de rechercher l'entreprise.",
      source: 'edge'
    });
    mockInvokeTrpc.mockRejectedValue(edgeError);

    const { getDirectoryCompanySearch } = await import('../getDirectoryCompanySearch');

    await expect(getDirectoryCompanySearch({ query: 'sea' })).rejects.toBe(edgeError);
  });

  it('surfaces missing route errors instead of falling back silently', async () => {
    const missingRouteError = createAppError({
      code: 'NOT_FOUND',
      message: 'No procedure found on path "directory.company-search"',
      source: 'edge'
    });
    mockInvokeTrpc.mockRejectedValue(missingRouteError);

    const { getDirectoryCompanySearch } = await import('../getDirectoryCompanySearch');

    await expect(getDirectoryCompanySearch({ query: 'sea' })).rejects.toBe(missingRouteError);
  });
});
