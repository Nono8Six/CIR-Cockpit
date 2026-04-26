import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppError } from '@/services/errors/AppError';
import { invokeTrpc } from '@/services/api/safeTrpc';

vi.mock('@/services/api/safeTrpc', () => ({
  invokeTrpc: vi.fn()
}));


const mockInvokeTrpc = vi.mocked(invokeTrpc);
let mockDirectoryResponse: unknown;

const makeCompanyDetails = (overrides: Record<string, unknown> = {}) => ({
  siren: '451013759',
  official_name: 'SARL SEA',
  name: 'SARL SEA (SEA) (SEA)',
  sigle: 'SEA',
  nature_juridique: 'Société à responsabilité limitée',
  categorie_entreprise: 'PME',
  date_creation: '2004-01-02',
  etat_administratif: 'A',
  activite_principale: 'Ingénierie',
  activite_principale_naf25: '71.12B',
  section_activite_principale: 'M',
  company_establishments_count: 2,
  company_open_establishments_count: 1,
  employee_range: '10 à 19 salariés',
  employee_range_year: 2024,
  is_employer: true,
  diffusion_status: 'O',
  directors: [{
    full_name: 'Jean Martin',
    role: 'Gérant',
    nationality: 'Française',
    birth_year: 1978
  }],
  financials: {
    latest_year: 2024,
    revenue: 1250000,
    net_income: 96000
  },
  signals: {
    association: false,
    ess: true,
    qualiopi: false,
    rge: true,
    bio: false,
    organisme_formation: false,
    service_public: false,
    societe_mission: false
  },
  ...overrides
});

describe('getDirectoryCompanyDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockDirectoryResponse = undefined;
  });

  it('delegates the request to the tRPC directory.company-details route', async () => {
    mockInvokeTrpc.mockImplementation(async (_runner, parser) => parser(mockDirectoryResponse));
    mockDirectoryResponse = {
      request_id: 'req-details-1',
      ok: true,
      company: makeCompanyDetails()
    };

    const { getDirectoryCompanyDetails } = await import('../getDirectoryCompanyDetails');
    const response = await getDirectoryCompanyDetails({ siren: '451013759' });

    expect(mockInvokeTrpc).toHaveBeenCalledTimes(1);
    expect(response.company).toMatchObject({
      official_name: 'SARL SEA',
      employee_range: '10 à 19 salariés',
      signals: expect.objectContaining({
        ess: true,
        rge: true
      })
    });
  });

  it('validates the server payload before returning it', async () => {
    mockInvokeTrpc.mockImplementation(async (_runner, parser) => parser(mockDirectoryResponse));
    mockDirectoryResponse = {
      request_id: 'req-details-2',
      ok: true,
      company: { wrong: true }
    };

    const { getDirectoryCompanyDetails } = await import('../getDirectoryCompanyDetails');

    await expect(getDirectoryCompanyDetails({ siren: '451013759' })).rejects.toMatchObject({
      code: 'REQUEST_FAILED',
      message: 'Reponse serveur invalide.'
    });
  });

  it('surfaces invokeTrpc errors unchanged', async () => {
    const edgeError = createAppError({
      code: 'EDGE_FUNCTION_ERROR',
      message: 'Impossible de charger les informations société.',
      source: 'edge'
    });
    mockInvokeTrpc.mockRejectedValue(edgeError);

    const { getDirectoryCompanyDetails } = await import('../getDirectoryCompanyDetails');

    await expect(getDirectoryCompanyDetails({ siren: '451013759' })).rejects.toBe(edgeError);
  });

  it('surfaces missing route errors instead of falling back silently', async () => {
    const missingRouteError = createAppError({
      code: 'NOT_FOUND',
      message: 'No procedure found on path "directory.company-details"',
      source: 'edge'
    });
    mockInvokeTrpc.mockRejectedValue(missingRouteError);

    const { getDirectoryCompanyDetails } = await import('../getDirectoryCompanyDetails');

    await expect(getDirectoryCompanyDetails({ siren: '451013759' })).rejects.toBe(missingRouteError);
  });
});
