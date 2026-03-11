import type { QueryClient } from '@tanstack/react-query';

import {
  adminUsersKey,
  agenciesKey,
  clientContactsKey,
  clientsKey,
  clientsRootKey,
  directoryCitySuggestionsRootKey,
  directoryRootKey,
  directoryOptionsRootKey,
  directoryRecordRootKey,
  directorySavedViewsRootKey,
  entityInteractionsRootKey,
  entitySearchIndexKey,
  entitySearchIndexRootKey,
  interactionsKey,
  prospectsKey,
  prospectsRootKey
} from '@/services/query/queryKeys';

type EntityDirectoryScope = {
  agencyId: string | null;
  orphansOnly?: boolean;
};

export const invalidateAgenciesQueries = async (queryClient: QueryClient): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: agenciesKey(false) }),
    queryClient.invalidateQueries({ queryKey: agenciesKey(true) })
  ]);
};

export const invalidateAdminUsersQuery = async (queryClient: QueryClient): Promise<void> => {
  await queryClient.invalidateQueries({ queryKey: adminUsersKey() });
};

export const invalidateInteractionsQuery = async (
  queryClient: QueryClient,
  agencyId: string | null
): Promise<void> => {
  if (!agencyId) return;
  await queryClient.invalidateQueries({ queryKey: interactionsKey(agencyId) });
};

export const invalidateClientsQueries = async (
  queryClient: QueryClient,
  agencyId: string | null,
  includeArchived?: boolean
): Promise<void> => {
  if (!agencyId) {
    await queryClient.invalidateQueries({ queryKey: clientsRootKey() });
    return;
  }

  if (typeof includeArchived === 'boolean') {
    await queryClient.invalidateQueries({ queryKey: clientsKey(agencyId, includeArchived) });
    return;
  }

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: clientsKey(agencyId, false) }),
    queryClient.invalidateQueries({ queryKey: clientsKey(agencyId, true) })
  ]);
};

export const invalidateProspectsQueries = async (
  queryClient: QueryClient,
  { agencyId, orphansOnly = false, includeArchived }: EntityDirectoryScope & { includeArchived?: boolean }
): Promise<void> => {
  if (!agencyId && !orphansOnly) {
    await queryClient.invalidateQueries({ queryKey: prospectsRootKey() });
    return;
  }

  if (typeof includeArchived === 'boolean') {
    await queryClient.invalidateQueries({
      queryKey: prospectsKey(agencyId, includeArchived, orphansOnly)
    });
    return;
  }

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: prospectsKey(agencyId, false, orphansOnly) }),
    queryClient.invalidateQueries({ queryKey: prospectsKey(agencyId, true, orphansOnly) })
  ]);
};

export const invalidateEntitySearchIndexQueries = async (
  queryClient: QueryClient,
  agencyId: string | null,
  includeArchived?: boolean
): Promise<void> => {
  if (!agencyId) {
    await queryClient.invalidateQueries({ queryKey: entitySearchIndexRootKey() });
    return;
  }

  if (typeof includeArchived === 'boolean') {
    await queryClient.invalidateQueries({ queryKey: entitySearchIndexKey(agencyId, includeArchived) });
    return;
  }

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: entitySearchIndexKey(agencyId, false) }),
    queryClient.invalidateQueries({ queryKey: entitySearchIndexKey(agencyId, true) })
  ]);
};

export const invalidateClientContactsQuery = async (
  queryClient: QueryClient,
  entityId: string | null,
  includeArchived = false
): Promise<void> => {
  if (!entityId) return;
  await queryClient.invalidateQueries({ queryKey: clientContactsKey(entityId, includeArchived) });
};

export const invalidateEntityInteractionsQueries = async (
  queryClient: QueryClient,
  entityId: string | null
): Promise<void> => {
  if (!entityId) {
    await queryClient.invalidateQueries({ queryKey: entityInteractionsRootKey() });
    return;
  }

  await queryClient.invalidateQueries({
    predicate: (query) =>
      Array.isArray(query.queryKey)
      && query.queryKey[0] === entityInteractionsRootKey()[0]
      && query.queryKey[1] === entityId
  });
};

export const invalidateDirectoryQueries = async (
  queryClient: QueryClient
): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: directoryRootKey() }),
    queryClient.invalidateQueries({ queryKey: directoryOptionsRootKey() }),
    queryClient.invalidateQueries({ queryKey: directoryCitySuggestionsRootKey() }),
    queryClient.invalidateQueries({ queryKey: directoryRecordRootKey() }),
    queryClient.invalidateQueries({ queryKey: directorySavedViewsRootKey() })
  ]);
};

export const invalidateEntityDirectoryQueries = async (
  queryClient: QueryClient,
  { agencyId, orphansOnly = false }: EntityDirectoryScope
): Promise<void> => {
  await Promise.all([
    invalidateClientsQueries(queryClient, agencyId),
    invalidateProspectsQueries(queryClient, { agencyId, orphansOnly }),
    invalidateEntitySearchIndexQueries(queryClient, agencyId),
    invalidateDirectoryQueries(queryClient)
  ]);
};
