import { useMemo } from 'react';

import { useConfigSnapshot } from '../../hooks/cockpit-utils/useConfigSnapshot';

export type OnboardingConfig = {
  allowManualEntry: true;
  defaultCompanyAccountType: 'term';
  individualAccountType: 'cash';
};

export const ONBOARDING_CONFIG: OnboardingConfig = {
  allowManualEntry: true,
  defaultCompanyAccountType: 'term',
  individualAccountType: 'cash',
};

export type DepartmentOption = {
  value: string;
  label: string;
};

export interface OnboardingConfigState {
  onboardingConfig: OnboardingConfig;
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
    references: {
      statuses: [],
      services: [],
      families: [],
      interaction_types: [],
      departments: [],
    },
  };
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
    onboardingConfig: ONBOARDING_CONFIG,
    departmentOptions,
    isConfigReady,
  };
};
