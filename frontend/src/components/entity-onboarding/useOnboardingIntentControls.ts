import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import type {
  OnboardingFormInput,
  OnboardingValues,
} from './entityOnboarding.schema';
import type { AccountType, OnboardingIntent } from './entityOnboarding.types';
import type { OnboardingConfig } from './useOnboardingConfig';

interface UseOnboardingIntentControlsInput {
  clearOfficialSelection: () => void;
  form: UseFormReturn<OnboardingFormInput, unknown, OnboardingValues>;
  initialAccountType: AccountType | null | undefined;
  initialManualEntry: boolean;
  intents: OnboardingIntent[];
  onboardingConfig: OnboardingConfig;
  setManualEntry: Dispatch<SetStateAction<boolean>>;
  setStepError: Dispatch<SetStateAction<string | null>>;
}

interface OnboardingIntentControls {
  handleClientKindChange: (clientKind: 'company' | 'individual') => void;
  handleIntentChange: (intent: OnboardingIntent) => void;
}

export const useOnboardingIntentControls = ({
  clearOfficialSelection,
  form,
  initialAccountType,
  initialManualEntry,
  intents,
  onboardingConfig,
  setManualEntry,
  setStepError,
}: UseOnboardingIntentControlsInput): OnboardingIntentControls => {
  const handleIntentChange = useCallback(
    (intent: OnboardingIntent) => {
      if (!intents.includes(intent)) {
        return;
      }

      form.setValue('intent', intent, { shouldDirty: true });
      if (intent !== 'client') {
        form.setValue('client_kind', 'company', { shouldDirty: true });
        form.setValue(
          'account_type',
          onboardingConfig.defaultCompanyAccountType,
          {
            shouldDirty: true,
            shouldValidate: true,
          },
        );
        form.setValue('cir_commercial_id', '', {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
      setStepError(null);
    },
    [form, intents, onboardingConfig.defaultCompanyAccountType, setStepError],
  );

  const handleClientKindChange = useCallback(
    (clientKind: 'company' | 'individual') => {
      form.setValue('client_kind', clientKind, {
        shouldDirty: true,
        shouldValidate: true,
      });

      if (clientKind === 'individual') {
        form.setValue(
          'account_type',
          onboardingConfig.individualAccountType,
          {
            shouldDirty: true,
            shouldValidate: true,
          },
        );
        form.setValue('cir_commercial_id', '', {
          shouldDirty: true,
          shouldValidate: true,
        });
        clearOfficialSelection();
        setManualEntry(true);
        setStepError(null);
        return;
      }

      form.setValue(
        'account_type',
        initialAccountType ?? onboardingConfig.defaultCompanyAccountType,
        {
          shouldDirty: true,
          shouldValidate: true,
        },
      );
      setManualEntry(initialManualEntry);
      setStepError(null);
    },
    [
      clearOfficialSelection,
      form,
      initialAccountType,
      initialManualEntry,
      onboardingConfig.defaultCompanyAccountType,
      onboardingConfig.individualAccountType,
      setManualEntry,
      setStepError,
    ],
  );

  return {
    handleClientKindChange,
    handleIntentChange,
  };
};
