import { useCallback, useDeferredValue, useMemo, useState } from 'react';

import type { TierV1DirectoryRow } from 'shared/schemas/tier-v1.schema';
import type { Entity, EntityContact } from '@/types';
import {
  getRelationLabelForTierType,
  relationValuesMatch
} from '@/constants/relations';
import { useUnifiedEntitySearch } from './useUnifiedEntitySearch';

type InteractionSearchInput = {
  agencyId?: string | null;
  entityType?: string;
  entities: Entity[];
  contacts: EntityContact[];
  isLoading?: boolean;
  recentEntities?: Entity[];
  onSelectEntity: (entity: Entity) => void;
  onSelectContact: (contact: EntityContact, entity: Entity | null) => void;
  onSelectSearchResult: (result: TierV1DirectoryRow) => void;
  onOpenGlobalSearch?: () => void;
};

type InteractionSearchStatus = 'loading' | 'error' | 'idle' | 'empty' | 'results';

const normalizeQuery = (value: string) => value.trim().toLowerCase();

export const useInteractionSearch = ({
  agencyId,
  entityType = '',
  isLoading = false,
  recentEntities,
  onSelectEntity,
  onSelectContact,
  onSelectSearchResult,
  onOpenGlobalSearch
}: InteractionSearchInput) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [pendingResult, setPendingResult] = useState<TierV1DirectoryRow | null>(null);
  const deferredQuery = useDeferredValue(query);
  const normalizedSearchQuery = normalizeQuery(deferredQuery);
  const unifiedSearch = useUnifiedEntitySearch({
    query: normalizedSearchQuery,
    agency_id: agencyId ?? null,
    family: 'all',
    client_filter: 'all',
    prospect_filter: 'all',
    include_archived: includeArchived,
    limit: 5
  }, Boolean(agencyId) && normalizedSearchQuery.length > 0);
  const resolvedLoading = isLoading || unifiedSearch.isFetching;
  const showSearchError = unifiedSearch.isError && !unifiedSearch.isFetching;

  const normalizedRelation = entityType.trim().toLowerCase();
  const filteredRecents = useMemo(() => {
    if (!recentEntities?.length) return [];
    if (!normalizedRelation) return recentEntities;
    return recentEntities.filter((entity) => relationValuesMatch(entity.entity_type, normalizedRelation));
  }, [normalizedRelation, recentEntities]);

  const entitiesById = useMemo(() => {
    const byId = new Map<string, Entity>();
    recentEntities?.forEach((entity) => byId.set(entity.id, entity));
    return byId;
  }, [recentEntities]);

  const showResults = query.trim().length > 0;
  const showRecents = !showResults && filteredRecents.length > 0;
  const showList = showResults || isOpen;
  const limitedResults = unifiedSearch.data?.results ?? [];
  const hasResults = limitedResults.length > 0;
  let status: InteractionSearchStatus = 'results';
  if (resolvedLoading) {
    status = 'loading';
  } else if (showSearchError) {
    status = 'error';
  } else if (!showResults && !showRecents) {
    status = 'idle';
  } else if (showResults && !hasResults) {
    status = 'empty';
  }
  const entityHeading = 'Résultats tiers';

  const clearSearch = useCallback(() => {
    setQuery('');
    setIsOpen(false);
  }, []);

  const handleSelectEntity = useCallback((entity: Entity) => {
    onSelectEntity(entity);
    clearSearch();
  }, [clearSearch, onSelectEntity]);

  const handleSelectContact = useCallback((contact: EntityContact) => {
    onSelectContact(contact, entitiesById.get(contact.entity_id) ?? null);
    clearSearch();
  }, [clearSearch, entitiesById, onSelectContact]);

  const commitSearchResult = useCallback((result: TierV1DirectoryRow) => {
    onSelectSearchResult(result);
    setPendingResult(null);
    clearSearch();
  }, [clearSearch, onSelectSearchResult]);

  const handleSelectSearchResult = useCallback((result: TierV1DirectoryRow) => {
    const selectedRelation = entityType.trim();
    const resultRelation = getRelationLabelForTierType(result.type);
    if (selectedRelation && selectedRelation !== resultRelation) {
      setPendingResult(result);
      return;
    }
    commitSearchResult(result);
  }, [commitSearchResult, entityType]);

  const handleConfirmPendingResult = useCallback(() => {
    if (!pendingResult) return;
    commitSearchResult(pendingResult);
  }, [commitSearchResult, pendingResult]);

  const handleCancelPendingResult = useCallback(() => {
    setPendingResult(null);
  }, []);

  const handleOpenGlobalSearch = useCallback(() => {
    if (!onOpenGlobalSearch) return;
    onOpenGlobalSearch();
    clearSearch();
  }, [clearSearch, onOpenGlobalSearch]);

  return {
    query,
    setQuery,
    isOpen,
    setIsOpen,
    includeArchived,
    setIncludeArchived,
    filteredRecents,
    panelState: {
      showRecents,
      showList,
      status
    },
    limitedResults,
    entityHeading,
    pendingResult,
    handleSelectEntity,
    handleSelectContact,
    handleSelectSearchResult,
    handleConfirmPendingResult,
    handleCancelPendingResult,
    handleOpenGlobalSearch
  };
};
