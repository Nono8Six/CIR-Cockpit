import type { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import {
  invalidateClientsQueries,
  invalidateEntityDirectoryQueries,
  invalidateEntitySearchIndexQueries,
  invalidateProspectsQueries
} from '@/services/query/queryInvalidation';
import {
  clientsKey,
  clientsRootKey,
  entitySearchIndexKey,
  prospectsKey
} from '@/services/query/queryKeys';

type QueryClientMock = QueryClient & {
  invalidateQueries: ReturnType<typeof vi.fn>;
};

const createQueryClientMock = (): QueryClientMock =>
  ({
    invalidateQueries: vi.fn().mockResolvedValue(undefined)
  }) as unknown as QueryClientMock;

describe('queryInvalidation', () => {
  it('targets a single clients query when includeArchived is provided', async () => {
    const queryClient = createQueryClientMock();

    await invalidateClientsQueries(queryClient, 'agency-1', false);

    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(1);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: clientsKey('agency-1', false)
    });
  });

  it('falls back to clients root when agency is missing', async () => {
    const queryClient = createQueryClientMock();

    await invalidateClientsQueries(queryClient, null);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: clientsRootKey()
    });
  });

  it('targets prospects and entity-search keys for one archived variant', async () => {
    const queryClient = createQueryClientMock();

    await invalidateProspectsQueries(queryClient, {
      agencyId: 'agency-1',
      includeArchived: true,
      orphansOnly: false
    });
    await invalidateEntitySearchIndexQueries(queryClient, 'agency-1', true);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: prospectsKey('agency-1', true, false)
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: entitySearchIndexKey('agency-1', true)
    });
  });

  it('invalidates the full entity directory scope for one agency', async () => {
    const queryClient = createQueryClientMock();

    await invalidateEntityDirectoryQueries(queryClient, {
      agencyId: 'agency-1',
      orphansOnly: false
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: clientsKey('agency-1', false)
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: clientsKey('agency-1', true)
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: prospectsKey('agency-1', false, false)
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: prospectsKey('agency-1', true, false)
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: entitySearchIndexKey('agency-1', false)
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: entitySearchIndexKey('agency-1', true)
    });
  });
});
