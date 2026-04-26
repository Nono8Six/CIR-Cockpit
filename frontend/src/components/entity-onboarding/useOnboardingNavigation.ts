import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import type { DirectoryCompanySearchResult } from 'shared/schemas/directory.schema';

import {
  type OnboardingFormInput,
  type OnboardingValues,
} from './entityOnboarding.schema';
import type { OnboardingIntent } from './entityOnboarding.types';
import { getDepartmentFromPostalCode } from './entityOnboarding.utils';
import {
  STEP_DEFINITIONS,
  type EntityOnboardingStepper,
  type StepId,
} from './entityOnboardingSteps';

interface UseOnboardingNavigationInput {
  allowManualEntry: boolean;
  applyCompany: (company: DirectoryCompanySearchResult) => void;
  currentStepIndex: number;
  displaySelectedCompany: DirectoryCompanySearchResult | undefined;
  effectiveIntent: OnboardingIntent;
  form: UseFormReturn<OnboardingFormInput, unknown, OnboardingValues>;
  isIndividualClient: boolean;
  manualEntry: boolean;
  selectedCompany: DirectoryCompanySearchResult | undefined;
  setManualEntry: Dispatch<SetStateAction<boolean>>;
  setStepError: Dispatch<SetStateAction<string | null>>;
  shouldSkipIntent: boolean;
  stepper: EntityOnboardingStepper;
  values: OnboardingValues;
}

export const useOnboardingNavigation = ({
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
}: UseOnboardingNavigationInput) => {
  const handleCompanyNext = useCallback(async () => {
    if (isIndividualClient) {
      const isValid = await form.trigger([
        'first_name',
        'last_name',
        'phone',
        'email',
        'postal_code',
        'city',
      ] as never);
      if (!isValid) {
        setStepError('Renseigne l identite et au moins un moyen de contact.');
        return;
      }

      const fullName = [values.last_name, values.first_name]
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
        .join(' ');

      form.setValue('name', fullName, {
        shouldDirty: true,
        shouldValidate: true,
      });
      form.setValue(
        'department',
        values.postal_code.trim().length >= 2
          ? getDepartmentFromPostalCode(values.postal_code)
          : '',
        { shouldDirty: true },
      );
      setStepError(null);
      stepper.navigation.goTo('details');
      return;
    }

    if (!manualEntry && !selectedCompany && displaySelectedCompany) {
      applyCompany(displaySelectedCompany);
    }

    if (!displaySelectedCompany && !manualEntry) {
      setStepError(
        allowManualEntry
          ? 'Selectionne un etablissement officiel ou passe en saisie manuelle.'
          : 'Selectionne un etablissement officiel pour continuer.',
      );
      return;
    }

    setStepError(null);
    stepper.navigation.goTo('details');
  }, [
    allowManualEntry,
    applyCompany,
    displaySelectedCompany,
    form,
    isIndividualClient,
    manualEntry,
    selectedCompany,
    setStepError,
    stepper.navigation,
    values.first_name,
    values.last_name,
    values.postal_code,
  ]);

  const handleDetailsNext = useCallback(async () => {
    const fields =
      effectiveIntent === 'client'
        ? isIndividualClient
          ? [
              'name',
              'first_name',
              'last_name',
              'city',
              'postal_code',
              'agency_id',
              'client_number',
              'phone',
              'email',
            ]
          : [
              'name',
              'city',
              'agency_id',
              'address',
              'postal_code',
              'department',
              'client_number',
            ]
        : ['name', 'city', 'agency_id'];

    if (!(await form.trigger(fields as never))) {
      setStepError('Des champs obligatoires doivent encore etre completes.');
      return;
    }

    setStepError(null);
    stepper.navigation.goTo('review');
  }, [effectiveIntent, form, isIndividualClient, setStepError, stepper.navigation]);

  const handleBack = useCallback(() => {
    if (stepper.flow.is('review')) {
      stepper.navigation.goTo('details');
      return;
    }

    if (stepper.flow.is('details')) {
      stepper.navigation.goTo('company');
      return;
    }

    if (!shouldSkipIntent && stepper.flow.is('company')) {
      stepper.navigation.goTo('intent');
    }
  }, [shouldSkipIntent, stepper.flow, stepper.navigation]);

  const goToCompletedStep = useCallback(
    (stepId: string) => {
      const targetIndex = STEP_DEFINITIONS.findIndex(
        (step) => step.id === stepId,
      );
      if (targetIndex === -1 || targetIndex >= currentStepIndex) {
        return;
      }

      stepper.navigation.goTo(stepId as StepId);
    },
    [currentStepIndex, stepper.navigation],
  );

  const toggleManualEntry = useCallback(() => {
    if (!allowManualEntry) {
      return;
    }
    setManualEntry((previous) => !previous);
    setStepError(null);
  }, [allowManualEntry, setManualEntry, setStepError]);

  return {
    goToCompletedStep,
    handleBack,
    handleCompanyNext,
    handleDetailsNext,
    toggleManualEntry,
  };
};
