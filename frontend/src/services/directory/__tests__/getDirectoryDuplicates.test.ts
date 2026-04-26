import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppError } from '@/services/errors/AppError';
import { invokeTrpc } from '@/services/api/safeTrpc';

vi.mock('@/services/api/safeTrpc', () => ({
  invokeTrpc: vi.fn()
}));


const mockInvokeTrpc = vi.mocked(invokeTrpc);
let mockDirectoryResponse: unknown;

describe('getDirectoryDuplicates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockDirectoryResponse = undefined;
  });

  it('delegates the request to the tRPC directory.duplicates route', async () => {
    mockInvokeTrpc.mockImplementation(async (_runner, parser) => parser(mockDirectoryResponse));
    mockDirectoryResponse = {
      request_id: 'req-duplicates',
      ok: true,
      matches: []
    };

    const { getDirectoryDuplicates } = await import('../getDirectoryDuplicates');
    const input = {
      kind: 'company' as const,
      agencyIds: [],
      includeArchived: true,
      siret: '80092968900019',
      siren: '800929689',
      name: 'KB EQUIPEMENT',
      city: 'CAVIGNAC'
    };

    const response = await getDirectoryDuplicates(input);

    expect(mockInvokeTrpc).toHaveBeenCalledTimes(1);
    expect(response.matches).toEqual([]);
  });

  it('validates the server payload before returning it', async () => {
    mockInvokeTrpc.mockImplementation(async (_runner, parser) => parser(mockDirectoryResponse));
    mockDirectoryResponse = {
      request_id: 'req-duplicates-invalid',
      ok: true,
      matches: [{ wrong: true }]
    };

    const { getDirectoryDuplicates } = await import('../getDirectoryDuplicates');
    const input = {
      kind: 'company' as const,
      agencyIds: [],
      includeArchived: true,
      siret: '80092968900019',
      siren: '800929689',
      name: 'KB EQUIPEMENT',
      city: 'CAVIGNAC'
    };

    await expect(getDirectoryDuplicates(input)).rejects.toMatchObject({
      code: 'REQUEST_FAILED',
      message: 'Reponse serveur invalide.'
    });
  });

  it('surfaces missing route errors instead of falling back silently', async () => {
    const missingRouteError = createAppError({
      code: 'NOT_FOUND',
      message: 'No procedure found on path "directory.duplicates"',
      source: 'edge'
    });
    mockInvokeTrpc.mockRejectedValue(missingRouteError);

    const { getDirectoryDuplicates } = await import('../getDirectoryDuplicates');
    const input = {
      kind: 'individual' as const,
      agencyIds: [],
      includeArchived: true,
      first_name: 'Arnaud',
      last_name: 'Ferron',
      postal_code: '33000',
      city: 'Bordeaux',
      email: 'a.ferron@cir.fr',
      phone: null
    };

    await expect(getDirectoryDuplicates(input)).rejects.toBe(missingRouteError);
  });
});
