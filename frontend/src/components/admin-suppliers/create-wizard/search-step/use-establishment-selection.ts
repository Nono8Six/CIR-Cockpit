import { useMemo, useState } from 'react';

import type { DirectoryCompanySearchResult } from '../../../../../../shared/schemas/system/directory.schema';
import type { CompanySearchGroup } from '../../../entity-onboarding/entityOnboarding.types';
import getEstablishmentLabel from '../get-establishment-label';

/**
 * Custom hook to manage the selection, filtering, and local pagination of establishments
 * within a selected company search result group.
 * @param {CompanySearchGroup[]} visibleGroups - The list of currently visible company groups.
 * @returns {object} The selection state and action handlers.
 */
const useEstablishmentSelection = (visibleGroups: CompanySearchGroup[]) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<DirectoryCompanySearchResult | null>(null);
  const [localEstablishmentFilter, setLocalEstablishmentFilter] = useState('');
  const [localEstablishmentPage, setLocalEstablishmentPage] = useState(1);

  const selectedGroup = useMemo<CompanySearchGroup | null>(() => {
    if (selectedCompany?.siret) {
      const selectedCompanyGroup = visibleGroups.find((group) =>
        group.establishments.some((establishment) => establishment.siret === selectedCompany.siret)
      );
      if (selectedCompanyGroup) return selectedCompanyGroup;
    }

    return visibleGroups.find((group) => group.id === selectedGroupId) ?? null;
  }, [selectedCompany, selectedGroupId, visibleGroups]);

  // Local filtering logic for establishments within selected group
  const filteredEstablishments = useMemo(() => {
    if (!selectedGroup) return [];
    const filterQuery = localEstablishmentFilter.trim().toLowerCase();
    if (!filterQuery) return selectedGroup.establishments;
    return selectedGroup.establishments.filter((est) => {
      const label = getEstablishmentLabel(est).toLowerCase();
      const address = (est.address ?? '').toLowerCase();
      const estCity = (est.city ?? '').toLowerCase();
      const cp = (est.postal_code ?? '').toLowerCase();
      const siret = (est.siret ?? '').toLowerCase();
      const naf = (est.naf_code ?? '').toLowerCase();
      return (
        label.includes(filterQuery) ||
        address.includes(filterQuery) ||
        estCity.includes(filterQuery) ||
        cp.includes(filterQuery) ||
        siret.includes(filterQuery) ||
        naf.includes(filterQuery)
      );
    });
  }, [selectedGroup, localEstablishmentFilter]);

  const establishmentsPerPage = 10;
  const totalPages = Math.ceil(filteredEstablishments.length / establishmentsPerPage);
  const currentPage = Math.min(Math.max(1, localEstablishmentPage), Math.max(1, totalPages));

  const paginatedEstablishments = useMemo(() => {
    const startIndex = (currentPage - 1) * establishmentsPerPage;
    return filteredEstablishments.slice(startIndex, startIndex + establishmentsPerPage);
  }, [filteredEstablishments, currentPage]);

  /**
   * Handles selection/toggling of a company search group.
   * @param {CompanySearchGroup} group - The selected group.
   */
  const handleGroupSelect = (group: CompanySearchGroup) => {
    setSelectedGroupId(group.id === selectedGroupId ? null : group.id);
    setSelectedCompany(null);
    setLocalEstablishmentFilter('');
    setLocalEstablishmentPage(1);
  };

  /**
   * Handles selection of a specific establishment.
   * @param {DirectoryCompanySearchResult} company - The selected establishment.
   */
  const handleEstablishmentSelect = (company: DirectoryCompanySearchResult) => {
    setSelectedCompany(company);
    const groupKey = company.siren ?? company.official_name ?? company.name;
    if (groupKey !== selectedGroupId) {
      setSelectedGroupId(groupKey);
      setLocalEstablishmentFilter('');
      setLocalEstablishmentPage(1);
    }
  };

  return {
    selectionState: {
      selectedGroupId,
      selectedCompany,
      localEstablishmentFilter,
      localEstablishmentPage
    },
    actions: {
      setSelectedGroupId,
      setSelectedCompany,
      setLocalEstablishmentFilter,
      setLocalEstablishmentPage,
      handleGroupSelect,
      handleEstablishmentSelect
    },
    computed: {
      selectedGroup,
      filteredEstablishments,
      totalPages,
      currentPage,
      paginatedEstablishments
    }
  };
};

export default useEstablishmentSelection;
