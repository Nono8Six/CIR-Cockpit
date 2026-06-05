import { useMemo } from 'react';

import { useDirectoryCompanySearch } from '../../hooks/directory/company/useDirectoryCompanySearch';

import type {
  CompanySearchHeadOfficeFilter,
  CompanySearchGroup,
  CompanySearchStatusFilter,
} from './entityOnboarding.types';
import {
  filterCompanySearchGroups,
  groupCompanySearchResults,
} from './entityOnboarding.utils';

interface UseOnboardingCompanySearchInput {
  activitySectionFilter: string;
  cityFilter: string;
  deferredActivitySectionFilter: string;
  deferredCityFilter: string;
  deferredDepartmentFilter: string;
  deferredHeadOfficeFilter: CompanySearchHeadOfficeFilter;
  deferredNafCodeFilter: string;
  deferredPostalCodeFilter: string;
  deferredSearchDraft: string;
  departmentFilter: string;
  enabled: boolean;
  headOfficeFilter: CompanySearchHeadOfficeFilter;
  nafCodeFilter: string;
  postalCodeFilter: string;
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
  activitySectionFilter,
  cityFilter,
  deferredActivitySectionFilter,
  deferredCityFilter,
  deferredDepartmentFilter,
  deferredHeadOfficeFilter,
  deferredNafCodeFilter,
  deferredPostalCodeFilter,
  deferredSearchDraft,
  departmentFilter,
  enabled,
  headOfficeFilter,
  nafCodeFilter,
  postalCodeFilter,
  searchDraft,
  statusFilter,
}: UseOnboardingCompanySearchInput): OnboardingCompanySearch => {
  const companySearchQuery = useDirectoryCompanySearch(
    {
      query: searchDraft,
      department: departmentFilter || undefined,
      city: cityFilter || undefined,
      postal_code: postalCodeFilter || undefined,
      naf_code: nafCodeFilter || undefined,
      activity_section: activitySectionFilter || undefined,
      head_office: headOfficeFilter,
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
    postalCodeFilter.trim() !== deferredPostalCodeFilter ||
    cityFilter.trim() !== deferredCityFilter ||
    nafCodeFilter.trim() !== deferredNafCodeFilter ||
    activitySectionFilter.trim() !== deferredActivitySectionFilter ||
    headOfficeFilter !== deferredHeadOfficeFilter ||
    companySearchQuery.isFetching;

  return {
    companyGroups,
    hasStatusFilteredOutResults,
    isSearchFetching: companySearchQuery.isFetching,
    isSearchStale,
  };
};
