import { useMemo } from 'react';

import { useDirectoryCompanySearch } from '@/hooks/useDirectoryCompanySearch';

import type {
  CompanySearchGroup,
  CompanySearchStatusFilter,
} from './entityOnboarding.types';
import {
  filterCompanySearchGroups,
  groupCompanySearchResults,
} from './entityOnboarding.utils';

interface UseOnboardingCompanySearchInput {
  deferredDepartmentFilter: string;
  deferredSearchDraft: string;
  departmentFilter: string;
  enabled: boolean;
  searchDraft: string;
  statusFilter: CompanySearchStatusFilter;
}

interface OnboardingCompanySearch {
  companyGroups: CompanySearchGroup[];
  hasStatusFilteredOutResults: boolean;
  isSearchFetching: boolean;
  isSearchStale: boolean;
}

export const useOnboardingCompanySearch = ({
  deferredDepartmentFilter,
  deferredSearchDraft,
  departmentFilter,
  enabled,
  searchDraft,
  statusFilter,
}: UseOnboardingCompanySearchInput): OnboardingCompanySearch => {
  const companySearchQuery = useDirectoryCompanySearch(
    {
      query: searchDraft,
      department: departmentFilter || undefined,
    },
    enabled,
  );

  const rawCompanyGroups = useMemo(
    () => groupCompanySearchResults(companySearchQuery.data?.companies ?? []),
    [companySearchQuery.data?.companies],
  );
  const companyGroups = useMemo(
    () => filterCompanySearchGroups(rawCompanyGroups, statusFilter),
    [rawCompanyGroups, statusFilter],
  );
  const hasStatusFilteredOutResults =
    statusFilter !== 'all' &&
    rawCompanyGroups.length > 0 &&
    companyGroups.length === 0;
  const isSearchStale =
    searchDraft.trim() !== deferredSearchDraft ||
    departmentFilter.trim() !== deferredDepartmentFilter ||
    companySearchQuery.isFetching;

  return {
    companyGroups,
    hasStatusFilteredOutResults,
    isSearchFetching: companySearchQuery.isFetching,
    isSearchStale,
  };
};
