import type { Dispatch, SetStateAction } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import type { DirectoryCompanySearchResult } from 'shared/schemas/directory.schema';
import type { ClientPayload } from '@/services/clients/saveClient';
import type { EntityPayload } from '@/services/entities/saveEntity';
import type { UserRole } from '@/types';

import type {
  OnboardingFormInput,
  OnboardingValues,
} from './entityOnboarding.schema';
import type {
  EntityOnboardingSeed,
  OnboardingIntent,
} from './entityOnboarding.types';
import type { EntityOnboardingStepper } from './entityOnboardingSteps';
import { useOnboardingCloseGuard } from './useOnboardingCloseGuard';
import { useOnboardingIntentControls } from './useOnboardingIntentControls';
import { useOnboardingNavigation } from './useOnboardingNavigation';
import { useOnboardingSubmit } from './useOnboardingSubmit';

type SavedEntityResult = {
  id?: string;
  client_number?: string | null;
};

interface UseOnboardingFlowActionsInput {
  activeAgencyId: string | null;
  allowManualEntry: boolean;
  applyCompany: (company: DirectoryCompanySearchResult) => void;
  clearOfficialSelection: () => void;
  currentStepIndex: number;
  displaySelectedCompany: DirectoryCompanySearchResult | undefined;
  effectiveIntent: OnboardingIntent;
  form: UseFormReturn<OnboardingFormInput, unknown, OnboardingValues>;
  hasUnsavedProgress: boolean;
  initialEntity: EntityOnboardingSeed | null;
  initialManualEntry: boolean;
  intents: OnboardingIntent[];
  isIndividualClient: boolean;
  isSaving: boolean;
  manualEntry: boolean;
  onComplete:
    | ((result: {
        intent: OnboardingIntent;
        client_number?: string | null;
        entity_id?: string | null;
      }) => void)
    | undefined;
  onOpenChange: (open: boolean) => void;
  onSaveClient?: (payload: ClientPayload) => Promise<SavedEntityResult | void>;
  onSaveProspect?: (payload: EntityPayload) => Promise<SavedEntityResult | void>;
  onboardingConfig: Parameters<typeof useOnboardingIntentControls>[0]['onboardingConfig'];
  open: boolean;
  selectedCompany: DirectoryCompanySearchResult | undefined;
  setIsCloseConfirmOpen: Dispatch<SetStateAction<boolean>>;
  setIsSaving: Dispatch<SetStateAction<boolean>>;
  setManualEntry: Dispatch<SetStateAction<boolean>>;
  setStepError: Dispatch<SetStateAction<string | null>>;
  shouldSkipIntent: boolean;
  stepper: EntityOnboardingStepper;
  userRole: UserRole;
  values: OnboardingValues;
}

export const useOnboardingFlowActions = ({
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
}: UseOnboardingFlowActionsInput) => {
  const closeGuard = useOnboardingCloseGuard({
    open,
    isSaving,
    hasUnsavedProgress,
    onOpenChange,
    setIsCloseConfirmOpen,
  });
  const intentControls = useOnboardingIntentControls({
    clearOfficialSelection,
    form,
    initialAccountType: initialEntity?.account_type,
    initialManualEntry,
    intents,
    onboardingConfig,
    setManualEntry,
    setStepError,
  });
  const navigation = useOnboardingNavigation({
    allowManualEntry,
    applyCompany,
    currentStepIndex,
    displaySelectedCompany,
    effectiveIntent,
    form,
    isIndividualClient,
    manualEntry,
    selectedCompany,
    setManualEntry,
    setStepError,
    shouldSkipIntent,
    stepper,
    values,
  });
  const handleSubmit = useOnboardingSubmit({
    activeAgencyId,
    effectiveIntent,
    initialEntity,
    isIndividualClient,
    onComplete,
    onOpenChange,
    onSaveClient,
    onSaveProspect,
    setIsSaving,
    setStepError,
    stepper,
    userRole,
    values,
  });

  return {
    ...closeGuard,
    ...intentControls,
    ...navigation,
    handleSubmit,
  };
};
