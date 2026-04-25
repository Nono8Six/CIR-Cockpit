import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { useForm, useWatch, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { defineStepper } from '@stepperize/react';
import { useReducedMotion } from 'motion/react';

import { clientFormSchema } from 'shared/schemas/client.schema';
import type { ProductOnboardingConfig } from 'shared/schemas/config.schema';
import { prospectFormSchema } from 'shared/schemas/prospect.schema';
import type {
  DirectoryCompanySearchResult,
  DirectoryDuplicateMatch,
  DirectoryListRow,
} from 'shared/schemas/directory.schema';

import type { ClientPayload } from '@/services/clients/saveClient';
import type { EntityPayload } from '@/services/entities/saveEntity';
import { useDirectoryCompanyDetails } from '@/hooks/useDirectoryCompanyDetails';
import { useDirectoryDuplicates } from '@/hooks/useDirectoryDuplicates';
import type { UserRole } from '@/types';

import {
  onboardingFormSchema,
  type OnboardingFormInput,
  type OnboardingValues,
} from './entityOnboarding.schema';
import type {
  CompanySearchGroup,
  CompanySearchStatusFilter,
  EntityOnboardingSeed,
  OnboardingIntent,
  OnboardingMode,
} from './entityOnboarding.types';
import {
  buildValues,
  getDepartmentFromPostalCode,
  toNullable,
} from './entityOnboarding.utils';
import {
  useOnboardingConfig,
  type DepartmentOption,
} from './useOnboardingConfig';
import { useOnboardingCloseGuard } from './useOnboardingCloseGuard';
import { useOnboardingCompanySelection } from './useOnboardingCompanySelection';
import { useOnboardingCompanySearch } from './useOnboardingCompanySearch';
import { useOnboardingIntentControls } from './useOnboardingIntentControls';

export const STEP_DEFINITIONS = [
  { id: 'intent', title: 'Type', description: 'Choisir le cadre de creation' },
  {
    id: 'company',
    title: 'Recherche',
    description: "Trouver l entreprise et l etablissement",
  },
  {
    id: 'details',
    title: 'Informations',
    description: 'Completer les champs metier',
  },
  { id: 'review', title: 'Validation', description: 'Verifier avant creation' },
] as const;

export type StepId = (typeof STEP_DEFINITIONS)[number]['id'];

const { useStepper } = defineStepper(
  { id: 'intent', title: 'Type' },
  { id: 'company', title: 'Recherche' },
  { id: 'details', title: 'Informations' },
  { id: 'review', title: 'Validation' },
);

export type EntityOnboardingStepper = ReturnType<typeof useStepper>;

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

const getMissingChecklist = (
  values: OnboardingValues,
  effectiveIntent: OnboardingIntent,
): string[] => {
  const isIndividualClient =
    effectiveIntent === 'client' && values.client_kind === 'individual';
  const checklist = isIndividualClient
    ? [
        { label: 'Nom', value: values.last_name.trim().length > 0 },
        { label: 'Prenom', value: values.first_name.trim().length > 0 },
        { label: 'Ville', value: values.city.trim().length > 0 },
        { label: 'Code postal', value: values.postal_code.trim().length > 0 },
        {
          label: 'Telephone ou email',
          value:
            values.phone.trim().length > 0 || values.email.trim().length > 0,
        },
        { label: 'Agence', value: values.agency_id.trim().length > 0 },
      ]
    : [
        { label: 'Nom de societe', value: values.name.trim().length > 0 },
        { label: 'Ville', value: values.city.trim().length > 0 },
        { label: 'Agence', value: values.agency_id.trim().length > 0 },
      ];

  if (effectiveIntent === 'client') {
    checklist.push({
      label: 'Numero client',
      value: (values.client_number ?? '').trim().length > 0,
    });
  }

  return checklist.filter((item) => !item.value).map((item) => item.label);
};

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
  const resolvedIntent: OnboardingIntent = mode === 'convert' ? 'client' : defaultIntent;
  const intents: OnboardingIntent[] =
    allowedIntents ?? (mode === 'convert' ? ['client'] : ['client', 'prospect']);
  const shouldSkipIntent = mode !== 'convert' && intents.length === 1;
  const isIntentLocked = !shouldSkipIntent && intents.length === 1;

  const { onboardingConfig, departmentOptions, isConfigReady } =
    useOnboardingConfig(activeAgencyId, open);
  const initialManualEntry =
    initialEntity?.client_kind === 'individual' ||
    (mode === 'convert' && !initialEntity?.name);

  const stepper = useStepper({
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

  const [searchDraft, setSearchDraft] = useState(initialEntity?.name ?? '');
  const [departmentFilter, setDepartmentFilter] = useState(
    initialEntity?.department ?? '',
  );
  const [statusFilter, setStatusFilter] =
    useState<CompanySearchStatusFilter>('all');
  const [manualEntry, setManualEntry] = useState(initialManualEntry);
  const [stepError, setStepError] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const hasInitializedOpenRef = useRef(false);

  const deferredSearchDraft = useDeferredValue(searchDraft.trim());
  const deferredDepartmentFilter = useDeferredValue(departmentFilter.trim());
  const watchedValues = useWatch({ control: form.control });
  const values = useMemo<OnboardingValues>(() => {
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
  }, [activeAgencyId, initialEntity, onboardingConfig, resolvedIntent, watchedValues]);

  const effectiveIntent: OnboardingIntent = shouldSkipIntent
    ? (intents[0] ?? resolvedIntent)
    : values.intent;

  const allowManualEntry = onboardingConfig.allow_manual_entry;
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

  const selectedCompany = stepper.metadata.get('company')?.selectedCompany as
    | DirectoryCompanySearchResult
    | undefined;
  const setSelectedCompany = useCallback(
    (company: DirectoryCompanySearchResult | null) => {
      stepper.metadata.set('company', { selectedCompany: company });
    },
    [stepper.metadata],
  );
  const isIndividualClient =
    effectiveIntent === 'client' && values.client_kind === 'individual';
  const currentStepIndex = stepper.state.current.index;

  const {
    companyGroups,
    hasStatusFilteredOutResults,
    isSearchFetching,
    isSearchStale,
  } = useOnboardingCompanySearch({
    deferredDepartmentFilter,
    deferredSearchDraft,
    departmentFilter,
    enabled:
      open && stepper.flow.is('company') && !manualEntry && !isIndividualClient,
    searchDraft,
    statusFilter,
  });
  const {
    applyCompany,
    clearOfficialSelection,
    displaySelectedCompany,
    handleGroupSelect,
    selectedGroup,
  } = useOnboardingCompanySelection({
    companyGroups,
    form,
    manualEntry,
    selectedCompany,
    selectedGroupId,
    setSelectedCompany,
    setSelectedGroupId,
    setStepError,
    statusFilter,
  });

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
    displaySelectedCompany?.city,
    displaySelectedCompany?.name,
    displaySelectedCompany?.official_name,
    displaySelectedCompany?.siren,
    displaySelectedCompany?.siret,
    duplicateAgencyIds,
    isIndividualClient,
    values.city,
    values.email,
    values.first_name,
    values.last_name,
    values.name,
    values.phone,
    values.postal_code,
    values.siren,
    values.siret,
  ]);
  const duplicatesQuery = useDirectoryDuplicates(
    duplicateInput,
    open &&
      stepper.flow.is('company') &&
      (isIndividualClient
        ? Boolean(values.last_name.trim())
        : Boolean(duplicateInput.name) &&
          (Boolean(displaySelectedCompany) || manualEntry)),
  );
  const duplicateMatches = useMemo(
    () => duplicatesQuery.data?.matches ?? [],
    [duplicatesQuery.data?.matches],
  );
  const companyDetailsSiren =
    displaySelectedCompany?.siren ?? selectedGroup?.siren ?? '';
  const companyDetailsQuery = useDirectoryCompanyDetails(
    { siren: companyDetailsSiren },
    open &&
      !manualEntry &&
      !isIndividualClient &&
      companyDetailsSiren.trim().length === 9,
  );
  const missingChecklist = useMemo(
    () => getMissingChecklist(values, effectiveIntent),
    [effectiveIntent, values],
  );
  const canContinueCompany =
    isIndividualClient || manualEntry || Boolean(displaySelectedCompany);

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
  }, [allowManualEntry, initialManualEntry, manualEntry]);

  useEffect(() => {
    if (!selectedGroupId) {
      return;
    }

    if (companyGroups.some((group) => group.id === selectedGroupId)) {
      return;
    }

    setSelectedGroupId(null);
  }, [companyGroups, selectedGroupId]);

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

    if (!isConfigReady) {
      return;
    }

    if (hasInitializedOpenRef.current) {
      return;
    }

    hasInitializedOpenRef.current = true;
    form.reset(
      buildValues(activeAgencyId, resolvedIntent, initialEntity, onboardingConfig),
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
    initialEntity,
    initialManualEntry,
    isConfigReady,
    onboardingConfig,
    open,
    resolvedIntent,
    shouldSkipIntent,
    stepper.metadata,
    stepper.navigation,
  ]);

  const isDirty = form.formState.isDirty;
  const hasLocalDraft =
    searchDraft.trim() !== (initialEntity?.name ?? '').trim() ||
    departmentFilter.trim() !== (initialEntity?.department ?? '').trim() ||
    statusFilter !== 'all' ||
    manualEntry !== initialManualEntry ||
    selectedGroupId !== null;
  const hasUnsavedProgress = isDirty || hasLocalDraft;

  const { confirmClose, requestClose, handleDialogOpenChange } =
    useOnboardingCloseGuard({
      open,
      isSaving,
      hasUnsavedProgress,
      onOpenChange,
      setIsCloseConfirmOpen,
    });

  const { handleClientKindChange, handleIntentChange } =
    useOnboardingIntentControls({
      clearOfficialSelection,
      form,
      initialAccountType: initialEntity?.account_type,
      initialManualEntry,
      intents,
      onboardingConfig,
      setManualEntry,
      setStepError,
    });

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
  }, [effectiveIntent, form, isIndividualClient, stepper.navigation]);

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

  const handleSubmit = useCallback(async () => {
    const agencyId =
      userRole === 'tcs' ? (activeAgencyId ?? values.agency_id) : values.agency_id;

    setIsSaving(true);
    try {
      if (effectiveIntent === 'client') {
        const parsed = clientFormSchema.safeParse({
          client_number: values.client_number,
          client_kind: values.client_kind,
          account_type: values.account_type,
          name: isIndividualClient
            ? [values.last_name, values.first_name]
                .map((entry) => entry.trim())
                .filter((entry) => entry.length > 0)
                .join(' ')
            : values.name,
          address: values.address,
          postal_code: values.postal_code,
          department: values.department,
          city: values.city,
          siret: values.siret,
          siren: values.siren,
          naf_code: values.naf_code,
          official_name: values.official_name,
          official_data_source:
            values.official_data_source === 'api-recherche-entreprises'
              ? 'api-recherche-entreprises'
              : null,
          official_data_synced_at: values.official_data_synced_at,
          notes: values.notes,
          cir_commercial_id: values.cir_commercial_id,
          primary_contact: isIndividualClient
            ? {
                first_name: values.first_name,
                last_name: values.last_name,
                email: values.email,
                phone: values.phone,
                position: '',
                notes: '',
              }
            : undefined,
          agency_id: agencyId,
        });

        if (!parsed.success) {
          setStepError(
            parsed.error.issues[0]?.message ?? 'Le formulaire client est incomplet.',
          );
          stepper.navigation.goTo('details');
          return;
        }

        const savedClient = await onSaveClient({
          id: initialEntity?.id,
          client_number: parsed.data.client_number,
          client_kind: parsed.data.client_kind,
          account_type: parsed.data.account_type,
          name: parsed.data.name,
          address: parsed.data.address,
          postal_code: parsed.data.postal_code,
          department: parsed.data.department,
          city: parsed.data.city,
          siret: parsed.data.siret,
          siren: parsed.data.siren,
          naf_code: parsed.data.naf_code,
          official_name: parsed.data.official_name,
          official_data_source: parsed.data.official_data_source,
          official_data_synced_at: parsed.data.official_data_synced_at,
          notes: parsed.data.notes,
          cir_commercial_id: parsed.data.cir_commercial_id,
          primary_contact:
            parsed.data.client_kind === 'individual'
              ? parsed.data.primary_contact
              : null,
          agency_id: agencyId,
        });

        onComplete?.({
          intent: 'client',
          client_number: savedClient?.client_number ?? parsed.data.client_number,
          entity_id: savedClient?.id ?? initialEntity?.id ?? null,
        });
        onOpenChange(false);
        return;
      }

      const parsed = prospectFormSchema.safeParse({
        name: values.name,
        address: values.address,
        postal_code: values.postal_code,
        department: values.department,
        city: values.city,
        siret: values.siret,
        siren: values.siren,
        naf_code: values.naf_code,
        official_name: values.official_name,
        official_data_source:
          values.official_data_source === 'api-recherche-entreprises'
            ? 'api-recherche-entreprises'
            : null,
        official_data_synced_at: values.official_data_synced_at,
        notes: values.notes,
        agency_id: agencyId,
      });

      if (!parsed.success) {
        setStepError(
          parsed.error.issues[0]?.message ?? 'Le formulaire prospect est incomplet.',
        );
        stepper.navigation.goTo('details');
        return;
      }

      const savedProspect = await onSaveProspect({
        id: initialEntity?.id,
        entity_type: initialEntity?.entity_type ?? 'Prospect',
        name: parsed.data.name,
        address: toNullable(parsed.data.address ?? ''),
        postal_code: toNullable(parsed.data.postal_code ?? ''),
        department: toNullable(parsed.data.department ?? ''),
        city: parsed.data.city,
        siret: toNullable(parsed.data.siret ?? ''),
        siren: toNullable(parsed.data.siren ?? ''),
        naf_code: toNullable(parsed.data.naf_code ?? ''),
        official_name: toNullable(parsed.data.official_name ?? ''),
        official_data_source: parsed.data.official_data_source,
        official_data_synced_at: toNullable(parsed.data.official_data_synced_at ?? ''),
        notes: toNullable(parsed.data.notes ?? ''),
        agency_id: agencyId,
      });

      onComplete?.({
        intent: 'prospect',
        client_number: null,
        entity_id: savedProspect?.id ?? initialEntity?.id ?? null,
      });
      onOpenChange(false);
    } catch {
      return;
    } finally {
      setIsSaving(false);
    }
  }, [
    activeAgencyId,
    effectiveIntent,
    initialEntity?.entity_type,
    initialEntity?.id,
    isIndividualClient,
    onComplete,
    onOpenChange,
    onSaveClient,
    onSaveProspect,
    stepper.navigation,
    userRole,
    values,
  ]);

  const goToCompletedStep = useCallback(
    (stepId: string) => {
      const targetIndex = STEP_DEFINITIONS.findIndex((step) => step.id === stepId);
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
  }, [allowManualEntry]);

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
    duplicatesFetching: duplicatesQuery.isFetching,

    companyDetails: companyDetailsQuery.data,
    companyDetailsLoading: companyDetailsQuery.isLoading,

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
