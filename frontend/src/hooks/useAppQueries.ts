import { useMemo } from 'react';

import { getDefaultStatusId, useAppSearchData } from '@/app/useAppSearchData';
import { EMPTY_CONFIG } from '@/app/appConstants';
import { useAgencyConfig } from '@/hooks/useAgencyConfig';
import { useEntitySearchIndex } from '@/hooks/useEntitySearchIndex';
import { useInteractions } from '@/hooks/useInteractions';
import { useRealtimeInteractions } from '@/hooks/useRealtimeInteractions';
import type { AppTab, Entity, EntityContact, Interaction } from '@/types';

type UseAppQueriesParams = {
  activeAgencyId: string | null;
  canLoadData: boolean;
  activeTab: AppTab;
  isSearchOpen: boolean;
  searchQuery: string;
};

type SearchIndex = {
  entities: Entity[];
  contacts: EntityContact[];
};

const EMPTY_SEARCH_INDEX: SearchIndex = {
  entities: [],
  contacts: []
};

export const useAppQueries = ({
  activeAgencyId,
  canLoadData,
  activeTab,
  isSearchOpen,
  searchQuery
}: UseAppQueriesParams) => {
  const configQuery = useAgencyConfig(activeAgencyId, canLoadData);
  const interactionsQuery = useInteractions(activeAgencyId, canLoadData);
  useRealtimeInteractions(activeAgencyId, canLoadData);

  const shouldLoadEntityIndex = isSearchOpen || activeTab === 'clients' || activeTab === 'cockpit';
  const entitySearchQuery = useEntitySearchIndex(activeAgencyId, false, shouldLoadEntityIndex);

  const config = useMemo(() => configQuery.data ?? EMPTY_CONFIG, [configQuery.data]);
  const interactions = useMemo<Interaction[]>(
    () => interactionsQuery.data ?? [],
    [interactionsQuery.data]
  );
  const entitySearchIndex = useMemo(
    () => entitySearchQuery.data ?? EMPTY_SEARCH_INDEX,
    [entitySearchQuery.data]
  );
  const searchData = useAppSearchData({
    searchQuery,
    interactions,
    entitySearchIndex,
    defaultStatusId: getDefaultStatusId(config.statuses)
  });

  return {
    configQuery,
    interactionsQuery,
    entitySearchQuery,
    config,
    interactions,
    entitySearchIndex,
    searchData
  };
};
