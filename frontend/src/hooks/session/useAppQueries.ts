import { useMemo } from 'react';

import { useAppSearchData } from '@/app/useAppSearchData';
import { EMPTY_CONFIG } from '@/app/appConstants';
import { isRealtimeInteractionTab } from '@/app/appRoutes';
import { useAgencyConfig } from '../admin/agencies/core/useAgencyConfig';
import { useEntitySearchIndex } from '../directory/core/useEntitySearchIndex';
import { useInteractions } from '../interactions/core/queries/useInteractions';
import { useRealtimeInteractions } from '../interactions/core/queries/useRealtimeInteractions';
import type { AppTab, Entity, EntityContact, Interaction } from '@/types';
import type { AgencyConfig } from '@/services/config';

type UseAppQueriesParams = {
  activeAgencyId: string | null;
  canLoadData: boolean;
  activeTab: AppTab;
  isSearchOpen: boolean;
  searchQuery: string;
  includeArchivedSearch: boolean;
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
  searchQuery,
  includeArchivedSearch
}: UseAppQueriesParams) => {
  const configQuery = useAgencyConfig(activeAgencyId, canLoadData);
  const interactionsQuery = useInteractions(activeAgencyId, canLoadData);
  useRealtimeInteractions(activeAgencyId, canLoadData && isRealtimeInteractionTab(activeTab));

  const shouldLoadEntityIndex = isSearchOpen || activeTab === 'clients' || activeTab === 'cockpit';
  const entitySearchQuery = useEntitySearchIndex(activeAgencyId, includeArchivedSearch, shouldLoadEntityIndex);

  const config = useMemo<AgencyConfig>(() => configQuery.data ?? EMPTY_CONFIG, [configQuery.data]);
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
    statuses: config.statuses
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
