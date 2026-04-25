import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import type { DirectoryCompanySearchResult } from 'shared/schemas/directory.schema';

import type {
  OnboardingFormInput,
  OnboardingValues,
} from './entityOnboarding.schema';
import type {
  CompanySearchGroup,
  CompanySearchStatusFilter,
} from './entityOnboarding.types';

interface UseOnboardingCompanySelectionInput {
  companyGroups: CompanySearchGroup[];
  form: UseFormReturn<OnboardingFormInput, unknown, OnboardingValues>;
  manualEntry: boolean;
  selectedCompany: DirectoryCompanySearchResult | undefined;
  selectedGroupId: string | null;
  setSelectedCompany: (company: DirectoryCompanySearchResult | null) => void;
  setSelectedGroupId: Dispatch<SetStateAction<string | null>>;
  setStepError: Dispatch<SetStateAction<string | null>>;
  statusFilter: CompanySearchStatusFilter;
}

interface OnboardingCompanySelection {
  applyCompany: (company: DirectoryCompanySearchResult) => void;
  clearOfficialSelection: () => void;
  displaySelectedCompany: DirectoryCompanySearchResult | undefined;
  handleGroupSelect: (groupId: string) => void;
  selectedGroup: CompanySearchGroup | null;
}

export const useOnboardingCompanySelection = ({
  companyGroups,
  form,
  manualEntry,
  selectedCompany,
  selectedGroupId,
  setSelectedCompany,
  setSelectedGroupId,
  setStepError,
  statusFilter,
}: UseOnboardingCompanySelectionInput): OnboardingCompanySelection => {
  const clearOfficialSelection = useCallback(() => {
    form.setValue('siret', '', { shouldDirty: true });
    form.setValue('siren', '', { shouldDirty: true });
    form.setValue('naf_code', '', { shouldDirty: true });
    form.setValue('official_name', '', { shouldDirty: true });
    form.setValue('official_data_source', null, { shouldDirty: true });
    form.setValue('official_data_synced_at', '', { shouldDirty: true });
    setSelectedCompany(null);
  }, [form, setSelectedCompany]);

  const applyCompany = useCallback(
    (company: DirectoryCompanySearchResult) => {
      form.setValue('name', company.official_name ?? company.name, {
        shouldDirty: true,
        shouldValidate: true,
      });
      form.setValue('address', company.address ?? '', { shouldDirty: true });
      form.setValue('postal_code', company.postal_code ?? '', { shouldDirty: true });
      form.setValue('department', company.department ?? '', { shouldDirty: true });
      form.setValue('city', company.city ?? '', {
        shouldDirty: true,
        shouldValidate: true,
      });
      form.setValue('siret', company.siret ?? '', { shouldDirty: true });
      form.setValue('siren', company.siren ?? '', { shouldDirty: true });
      form.setValue('naf_code', company.naf_code ?? '', { shouldDirty: true });
      form.setValue('official_name', company.official_name ?? company.name, {
        shouldDirty: true,
      });
      form.setValue(
        'official_data_source',
        company.official_data_source === 'api-recherche-entreprises'
          ? 'api-recherche-entreprises'
          : null,
        { shouldDirty: true },
      );
      form.setValue(
        'official_data_synced_at',
        company.official_data_synced_at ?? '',
        { shouldDirty: true },
      );
      setSelectedCompany(company);
      setStepError(null);
    },
    [form, setSelectedCompany, setStepError],
  );

  const selectedGroup = useMemo<CompanySearchGroup | null>(() => {
    if (selectedCompany?.siret) {
      const selectedCompanyGroup = companyGroups.find((group) =>
        group.establishments.some(
          (establishment) => establishment.siret === selectedCompany.siret,
        ),
      );
      if (selectedCompanyGroup) {
        return selectedCompanyGroup;
      }
    }

    if (selectedGroupId) {
      const selectedGroupById = companyGroups.find(
        (group) => group.id === selectedGroupId,
      );
      if (selectedGroupById) {
        return selectedGroupById;
      }
    }

    return companyGroups.length === 1 ? (companyGroups[0] ?? null) : null;
  }, [companyGroups, selectedCompany?.siret, selectedGroupId]);

  const displaySelectedCompany =
    selectedCompany ??
    (!manualEntry &&
    statusFilter === 'all' &&
    selectedGroup?.establishments.length === 1
      ? selectedGroup.establishments[0]
      : undefined);

  const handleGroupSelect = useCallback(
    (groupId: string) => {
      setSelectedGroupId(groupId);
      const group = companyGroups.find((entry) => entry.id === groupId);
      if (!group) {
        return;
      }

      if (group.establishments.length === 1) {
        const establishment = group.establishments[0];
        if (establishment) {
          applyCompany(establishment);
        }
        return;
      }

      const currentCompanyBelongsToGroup = group.establishments.some(
        (establishment) => establishment.siret === selectedCompany?.siret,
      );
      if (!currentCompanyBelongsToGroup) {
        clearOfficialSelection();
      }
    },
    [
      applyCompany,
      clearOfficialSelection,
      companyGroups,
      selectedCompany?.siret,
      setSelectedGroupId,
    ],
  );

  return {
    applyCompany,
    clearOfficialSelection,
    displaySelectedCompany,
    handleGroupSelect,
    selectedGroup,
  };
};
