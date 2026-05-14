import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import type { TierV1SearchInput } from 'shared/schemas/tier-v1.schema';
import { searchEntitiesUnified } from '@/services/entities/searchEntitiesUnified';
import { entityUnifiedSearchKey } from '@/services/query/queryKeys';
import { useNotifyError } from './useNotifyError';

const SEARCH_DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 2;

export const useUnifiedEntitySearch = (
  input: TierV1SearchInput,
  enabled = true
) => {
  const normalizedQuery = input.query.trim();
  const [debouncedInput, setDebouncedInput] = useState<TierV1SearchInput>({
    ...input,
    query: normalizedQuery
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedInput({
        ...input,
        query: normalizedQuery
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [
    input.agency_id,
    input.client_filter,
    input.family,
    input.include_archived,
    input.limit,
    input.prospect_filter,
    normalizedQuery
  ]);

  const query = useQuery({
    queryKey: entityUnifiedSearchKey(debouncedInput),
    queryFn: () => searchEntitiesUnified(debouncedInput),
    enabled: enabled && Boolean(debouncedInput.agency_id) && debouncedInput.query.length >= MIN_QUERY_LENGTH,
    placeholderData: keepPreviousData,
    staleTime: 60_000
  });

  useNotifyError(query.error, 'Impossible de rechercher les tiers', 'useUnifiedEntitySearch');

  return query;
};
