import { useMemo } from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';

import type { ProductOnboardingConfig } from 'shared/schemas/config.schema';

import {
  type OnboardingFormInput,
  type OnboardingValues,
} from './entityOnboarding.schema';
import type {
  EntityOnboardingSeed,
  OnboardingIntent,
} from './entityOnboarding.types';
import { buildValues } from './entityOnboarding.utils';

interface UseOnboardingValuesInput {
  activeAgencyId: string | null;
  form: UseFormReturn<OnboardingFormInput, unknown, OnboardingValues>;
  initialEntity: EntityOnboardingSeed | null;
  onboardingConfig: ProductOnboardingConfig;
  resolvedIntent: OnboardingIntent;
}

export const useOnboardingValues = ({
  activeAgencyId,
  form,
  initialEntity,
  onboardingConfig,
  resolvedIntent,
}: UseOnboardingValuesInput): OnboardingValues => {
  const watchedValues = useWatch({ control: form.control });

  return useMemo<OnboardingValues>(() => {
    const baseValues = buildValues(
      activeAgencyId,
      resolvedIntent,
      initialEntity,
      onboardingConfig,
    );

    return {
      ...baseValues,
      ...watchedValues,
      intent: watchedValues.intent ?? baseValues.intent,
      client_kind: watchedValues.client_kind ?? baseValues.client_kind,
      name: watchedValues.name ?? baseValues.name,
      first_name: watchedValues.first_name ?? baseValues.first_name,
      last_name: watchedValues.last_name ?? baseValues.last_name,
      phone: watchedValues.phone ?? baseValues.phone,
      email: watchedValues.email ?? baseValues.email,
      address: watchedValues.address ?? baseValues.address,
      postal_code: watchedValues.postal_code ?? baseValues.postal_code,
      department: watchedValues.department ?? baseValues.department,
      city: watchedValues.city ?? baseValues.city,
      siret: watchedValues.siret ?? baseValues.siret,
      siren: watchedValues.siren ?? baseValues.siren,
      naf_code: watchedValues.naf_code ?? baseValues.naf_code,
      official_name: watchedValues.official_name ?? baseValues.official_name,
      official_data_source:
        watchedValues.official_data_source ?? baseValues.official_data_source,
      official_data_synced_at:
        watchedValues.official_data_synced_at ??
        baseValues.official_data_synced_at,
      notes: watchedValues.notes ?? baseValues.notes,
      agency_id: watchedValues.agency_id ?? baseValues.agency_id,
      client_number: watchedValues.client_number ?? baseValues.client_number,
      account_type: watchedValues.account_type ?? baseValues.account_type,
      cir_commercial_id:
        watchedValues.cir_commercial_id ?? baseValues.cir_commercial_id,
    };
  }, [
    activeAgencyId,
    initialEntity,
    onboardingConfig,
    resolvedIntent,
    watchedValues,
  ]);
};
