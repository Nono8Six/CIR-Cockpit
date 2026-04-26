import { useEffect, type Dispatch, type RefObject, type SetStateAction } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import type { ProductOnboardingConfig } from 'shared/schemas/config.schema';
import type { DirectoryCompanySearchResult } from 'shared/schemas/directory.schema';

import {
  type OnboardingFormInput,
  type OnboardingValues,
} from './entityOnboarding.schema';
import type {
  CompanySearchGroup,
  CompanySearchStatusFilter,
  EntityOnboardingSeed,
  OnboardingIntent,
} from './entityOnboarding.types';
import { buildValues } from './entityOnboarding.utils';
import type { EntityOnboardingStepper } from './entityOnboardingSteps';

interface UseOnboardingFlowEffectsInput {
  activeAgencyId: string | null;
  allowManualEntry: boolean;
  clearOfficialSelection: () => void;
  companyGroups: CompanySearchGroup[];
  form: UseFormReturn<OnboardingFormInput, unknown, OnboardingValues>;
  hasInitializedOpenRef: RefObject<boolean>;
  initialEntity: EntityOnboardingSeed | null;
  initialManualEntry: boolean;
  isConfigReady: boolean;
  manualEntry: boolean;
  onboardingConfig: ProductOnboardingConfig;
  open: boolean;
  resolvedIntent: OnboardingIntent;
  selectedCompany: DirectoryCompanySearchResult | undefined;
  selectedGroupId: string | null;
  setDepartmentFilter: Dispatch<SetStateAction<string>>;
  setIsCloseConfirmOpen: Dispatch<SetStateAction<boolean>>;
  setIsSaving: Dispatch<SetStateAction<boolean>>;
  setManualEntry: Dispatch<SetStateAction<boolean>>;
  setSearchDraft: Dispatch<SetStateAction<string>>;
  setSelectedGroupId: Dispatch<SetStateAction<string | null>>;
  setStatusFilter: Dispatch<SetStateAction<CompanySearchStatusFilter>>;
  setStepError: Dispatch<SetStateAction<string | null>>;
  shouldSkipIntent: boolean;
  statusFilter: CompanySearchStatusFilter;
  stepper: EntityOnboardingStepper;
}

export const useOnboardingFlowEffects = ({
  activeAgencyId,
  allowManualEntry,
  clearOfficialSelection,
  companyGroups,
  form,
  hasInitializedOpenRef,
  initialEntity,
  initialManualEntry,
  isConfigReady,
  manualEntry,
  onboardingConfig,
  open,
  resolvedIntent,
  selectedCompany,
  selectedGroupId,
  setDepartmentFilter,
  setIsCloseConfirmOpen,
  setIsSaving,
  setManualEntry,
  setSearchDraft,
  setSelectedGroupId,
  setStatusFilter,
  setStepError,
  shouldSkipIntent,
  statusFilter,
  stepper,
}: UseOnboardingFlowEffectsInput): void => {
  useEffect(() => {
    if (initialManualEntry) {
      if (!manualEntry) {
        setManualEntry(true);
      }
      return;
    }

    if (!allowManualEntry && manualEntry) {
      setManualEntry(false);
    }
  }, [allowManualEntry, initialManualEntry, manualEntry, setManualEntry]);

  useEffect(() => {
    if (!selectedGroupId) {
      return;
    }

    if (companyGroups.some((group) => group.id === selectedGroupId)) {
      return;
    }

    setSelectedGroupId(null);
  }, [companyGroups, selectedGroupId, setSelectedGroupId]);

  useEffect(() => {
    if (statusFilter === 'all' || !selectedCompany?.siret) {
      return;
    }

    const isSelectionVisible = companyGroups.some((group) =>
      group.establishments.some(
        (establishment) => establishment.siret === selectedCompany.siret,
      ),
    );
    if (isSelectionVisible) {
      return;
    }

    clearOfficialSelection();
  }, [
    clearOfficialSelection,
    companyGroups,
    selectedCompany?.siret,
    statusFilter,
  ]);

  useEffect(() => {
    if (!open) {
      hasInitializedOpenRef.current = false;
      return;
    }

    if (!isConfigReady || hasInitializedOpenRef.current) {
      return;
    }

    hasInitializedOpenRef.current = true;
    form.reset(
      buildValues(
        activeAgencyId,
        resolvedIntent,
        initialEntity,
        onboardingConfig,
      ),
    );
    stepper.metadata.reset();
    stepper.navigation.reset();
    if (shouldSkipIntent) {
      stepper.navigation.goTo('company');
    }

    queueMicrotask(() => {
      setSearchDraft(initialEntity?.name ?? '');
      setDepartmentFilter(initialEntity?.department ?? '');
      setStatusFilter('all');
      setManualEntry(initialManualEntry);
      setSelectedGroupId(null);
      setStepError(null);
      setIsSaving(false);
      setIsCloseConfirmOpen(false);
    });
  }, [
    activeAgencyId,
    form,
    hasInitializedOpenRef,
    initialEntity,
    initialManualEntry,
    isConfigReady,
    onboardingConfig,
    open,
    resolvedIntent,
    setDepartmentFilter,
    setIsCloseConfirmOpen,
    setIsSaving,
    setManualEntry,
    setSearchDraft,
    setSelectedGroupId,
    setStatusFilter,
    setStepError,
    shouldSkipIntent,
    stepper.metadata,
    stepper.navigation,
  ]);
};
