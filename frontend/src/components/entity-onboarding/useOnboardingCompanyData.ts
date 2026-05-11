import {
  useCallback,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { UseFormReturn } from 'react-hook-form';

import type { DirectoryCompanySearchResult } from 'shared/schemas/directory.schema';

import { useDirectoryCompanyDetails } from '@/hooks/useDirectoryCompanyDetails';
import type { UserRole } from '@/types';

import {
  type OnboardingFormInput,
  type OnboardingValues,
} from './entityOnboarding.schema';
import { getMissingChecklist } from './entityOnboardingChecklist';
import type {
  CompanySearchStatusFilter,
  OnboardingIntent,
} from './entityOnboarding.types';
import type { EntityOnboardingStepper } from './entityOnboardingSteps';
import { useOnboardingCompanySelection } from './useOnboardingCompanySelection';
import { useOnboardingCompanySearch } from './useOnboardingCompanySearch';
import { useOnboardingDuplicateChecks } from './useOnboardingDuplicateChecks';

interface UseOnboardingCompanyDataInput {
  activeAgencyId: string | null;
  deferredDepartmentFilter: string;
  deferredSearchDraft: string;
  departmentFilter: string;
  effectiveIntent: OnboardingIntent;
  form: UseFormReturn<OnboardingFormInput, unknown, OnboardingValues>;
  isIndividualClient: boolean;
  manualEntry: boolean;
  open: boolean;
  searchDraft: string;
  selectedGroupId: string | null;
  setSelectedGroupId: Dispatch<SetStateAction<string | null>>;
  setStepError: Dispatch<SetStateAction<string | null>>;
  statusFilter: CompanySearchStatusFilter;
  stepper: EntityOnboardingStepper;
  userRole: UserRole;
  values: OnboardingValues;
}

export const useOnboardingCompanyData = ({
  activeAgencyId,
  deferredDepartmentFilter,
  deferredSearchDraft,
  departmentFilter,
  effectiveIntent,
  form,
  isIndividualClient,
  manualEntry,
  open,
  searchDraft,
  selectedGroupId,
  setSelectedGroupId,
  setStepError,
  statusFilter,
  stepper,
  userRole,
  values,
}: UseOnboardingCompanyDataInput) => {
  const selectedCompany = stepper.metadata.get('company')?.selectedCompany as
    | DirectoryCompanySearchResult
    | undefined;
  const setSelectedCompany = useCallback(
    (company: DirectoryCompanySearchResult | null) => {
      stepper.metadata.set('company', { selectedCompany: company });
    },
    [stepper.metadata],
  );
  const search = useOnboardingCompanySearch({
    deferredDepartmentFilter,
    deferredSearchDraft,
    departmentFilter,
    enabled:
      open && stepper.flow.is('company') && !manualEntry && !isIndividualClient,
    searchDraft,
    statusFilter,
  });
  const selection = useOnboardingCompanySelection({
    companyGroups: search.companyGroups,
    form,
    manualEntry,
    selectedCompany,
    selectedGroupId,
    setSelectedCompany,
    setSelectedGroupId,
    setStepError,
    statusFilter,
  });
  const duplicates = useOnboardingDuplicateChecks({
    activeAgencyId,
    displaySelectedCompany: selection.displaySelectedCompany,
    isIndividualClient,
    manualEntry,
    open,
    stepperIsCompany: stepper.flow.is('company'),
    userRole,
    values,
  });
  const companyDetailsSiren =
    selection.displaySelectedCompany?.siren ?? selection.selectedGroup?.siren ?? '';
  const companyDetailsQuery = useDirectoryCompanyDetails(
    { siren: companyDetailsSiren },
    open &&
      !manualEntry &&
      !isIndividualClient &&
      companyDetailsSiren.trim().length === 9,
  );
  const missingChecklist = useMemo(
    () => getMissingChecklist(values, effectiveIntent),
    [effectiveIntent, values],
  );

  return {
    ...search,
    ...selection,
    ...duplicates,
    canContinueCompany:
      isIndividualClient ||
      manualEntry ||
      Boolean(selection.displaySelectedCompany),
    companyDetails: companyDetailsQuery.data,
    companyDetailsUnavailable: companyDetailsQuery.isError,
    companyDetailsLoading: companyDetailsQuery.isLoading,
    missingChecklist,
    selectedCompany,
  };
};
