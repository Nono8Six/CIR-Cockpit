import { useMemo, useState } from 'react';

import type { DirectoryCompanySearchInput } from '../../../../../../shared/schemas/system/directory.schema';
import { useDirectoryCompanySearch } from '../../../../hooks/directory/company/useDirectoryCompanySearch';
import {
  filterCompanySearchGroups,
  groupCompanySearchResults
} from '../../../entity-onboarding/entityOnboarding.utils';
import type { HeadOfficeFilter, StatusFilter } from '../use-supplier-onboarding';

/**
 * Normalizes NAF code input.
 * @param {string} value - Raw NAF code string.
 * @returns {string} Normalized NAF code.
 */
const normalizeNafCode = (value: string): string =>
  value.trim().replace(/\s+/g, '').toUpperCase().replace(/^(\d{2})\.?(\d{2})([A-Z])$/, '$1.$2$3');

/**
 * Hook to manage search filter fields and API interactions with the company directory.
 * @returns {object} The search filter state and action handlers.
 */
const useSupplierSearchFilters = () => {
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [nafCode, setNafCode] = useState('');
  const [activitySection, setActivitySection] = useState('');
  const [headOffice, setHeadOffice] = useState<HeadOfficeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [submittedSearch, setSubmittedSearch] = useState<DirectoryCompanySearchInput | null>(null);

  const search = useDirectoryCompanySearch(
    submittedSearch ?? { query: '', page: 1, per_page: 20 },
    Boolean(submittedSearch),
    { debounceMs: 0, keepPreviousData: true, notifyOnError: false, retry: false }
  );

  const companyGroups = useMemo(
    () => groupCompanySearchResults(search.data?.companies ?? []),
    [search.data?.companies]
  );

  const visibleGroups = useMemo(
    () => filterCompanySearchGroups(companyGroups, statusFilter),
    [companyGroups, statusFilter]
  );

  /**
   * Submits the official company search form.
   * @param {(() => void)} [onSearchSubmit] - Callback when search is successfully submitted.
   */
  const submitSearch = (onSearchSubmit?: () => void) => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 3) return;
    setSubmittedSearch({
      query: normalizedQuery,
      department: department.trim() || undefined,
      postal_code: postalCode.trim() || undefined,
      city: city.trim() || undefined,
      naf_code: normalizeNafCode(nafCode) || undefined,
      activity_section: activitySection || undefined,
      head_office: headOffice,
      page: 1,
      per_page: 20
    });
    if (onSearchSubmit) {
      onSearchSubmit();
    }
  };

  return {
    filters: {
      query,
      department,
      postalCode,
      city,
      nafCode,
      activitySection,
      headOffice,
      statusFilter
    },
    actions: {
      setQuery,
      setDepartment,
      setPostalCode,
      setCity,
      setNafCode,
      setActivitySection,
      setHeadOffice,
      setStatusFilter,
      submitSearch,
      setSubmittedSearch
    },
    queryState: {
      submittedSearch,
      search,
      companyGroups,
      visibleGroups
    }
  };
};

export default useSupplierSearchFilters;
