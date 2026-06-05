import {
  useCallback,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { UseFormReturn } from 'react-hook-form';

import type { DirectoryCompanySearchResult } from '../../../../shared/schemas/system/directory.schema';

import { useDirectoryCompanyDetails } from '../../hooks/directory/company/useDirectoryCompanyDetails';
import type { UserRole } from '@/types';

import {
  type OnboardingFormInput,
  type OnboardingValues,
} from './entityOnboarding.schema';
import { getMissingChecklist } from './entityOnboardingChecklist';
import type {
  CompanySearchHeadOfficeFilter,
  CompanySearchStatusFilter,
  OnboardingIntent,
} from './entityOnboarding.types';
import type { EntityOnboardingStepper } from './entityOnboardingSteps';
import { useOnboardingCompanySelection } from './useOnboardingCompanySelection';
import { useOnboardingCompanySearch } from './useOnboardingCompanySearch';
import { useOnboardingDuplicateChecks } from './useOnboardingDuplicateChecks';

interface UseOnboardingCompanyDataInput {
  activeAgencyId: string | null;
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
  effectiveIntent: OnboardingIntent;
  form: UseFormReturn<OnboardingFormInput, unknown, OnboardingValues>;
  headOfficeFilter: CompanySearchHeadOfficeFilter;
  isIndividualClient: boolean;
  manualEntry: boolean;
  nafCodeFilter: string;
  open: boolean;
  postalCodeFilter: string;
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
  effectiveIntent,
  form,
  headOfficeFilter,
  isIndividualClient,
  manualEntry,
  nafCodeFilter,
  open,
  postalCodeFilter,
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
    enabled:
      open && stepper.flow.is('company') && !manualEntry && !isIndividualClient,
    headOfficeFilter,
    nafCodeFilter,
    postalCodeFilter,
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
