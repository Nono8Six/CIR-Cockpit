import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { type DirectoryCompanySearchInput } from '../../../../../shared/schemas/system/directory.schema';
import { getDirectoryCompanySearch } from '@/services/directory/getDirectoryCompanySearch';
import { directoryCompanySearchKey } from '@/services/query/queryKeys';
import { useNotifyError } from '../../cockpit-utils/useNotifyError';

export const useDirectoryCompanySearch = (
  input: DirectoryCompanySearchInput,
  enabled = true,
  options: {
    debounceMs?: number;
    keepPreviousData?: boolean;
    notifyOnError?: boolean;
    retry?: boolean | number;
  } = {}
) => {
  const normalizedQuery = input.query.trim();
  const normalizedDepartment = input.department?.trim() ?? '';
  const normalizedCity = input.city?.trim() ?? '';
  const normalizedPostalCode = input.postal_code?.trim() ?? '';
  const normalizedNafCode = input.naf_code?.trim() ?? '';
  const normalizedActivitySection = input.activity_section?.trim() ?? '';
  const normalizedHeadOffice = input.head_office ?? 'all';
  const normalizedPage = input.page ?? 1;
  const normalizedPerPage = input.per_page ?? 20;
  const debounceMs = options.debounceMs ?? 450;
  const [debouncedInput, setDebouncedInput] = useState({
    query: normalizedQuery,
    department: normalizedDepartment,
    city: normalizedCity,
    postal_code: normalizedPostalCode,
    naf_code: normalizedNafCode,
    activity_section: normalizedActivitySection,
    head_office: normalizedHeadOffice,
    page: normalizedPage,
    per_page: normalizedPerPage
  });

  useEffect(() => {
    if (debounceMs <= 0) {
      setDebouncedInput({
        query: normalizedQuery,
        department: normalizedDepartment,
        city: normalizedCity,
        postal_code: normalizedPostalCode,
        naf_code: normalizedNafCode,
        activity_section: normalizedActivitySection,
        head_office: normalizedHeadOffice,
        page: normalizedPage,
        per_page: normalizedPerPage
      });
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setDebouncedInput({
        query: normalizedQuery,
        department: normalizedDepartment,
        city: normalizedCity,
        postal_code: normalizedPostalCode,
        naf_code: normalizedNafCode,
        activity_section: normalizedActivitySection,
        head_office: normalizedHeadOffice,
        page: normalizedPage,
        per_page: normalizedPerPage
      });
    }, debounceMs);

    return () => window.clearTimeout(timeoutId);
  }, [
    debounceMs,
    normalizedActivitySection,
    normalizedCity,
    normalizedDepartment,
    normalizedHeadOffice,
    normalizedNafCode,
    normalizedPage,
    normalizedPerPage,
    normalizedPostalCode,
    normalizedQuery
  ]);

  const queryInput: DirectoryCompanySearchInput = {
    query: debouncedInput.query,
    department: debouncedInput.department || undefined,
    city: debouncedInput.city || undefined,
    postal_code: debouncedInput.postal_code || undefined,
    naf_code: debouncedInput.naf_code || undefined,
    activity_section: debouncedInput.activity_section || undefined,
    head_office: debouncedInput.head_office,
    page: debouncedInput.page,
    per_page: debouncedInput.per_page
  };

  const query = useQuery({
    queryKey: directoryCompanySearchKey(queryInput),
    queryFn: () => getDirectoryCompanySearch(queryInput),
    enabled: enabled && debouncedInput.query.length >= 3,
    placeholderData: options.keepPreviousData === false ? undefined : keepPreviousData,
    retry: options.retry ?? false,
    staleTime: 5 * 60_000
  });

  useNotifyError(
    options.notifyOnError === false ? null : query.error,
    "Impossible de rechercher l'entreprise",
    'useDirectoryCompanySearch'
  );

  return query;
};
