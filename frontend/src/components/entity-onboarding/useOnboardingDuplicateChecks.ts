import { useMemo } from 'react';

import type { DirectoryCompanySearchResult } from 'shared/schemas/directory.schema';

import { useDirectoryDuplicates } from '@/hooks/useDirectoryDuplicates';
import type { UserRole } from '@/types';

import type { OnboardingValues } from './entityOnboarding.schema';
import type { CompanySearchGroup } from './entityOnboarding.types';

interface UseOnboardingDuplicateChecksInput {
  activeAgencyId: string | null;
  displaySelectedCompany: DirectoryCompanySearchResult | undefined;
  isIndividualClient: boolean;
  manualEntry: boolean;
  open: boolean;
  stepperIsCompany: boolean;
  userRole: UserRole;
  values: OnboardingValues;
}

export const useOnboardingDuplicateChecks = ({
  activeAgencyId,
  displaySelectedCompany,
  isIndividualClient,
  manualEntry,
  open,
  stepperIsCompany,
  userRole,
  values,
}: UseOnboardingDuplicateChecksInput) => {
  const duplicateAgencyIds = useMemo(
    () =>
      userRole === 'super_admin'
        ? values.agency_id
          ? [values.agency_id]
          : []
        : activeAgencyId
          ? [activeAgencyId]
          : [],
    [activeAgencyId, userRole, values.agency_id],
  );

  const duplicateInput = useMemo(() => {
    if (isIndividualClient) {
      return {
        kind: 'individual' as const,
        agencyIds: duplicateAgencyIds,
        includeArchived: true,
        first_name: values.first_name,
        last_name: values.last_name,
        postal_code: values.postal_code,
        city: values.city,
        email: values.email,
        phone: values.phone,
      };
    }

    return {
      kind: 'company' as const,
      agencyIds: duplicateAgencyIds,
      includeArchived: true,
      siret: displaySelectedCompany?.siret ?? values.siret ?? undefined,
      siren: displaySelectedCompany?.siren ?? values.siren ?? undefined,
      name: (
        displaySelectedCompany?.official_name ??
        displaySelectedCompany?.name ??
        values.name ??
        ''
      ).trim(),
      city: displaySelectedCompany?.city ?? values.city ?? undefined,
    };
  }, [
    displaySelectedCompany,
    duplicateAgencyIds,
    isIndividualClient,
    values,
  ]);

  const duplicatesQuery = useDirectoryDuplicates(
    duplicateInput,
    open &&
      stepperIsCompany &&
      (isIndividualClient
        ? Boolean(values.last_name.trim())
        : Boolean(duplicateInput.name) &&
          (Boolean(displaySelectedCompany) || manualEntry)),
  );
  const duplicateMatches = useMemo(
    () => duplicatesQuery.data?.matches ?? [],
    [duplicatesQuery.data?.matches],
  );

  return {
    duplicateMatches,
    duplicatesFetching: duplicatesQuery.isFetching,
  };
};

export type SelectedCompanyGroup = CompanySearchGroup | null;
