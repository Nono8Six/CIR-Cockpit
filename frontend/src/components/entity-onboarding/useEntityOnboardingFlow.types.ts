import type { Dispatch, SetStateAction } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import type { ProductOnboardingConfig } from 'shared/schemas/config.schema';
import type {
  DirectoryCompanySearchResult,
  DirectoryDuplicateMatch,
  DirectoryListRow,
} from 'shared/schemas/directory.schema';

import type { ClientPayload } from '@/services/clients/saveClient';
import type { EntityPayload } from '@/services/entities/saveEntity';
import type { useDirectoryCompanyDetails } from '@/hooks/useDirectoryCompanyDetails';
import type { UserRole } from '@/types';

import type {
  OnboardingFormInput,
  OnboardingValues,
} from './entityOnboarding.schema';
import type { EntityOnboardingStepper } from './entityOnboardingSteps';
import type {
  CompanySearchGroup,
  CompanySearchStatusFilter,
  EntityOnboardingSeed,
  OnboardingIntent,
  OnboardingMode,
} from './entityOnboarding.types';
import type { DepartmentOption } from './useOnboardingConfig';

type SavedEntityResult = {
  id?: string;
  client_number?: string | null;
};

export interface UseEntityOnboardingFlowInput {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole: UserRole;
  activeAgencyId: string | null;
  mode: OnboardingMode;
  defaultIntent: OnboardingIntent;
  allowedIntents: OnboardingIntent[] | undefined;
  initialEntity: EntityOnboardingSeed | null;
  onSaveClient: (payload: ClientPayload) => Promise<SavedEntityResult | void>;
  onSaveProspect: (payload: EntityPayload) => Promise<SavedEntityResult | void>;
  onComplete: ((result: {
    intent: OnboardingIntent;
    client_number?: string | null;
    entity_id?: string | null;
  }) => void) | undefined;
  onOpenDuplicate?: (record: DirectoryListRow) => void;
}

export interface EntityOnboardingFlowState {
  form: UseFormReturn<OnboardingFormInput, unknown, OnboardingValues>;
  stepper: EntityOnboardingStepper;
  values: OnboardingValues;
  effectiveIntent: OnboardingIntent;
  isIndividualClient: boolean;
  intents: OnboardingIntent[];
  isIntentLocked: boolean;
  shouldSkipIntent: boolean;
  currentStepIndex: number;
  onboardingConfig: ProductOnboardingConfig;
  departmentOptions: DepartmentOption[];
  isConfigReady: boolean;

  searchDraft: string;
  setSearchDraft: Dispatch<SetStateAction<string>>;
  departmentFilter: string;
  setDepartmentFilter: Dispatch<SetStateAction<string>>;
  statusFilter: CompanySearchStatusFilter;
  setStatusFilter: Dispatch<SetStateAction<CompanySearchStatusFilter>>;
  manualEntry: boolean;
  allowManualEntry: boolean;
  toggleManualEntry: () => void;

  companyGroups: CompanySearchGroup[];
  hasStatusFilteredOutResults: boolean;
  selectedGroup: CompanySearchGroup | null;
  displaySelectedCompany: DirectoryCompanySearchResult | undefined;
  isSearchFetching: boolean;
  isSearchStale: boolean;

  duplicateMatches: DirectoryDuplicateMatch[];
  duplicatesFetching: boolean;

  companyDetails: ReturnType<typeof useDirectoryCompanyDetails>['data'];
  companyDetailsLoading: boolean;

  missingChecklist: string[];
  canContinueCompany: boolean;

  stepError: string | null;
  isSaving: boolean;
  isCloseConfirmOpen: boolean;
  setIsCloseConfirmOpen: Dispatch<SetStateAction<boolean>>;

  reducedMotion: boolean | null;

  handleIntentChange: (intent: OnboardingIntent) => void;
  handleClientKindChange: (clientKind: 'company' | 'individual') => void;
  handleGroupSelect: (groupId: string) => void;
  applyCompany: (company: DirectoryCompanySearchResult) => void;
  handleCompanyNext: () => Promise<void>;
  handleDetailsNext: () => Promise<void>;
  handleBack: () => void;
  handleSubmit: () => Promise<void>;
  requestClose: () => void;
  confirmClose: () => void;
  handleDialogOpenChange: (nextOpen: boolean) => void;
  goToCompletedStep: (stepId: string) => void;
}
