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

describe('getDirectoryDuplicates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    window.sessionStorage.clear();
  });

  it('delegates the request to the tRPC directory.duplicates route', async () => {
    mockInvokeTrpc.mockImplementation(async (runner, parser) => parser(await runner()));
    mockCallTrpcQuery.mockResolvedValue({
      request_id: 'req-duplicates',
      ok: true,
      matches: []
    });

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
    expect(mockCallTrpcQuery).toHaveBeenCalledWith('directory.duplicates', input);
    expect(response.matches).toEqual([]);
  });

  it('falls back to an empty response when the tRPC route is missing', async () => {
    mockInvokeTrpc.mockRejectedValue(createAppError({
      code: 'NOT_FOUND',
      message: 'No procedure found on path "directory.duplicates"',
      source: 'edge'
    }));

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

    const firstResponse = await getDirectoryDuplicates(input);
    const secondResponse = await getDirectoryDuplicates(input);

    expect(firstResponse.matches).toEqual([]);
    expect(secondResponse.matches).toEqual([]);
    expect(mockInvokeTrpc).toHaveBeenCalledTimes(1);
  });
});
