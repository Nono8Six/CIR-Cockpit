import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  onboardingFormSchema,
  type OnboardingFormInput,
  type OnboardingValues,
} from './entityOnboarding.schema';
import {
  STEP_DEFINITIONS,
  type EntityOnboardingStepper,
  useEntityOnboardingStepper,
} from './entityOnboardingSteps';
import type {
  EntityOnboardingFlowState,
  UseEntityOnboardingFlowInput,
} from './useEntityOnboardingFlow.types';
import type {
  OnboardingIntent,
} from './entityOnboarding.types';
import { buildValues } from './entityOnboarding.utils';
import { useOnboardingConfig } from './useOnboardingConfig';
import { useOnboardingCompanyData } from './useOnboardingCompanyData';
import { useOnboardingFlowActions } from './useOnboardingFlowActions';
import { useOnboardingFlowEffects } from './useOnboardingFlowEffects';
import { useOnboardingLocalState } from './useOnboardingLocalState';
import { useOnboardingValues } from './useOnboardingValues';

export { STEP_DEFINITIONS };
export type { EntityOnboardingStepper };
export type { EntityOnboardingFlowState, UseEntityOnboardingFlowInput };

export const useEntityOnboardingFlow = ({
  open,
  onOpenChange,
  userRole,
  activeAgencyId,
  mode,
  defaultIntent,
  allowedIntents,
  initialEntity,
  onSaveClient,
  onSaveProspect,
  onComplete,
}: UseEntityOnboardingFlowInput): EntityOnboardingFlowState => {
  const resolvedIntent: OnboardingIntent =
    mode === 'convert' ? 'client' : defaultIntent;
  const intents: OnboardingIntent[] =
    allowedIntents ?? (mode === 'convert' ? ['client'] : ['client', 'prospect']);
  const shouldSkipIntent = mode !== 'convert' && intents.length === 1;
  const isIntentLocked = !shouldSkipIntent && intents.length === 1;

  const { onboardingConfig, departmentOptions, isConfigReady } =
    useOnboardingConfig(activeAgencyId, open);
  const initialManualEntry =
    initialEntity?.client_kind === 'individual' ||
    (mode === 'convert' && !initialEntity?.name);

  const stepper = useEntityOnboardingStepper({
    initialStep: shouldSkipIntent ? 'company' : 'intent',
  });
  const form = useForm<OnboardingFormInput, unknown, OnboardingValues>({
    resolver: zodResolver(onboardingFormSchema),
    defaultValues: buildValues(
      activeAgencyId,
      resolvedIntent,
      initialEntity,
      onboardingConfig,
    ),
  });

  const localState = useOnboardingLocalState(initialEntity, initialManualEntry);
  const {
    deferredDepartmentFilter,
    deferredSearchDraft,
    departmentFilter,
    hasInitializedOpenRef,
    isCloseConfirmOpen,
    isSaving,
    manualEntry,
    reducedMotion,
    searchDraft,
    selectedGroupId,
    setDepartmentFilter,
    setIsCloseConfirmOpen,
    setIsSaving,
    setManualEntry,
    setSearchDraft,
    setSelectedGroupId,
    setStatusFilter,
    setStepError,
    statusFilter,
    stepError,
  } = localState;
  const values = useOnboardingValues({
    activeAgencyId,
    form,
    initialEntity,
    onboardingConfig,
    resolvedIntent,
  });

  const effectiveIntent: OnboardingIntent = shouldSkipIntent
    ? (intents[0] ?? resolvedIntent)
    : values.intent;
  const isIndividualClient =
    effectiveIntent === 'client' && values.client_kind === 'individual';
  const allowManualEntry = onboardingConfig.allow_manual_entry;
  const currentStepIndex = stepper.state.current.index;

  const {
    applyCompany,
    canContinueCompany,
    clearOfficialSelection,
    companyGroups,
    companyDetails,
    companyDetailsUnavailable,
    companyDetailsLoading,
    displaySelectedCompany,
    duplicateMatches,
    duplicatesFetching,
    handleGroupSelect,
    hasStatusFilteredOutResults,
    isSearchFetching,
    isSearchStale,
    missingChecklist,
    selectedCompany,
    selectedGroup,
  } = useOnboardingCompanyData({
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
  });

  useOnboardingFlowEffects({
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
  });

  const hasLocalDraft =
    searchDraft.trim() !== (initialEntity?.name ?? '').trim() ||
    departmentFilter.trim() !== (initialEntity?.department ?? '').trim() ||
    statusFilter !== 'all' ||
    manualEntry !== initialManualEntry ||
    selectedGroupId !== null;
  const hasUnsavedProgress = form.formState.isDirty || hasLocalDraft;

  const {
    confirmClose,
    goToCompletedStep,
    handleClientKindChange,
    handleDialogOpenChange,
    handleIntentChange,
    handleBack,
    handleCompanyNext,
    handleDetailsNext,
    handleSubmit,
    requestClose,
    toggleManualEntry,
  } = useOnboardingFlowActions({
    activeAgencyId,
    allowManualEntry,
    applyCompany,
    clearOfficialSelection,
    currentStepIndex,
    displaySelectedCompany,
    effectiveIntent,
    form,
    hasUnsavedProgress,
    initialEntity,
    initialManualEntry,
    intents,
    isIndividualClient,
    isSaving,
    manualEntry,
    onComplete,
    onOpenChange,
    onSaveClient,
    onSaveProspect,
    onboardingConfig,
    open,
    selectedCompany,
    setIsCloseConfirmOpen,
    setIsSaving,
    setManualEntry,
    setStepError,
    shouldSkipIntent,
    stepper,
    userRole,
    values,
  });

  return {
    form,
    stepper,
    values,
    effectiveIntent,
    isIndividualClient,
    intents,
    isIntentLocked,
    shouldSkipIntent,
    currentStepIndex,
    onboardingConfig,
    departmentOptions,
    isConfigReady,

    searchDraft,
    setSearchDraft,
    departmentFilter,
    setDepartmentFilter,
    statusFilter,
    setStatusFilter,
    manualEntry,
    allowManualEntry,
    toggleManualEntry,

    companyGroups,
    hasStatusFilteredOutResults,
    selectedGroup,
    displaySelectedCompany,
    isSearchFetching,
    isSearchStale,

    duplicateMatches,
    duplicatesFetching,

    companyDetails,
    companyDetailsUnavailable,
    companyDetailsLoading,

    missingChecklist,
    canContinueCompany,

    stepError,
    isSaving,
    isCloseConfirmOpen,
    setIsCloseConfirmOpen,

    reducedMotion,

    handleIntentChange,
    handleClientKindChange,
    handleGroupSelect,
    applyCompany,
    handleCompanyNext,
    handleDetailsNext,
    handleBack,
    handleSubmit,
    requestClose,
    confirmClose,
    handleDialogOpenChange,
    goToCompletedStep,
  };
};
