import type { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import {
  invalidateClientsQueries,
  invalidateDirectoryQueries,
  invalidateEntityContactMutationQueries,
  invalidateEntityDirectoryQueries,
  invalidateEntityMutationQueries,
  invalidateEntitySearchIndexQueries,
  invalidateProspectsQueries
} from '@/services/query/queryInvalidation';
import {
  clientsKey,
  clientsRootKey,
  directoryCompanyDetailsRootKey,
  directoryCompanySearchRootKey,
  directoryDuplicatesRootKey,
  directoryRootKey,
  entityUnifiedSearchRootKey,
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

  it('invalidates all directory query families', async () => {
    const queryClient = createQueryClientMock();

    await invalidateDirectoryQueries(queryClient);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: directoryRootKey()
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: directoryCompanyDetailsRootKey()
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: directoryCompanySearchRootKey()
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: directoryDuplicatesRootKey()
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
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: entityUnifiedSearchRootKey()
    });
  });

  it('invalidates entity mutation dependencies atomically', async () => {
    const queryClient = createQueryClientMock();

    await invalidateEntityMutationQueries(queryClient, {
      agencyId: 'agency-1',
      includeArchived: false,
      orphansOnly: false
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: clientsKey('agency-1', false)
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: prospectsKey('agency-1', false, false)
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: entitySearchIndexKey('agency-1', false)
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: entityUnifiedSearchRootKey()
    });
  });

  it('invalidates contact mutation dependencies atomically', async () => {
    const queryClient = createQueryClientMock();

    await invalidateEntityContactMutationQueries(queryClient, {
      agencyId: 'agency-1',
      entityId: 'entity-1',
      includeArchived: false
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: entitySearchIndexKey('agency-1', false)
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: entityUnifiedSearchRootKey()
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: directoryRootKey()
    });
  });
});
