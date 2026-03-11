import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { type DirectoryCompanySearchInput } from 'shared/schemas/directory.schema';
import { getDirectoryCompanySearch } from '@/services/directory/getDirectoryCompanySearch';
import { directoryCompanySearchKey } from '@/services/query/queryKeys';
import { useNotifyError } from './useNotifyError';

export const useDirectoryCompanySearch = (
  input: DirectoryCompanySearchInput,
  enabled = true
) => {
  const normalizedQuery = input.query.trim();
  const normalizedDepartment = input.department?.trim() ?? '';
  const normalizedCity = input.city?.trim() ?? '';
  const [debouncedInput, setDebouncedInput] = useState({
    query: normalizedQuery,
    department: normalizedDepartment,
    city: normalizedCity
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedInput({
        query: normalizedQuery,
        department: normalizedDepartment,
        city: normalizedCity
      });
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [normalizedCity, normalizedDepartment, normalizedQuery]);

  const query = useQuery({
    queryKey: directoryCompanySearchKey({
      query: debouncedInput.query,
      department: debouncedInput.department || undefined,
      city: debouncedInput.city || undefined
    }),
    queryFn: () => getDirectoryCompanySearch({
      query: debouncedInput.query,
      department: debouncedInput.department || undefined,
      city: debouncedInput.city || undefined
    }),
    enabled: enabled && debouncedInput.query.length >= 3,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000
  });

  useNotifyError(query.error, "Impossible de rechercher l'entreprise", 'useDirectoryCompanySearch');

  return query;
};
