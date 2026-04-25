import { useMemo } from 'react';

import {
  DEFAULT_AGENCY_SETTINGS,
  DEFAULT_APP_SETTINGS,
  resolveOnboardingConfig,
  type ProductOnboardingConfig,
} from 'shared/schemas/config.schema';

import { useConfigSnapshot } from '@/hooks/useConfigSnapshot';

export type DepartmentOption = {
  value: string;
  label: string;
};

export interface OnboardingConfigState {
  onboardingConfig: ProductOnboardingConfig;
  departmentOptions: DepartmentOption[];
  isConfigReady: boolean;
}

export const useOnboardingConfig = (
  activeAgencyId: string | null,
  open: boolean,
): OnboardingConfigState => {
  const configSnapshotQuery = useConfigSnapshot(
    activeAgencyId,
    open && Boolean(activeAgencyId),
  );
  const configSnapshot = configSnapshotQuery.data ?? {
    product: DEFAULT_APP_SETTINGS,
    agency: DEFAULT_AGENCY_SETTINGS,
    references: {
      statuses: [],
      services: [],
      entities: [],
      families: [],
      interaction_types: [],
      departments: [],
    },
  };
  const onboardingConfig = useMemo(
    () =>
      resolveOnboardingConfig(
        configSnapshot.product.onboarding,
        configSnapshot.agency.onboarding,
      ),
    [configSnapshot.agency.onboarding, configSnapshot.product.onboarding],
  );
  const departmentOptions = useMemo<DepartmentOption[]>(
    () =>
      configSnapshot.references.departments.map((department) => ({
        value: department.code,
        label:
          department.label === department.code
            ? department.code
            : `${department.code} - ${department.label}`,
      })),
    [configSnapshot.references.departments],
  );
  const isConfigReady = !open || !activeAgencyId || !configSnapshotQuery.isLoading;

  return {
    onboardingConfig,
    departmentOptions,
    isConfigReady,
  };
};
