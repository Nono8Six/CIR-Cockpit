import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { defineStepper } from '@stepperize/react';
import {
  ArrowLeft,
  ArrowRight,
  CircleCheckBig,
  LoaderCircle,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

import { clientFormSchema } from 'shared/schemas/client.schema';
import { prospectFormSchema } from 'shared/schemas/prospect.schema';
import type {
  DirectoryCommercialOption,
  DirectoryCompanySearchResult,
  DirectoryListRow
} from 'shared/schemas/directory.schema';
import type { ClientPayload } from '@/services/clients/saveClient';
import type { EntityPayload } from '@/services/entities/saveEntity';
import { cn } from '@/lib/utils';
import type { Agency, UserRole } from '@/types';
import { useDirectoryCompanySearch } from '@/hooks/useDirectoryCompanySearch';
import { useDirectoryDuplicates } from '@/hooks/useDirectoryDuplicates';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import EntityOnboardingDetailsStep from '@/components/entity-onboarding/EntityOnboardingDetailsStep';
import EntityOnboardingIntentStep from '@/components/entity-onboarding/EntityOnboardingIntentStep';
import {
  onboardingFormSchema,
  type OnboardingFormInput,
  type OnboardingValues
} from '@/components/entity-onboarding/entityOnboarding.schema';
import EntityOnboardingReviewStep from '@/components/entity-onboarding/EntityOnboardingReviewStep';
import EntityOnboardingSearchStep from '@/components/entity-onboarding/EntityOnboardingSearchStep';
import type {
  EntityOnboardingSeed,
  OnboardingIntent,
  OnboardingMode
} from '@/components/entity-onboarding/entityOnboarding.types';
import {
  buildValues,
  getDepartmentFromPostalCode,
  getOfficialCitySuggestions,
  groupCompanySearchResults,
  OFFICIAL_DEPARTMENT_OPTIONS,
  toNullable
} from '@/components/entity-onboarding/entityOnboarding.utils';

const STEP_DEFINITIONS = [
  { id: 'intent', title: 'Type', description: 'Choisir le cadre de creation' },
  { id: 'company', title: 'Recherche', description: 'Trouver l entreprise et l etablissement' },
  { id: 'details', title: 'Informations', description: 'Completer les champs metier' },
  { id: 'review', title: 'Validation', description: 'Verifier avant creation' }
] as const;

const { useStepper } = defineStepper(
  { id: 'intent', title: 'Type' },
  { id: 'company', title: 'Recherche' },
  { id: 'details', title: 'Informations' },
  { id: 'review', title: 'Validation' }
);

type SavedEntityResult = {
  id?: string;
  client_number?: string | null;
};

type EntityOnboardingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencies: Agency[];
  userRole: UserRole;
  activeAgencyId: string | null;
  commercials?: DirectoryCommercialOption[];
  mode?: OnboardingMode;
  defaultIntent?: OnboardingIntent;
  allowedIntents?: OnboardingIntent[];
  initialEntity?: EntityOnboardingSeed | null;
  sourceLabel?: string;
  surface?: 'dialog' | 'page';
  backLabel?: string;
  onSaveClient: (payload: ClientPayload) => Promise<SavedEntityResult | void>;
  onSaveProspect: (payload: EntityPayload) => Promise<SavedEntityResult | void>;
  onComplete?: (result: {
    intent: OnboardingIntent;
    client_number?: string | null;
    entity_id?: string | null;
  }) => void;
  onOpenDuplicate?: (record: DirectoryListRow) => void;
};

const getMissingChecklist = (
  values: OnboardingValues,
  effectiveIntent: OnboardingIntent
): string[] => {
  const isIndividualClient = effectiveIntent === 'client' && values.client_kind === 'individual';
  const checklist = isIndividualClient
    ? [
      { label: 'Nom', value: values.last_name.trim().length > 0 },
      { label: 'Prenom', value: values.first_name.trim().length > 0 },
      { label: 'Ville', value: values.city.trim().length > 0 },
      { label: 'Code postal', value: values.postal_code.trim().length > 0 },
      { label: 'Telephone ou email', value: values.phone.trim().length > 0 || values.email.trim().length > 0 },
      { label: 'Agence', value: values.agency_id.trim().length > 0 }
    ]
    : [
      { label: 'Nom de societe', value: values.name.trim().length > 0 },
      { label: 'Ville', value: values.city.trim().length > 0 },
      { label: 'Agence', value: values.agency_id.trim().length > 0 }
    ];

  if (effectiveIntent === 'client') {
    checklist.push({ label: 'Numero client', value: (values.client_number ?? '').trim().length > 0 });
  }

  return checklist.filter((item) => !item.value).map((item) => item.label);
};

const EntityOnboardingDialog = ({
  open,
  onOpenChange,
  agencies,
  userRole,
  activeAgencyId,
  commercials = [],
  mode = 'create',
  defaultIntent = 'client',
  allowedIntents,
  initialEntity = null,
  sourceLabel = 'Annuaire',
  surface = 'dialog',
  backLabel = 'Retour',
  onSaveClient,
  onSaveProspect,
  onComplete,
  onOpenDuplicate
}: EntityOnboardingDialogProps) => {
  const resolvedIntent = mode === 'convert' ? 'client' : defaultIntent;
  const intents = allowedIntents ?? (mode === 'convert' ? ['client'] : ['client', 'prospect']);
  const shouldSkipIntent = mode !== 'convert' && intents.length === 1;
  const isIntentLocked = !shouldSkipIntent && intents.length === 1;
  const initialManualEntry = initialEntity?.client_kind === 'individual'
    || (mode === 'convert' && !initialEntity?.name);
  const stepper = useStepper({ initialStep: shouldSkipIntent ? 'company' : 'intent' });
  const form = useForm<OnboardingFormInput, unknown, OnboardingValues>({
    resolver: zodResolver(onboardingFormSchema),
    defaultValues: buildValues(activeAgencyId, resolvedIntent, initialEntity)
  });

  const [searchDraft, setSearchDraft] = useState(initialEntity?.name ?? '');
  const [departmentFilter, setDepartmentFilter] = useState(initialEntity?.department ?? '');
  const [cityFilter, setCityFilter] = useState(initialEntity?.city ?? '');
  const [manualEntry, setManualEntry] = useState(initialManualEntry);
  const [stepError, setStepError] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const hasInitializedOpenRef = useRef(false);

  const deferredSearchDraft = useDeferredValue(searchDraft.trim());
  const deferredDepartmentFilter = useDeferredValue(departmentFilter.trim());
  const deferredCityFilter = useDeferredValue(cityFilter.trim());
  const watchedValues = useWatch({ control: form.control });
  const values = useMemo<OnboardingValues>(() => {
    const baseValues = buildValues(activeAgencyId, resolvedIntent, initialEntity);

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
      official_data_source: watchedValues.official_data_source ?? baseValues.official_data_source,
      official_data_synced_at: watchedValues.official_data_synced_at ?? baseValues.official_data_synced_at,
      notes: watchedValues.notes ?? baseValues.notes,
      agency_id: watchedValues.agency_id ?? baseValues.agency_id,
      client_number: watchedValues.client_number ?? baseValues.client_number,
      account_type: watchedValues.account_type ?? baseValues.account_type,
      cir_commercial_id: watchedValues.cir_commercial_id ?? baseValues.cir_commercial_id
    };
  }, [activeAgencyId, initialEntity, resolvedIntent, watchedValues]);

  const selectedCompany = stepper.metadata.get('company')?.selectedCompany as
    | DirectoryCompanySearchResult
    | undefined;
  const effectiveIntent: OnboardingIntent = shouldSkipIntent
    ? (intents[0] ?? resolvedIntent)
    : values.intent;
  const isIndividualClient = effectiveIntent === 'client' && values.client_kind === 'individual';
  const currentStepIndex = stepper.state.current.index;

  const clearOfficialSelection = () => {
    form.setValue('siret', '', { shouldDirty: true });
    form.setValue('siren', '', { shouldDirty: true });
    form.setValue('naf_code', '', { shouldDirty: true });
    form.setValue('official_name', '', { shouldDirty: true });
    form.setValue('official_data_source', null, { shouldDirty: true });
    form.setValue('official_data_synced_at', '', { shouldDirty: true });
    stepper.metadata.set('company', { selectedCompany: null });
  };

  const applyCompany = (company: DirectoryCompanySearchResult) => {
    form.setValue('name', company.official_name ?? company.name, {
      shouldDirty: true,
      shouldValidate: true
    });
    form.setValue('address', company.address ?? '', { shouldDirty: true });
    form.setValue('postal_code', company.postal_code ?? '', { shouldDirty: true });
    form.setValue('department', company.department ?? '', { shouldDirty: true });
    form.setValue('city', company.city ?? '', { shouldDirty: true, shouldValidate: true });
    form.setValue('siret', company.siret ?? '', { shouldDirty: true });
    form.setValue('siren', company.siren ?? '', { shouldDirty: true });
    form.setValue('naf_code', company.naf_code ?? '', { shouldDirty: true });
    form.setValue('official_name', company.official_name ?? company.name, { shouldDirty: true });
    form.setValue(
      'official_data_source',
      company.official_data_source === 'api-recherche-entreprises'
        ? 'api-recherche-entreprises'
        : null,
      { shouldDirty: true }
    );
    form.setValue('official_data_synced_at', company.official_data_synced_at ?? '', {
      shouldDirty: true
    });
    stepper.metadata.set('company', { selectedCompany: company });
    setStepError(null);
  };

  const companySearchQuery = useDirectoryCompanySearch(
    {
      query: searchDraft,
      department: departmentFilter || undefined,
      city: cityFilter || undefined
    },
    open && stepper.flow.is('company') && !manualEntry && !isIndividualClient
  );

  const companyGroups = useMemo(
    () => groupCompanySearchResults(companySearchQuery.data?.companies ?? []),
    [companySearchQuery.data?.companies]
  );
  const selectedGroup = useMemo(() => {
    if (selectedCompany?.siret) {
      const groupFromCompany = companyGroups.find((group) =>
        group.establishments.some((establishment) => establishment.siret === selectedCompany.siret)
      );
      if (groupFromCompany) {
        return groupFromCompany;
      }
    }

    if (selectedGroupId) {
      const explicitGroup = companyGroups.find((group) => group.id === selectedGroupId);
      if (explicitGroup) {
        return explicitGroup;
      }
    }

    return companyGroups.length === 1 ? (companyGroups[0] ?? null) : null;
  }, [companyGroups, selectedCompany?.siret, selectedGroupId]);
  const citySuggestions = useMemo(() => getOfficialCitySuggestions(companyGroups), [companyGroups]);
  const isSearchStale =
    searchDraft.trim() !== deferredSearchDraft
    || departmentFilter.trim() !== deferredDepartmentFilter
    || cityFilter.trim() !== deferredCityFilter
    || companySearchQuery.isFetching;
  const displaySelectedCompany = selectedCompany
    ?? (!manualEntry && selectedGroup?.establishments.length === 1
      ? selectedGroup.establishments[0]
      : undefined);

  const duplicateAgencyIds = useMemo(
    () => (userRole === 'super_admin'
      ? (values.agency_id ? [values.agency_id] : [])
      : activeAgencyId
        ? [activeAgencyId]
        : []),
    [activeAgencyId, userRole, values.agency_id]
  );
  const duplicateInput = useMemo(
    () => {
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
          phone: values.phone
        };
      }

      return {
        kind: 'company' as const,
        agencyIds: duplicateAgencyIds,
        includeArchived: true,
        siret: displaySelectedCompany?.siret ?? values.siret ?? undefined,
        siren: displaySelectedCompany?.siren ?? values.siren ?? undefined,
        name: (
          displaySelectedCompany?.official_name
          ?? displaySelectedCompany?.name
          ?? values.name
          ?? ''
        ).trim(),
        city: displaySelectedCompany?.city ?? values.city ?? undefined
      };
    },
    [
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
      values.siret
    ]
  );
  const duplicatesQuery = useDirectoryDuplicates(
    duplicateInput,
    open
      && stepper.flow.is('company')
      && (
        isIndividualClient
          ? Boolean(values.last_name.trim())
          : Boolean(duplicateInput.name) && (Boolean(displaySelectedCompany) || manualEntry)
      )
  );
  const duplicateMatches = useMemo(
    () => duplicatesQuery.data?.matches ?? [],
    [duplicatesQuery.data?.matches]
  );
  const missingChecklist = useMemo(
    () => getMissingChecklist(values, effectiveIntent),
    [effectiveIntent, values]
  );
  const canContinueCompany = isIndividualClient || manualEntry || Boolean(displaySelectedCompany);

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
    if (!open) {
      hasInitializedOpenRef.current = false;
      return;
    }

    if (hasInitializedOpenRef.current) {
      return;
    }

    hasInitializedOpenRef.current = true;
    form.reset(buildValues(activeAgencyId, resolvedIntent, initialEntity));
    stepper.metadata.reset();
    stepper.navigation.reset();
    if (shouldSkipIntent) {
      stepper.navigation.goTo('company');
    }

    queueMicrotask(() => {
      setSearchDraft(initialEntity?.name ?? '');
      setDepartmentFilter(initialEntity?.department ?? '');
      setCityFilter(initialEntity?.city ?? '');
      setManualEntry(
        initialEntity?.client_kind === 'individual' || (mode === 'convert' && !initialEntity?.name)
      );
      setSelectedGroupId(null);
      setStepError(null);
      setIsSaving(false);
      setIsCloseConfirmOpen(false);
    });
  }, [
    activeAgencyId,
    form,
    initialEntity,
    mode,
    open,
    resolvedIntent,
    shouldSkipIntent,
    stepper.metadata,
    stepper.navigation
  ]);

  const isDirty = form.formState.isDirty;
  const hasLocalDraft = searchDraft.trim() !== (initialEntity?.name ?? '').trim()
    || departmentFilter.trim() !== (initialEntity?.department ?? '').trim()
    || cityFilter.trim() !== (initialEntity?.city ?? '').trim()
    || manualEntry !== initialManualEntry
    || selectedGroupId !== null;
  const hasUnsavedProgress = isDirty || hasLocalDraft;

  useEffect(() => {
    if (!open || !hasUnsavedProgress) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedProgress, open]);

  const confirmClose = () => {
    setIsCloseConfirmOpen(false);
    onOpenChange(false);
  };

  const requestClose = () => {
    if (isSaving) {
      return;
    }

    if (hasUnsavedProgress) {
      setIsCloseConfirmOpen(true);
      return;
    }

    onOpenChange(false);
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(nextOpen);
      return;
    }

    requestClose();
  };

  const handleIntentChange = (intent: OnboardingIntent) => {
    if (!intents.includes(intent)) {
      return;
    }

    form.setValue('intent', intent, { shouldDirty: true });
    if (intent !== 'client') {
      form.setValue('client_kind', 'company', { shouldDirty: true });
      form.setValue('account_type', 'term', { shouldDirty: true, shouldValidate: true });
      form.setValue('cir_commercial_id', '', { shouldDirty: true, shouldValidate: true });
    }
    setStepError(null);
  };

  const handleClientKindChange = (clientKind: 'company' | 'individual') => {
    form.setValue('client_kind', clientKind, { shouldDirty: true, shouldValidate: true });

    if (clientKind === 'individual') {
      form.setValue('account_type', 'cash', { shouldDirty: true, shouldValidate: true });
      form.setValue('cir_commercial_id', '', { shouldDirty: true, shouldValidate: true });
      clearOfficialSelection();
      setManualEntry(true);
      setStepError(null);
      return;
    }

    form.setValue('account_type', initialEntity?.account_type ?? 'term', {
      shouldDirty: true,
      shouldValidate: true
    });
    setManualEntry(mode === 'convert' && !initialEntity?.name);
    setStepError(null);
  };

  const handleGroupSelect = (groupId: string) => {
    setSelectedGroupId(groupId);
    const group = companyGroups.find((entry) => entry.id === groupId);
    if (!group) {
      return;
    }

    if (group.establishments.length === 1) {
      const establishment = group.establishments[0];
      if (establishment) {
        applyCompany(establishment);
      }
      return;
    }

    const currentCompanyBelongsToGroup = group.establishments.some(
      (establishment) => establishment.siret === selectedCompany?.siret
    );
    if (!currentCompanyBelongsToGroup) {
      clearOfficialSelection();
    }
  };

  const handleCompanyNext = async () => {
    if (isIndividualClient) {
      const isValid = await form.trigger(['first_name', 'last_name', 'phone', 'email', 'postal_code', 'city'] as never);
      if (!isValid) {
        setStepError('Renseigne l identite et au moins un moyen de contact.');
        return;
      }

      const fullName = [values.last_name, values.first_name]
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
        .join(' ');

      form.setValue('name', fullName, { shouldDirty: true, shouldValidate: true });
      form.setValue(
        'department',
        values.postal_code.trim().length >= 2 ? getDepartmentFromPostalCode(values.postal_code) : '',
        { shouldDirty: true }
      );
      setStepError(null);
      stepper.navigation.goTo('details');
      return;
    }

    if (!manualEntry && !selectedCompany && displaySelectedCompany) {
      applyCompany(displaySelectedCompany);
    }

    if (!displaySelectedCompany && !manualEntry) {
      setStepError('Selectionne un etablissement officiel ou passe en saisie manuelle.');
      return;
    }

    setStepError(null);
    stepper.navigation.goTo('details');
  };

  const handleDetailsNext = async () => {
    const fields = effectiveIntent === 'client'
      ? isIndividualClient
        ? ['name', 'first_name', 'last_name', 'city', 'postal_code', 'agency_id', 'client_number', 'phone', 'email']
        : ['name', 'city', 'agency_id', 'address', 'postal_code', 'department', 'client_number']
      : ['name', 'city', 'agency_id'];

    if (!(await form.trigger(fields as never))) {
      setStepError('Des champs obligatoires doivent encore etre completes.');
      return;
    }

    setStepError(null);
    stepper.navigation.goTo('review');
  };

  const handleBack = () => {
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
  };

  const handleSubmit = async () => {
    const agencyId = userRole === 'tcs' ? (activeAgencyId ?? values.agency_id) : values.agency_id;

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
          official_data_source: values.official_data_source === 'api-recherche-entreprises'
            ? 'api-recherche-entreprises'
            : null,
          official_data_synced_at: values.official_data_synced_at,
          notes: values.notes,
          cir_commercial_id: values.cir_commercial_id,
          primary_contact: isIndividualClient ? {
            first_name: values.first_name,
            last_name: values.last_name,
            email: values.email,
            phone: values.phone,
            position: '',
            notes: ''
          } : undefined,
          agency_id: agencyId
        });

        if (!parsed.success) {
          setStepError(parsed.error.issues[0]?.message ?? 'Le formulaire client est incomplet.');
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
          primary_contact: parsed.data.client_kind === 'individual'
            ? parsed.data.primary_contact
            : null,
          agency_id: agencyId
        });

        onComplete?.({
          intent: 'client',
          client_number: savedClient?.client_number ?? parsed.data.client_number,
          entity_id: savedClient?.id ?? initialEntity?.id ?? null
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
        official_data_source: values.official_data_source === 'api-recherche-entreprises'
          ? 'api-recherche-entreprises'
          : null,
        official_data_synced_at: values.official_data_synced_at,
        notes: values.notes,
        agency_id: agencyId
      });

      if (!parsed.success) {
        setStepError(parsed.error.issues[0]?.message ?? 'Le formulaire prospect est incomplet.');
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
        agency_id: agencyId
      });

      onComplete?.({
        intent: 'prospect',
        client_number: null,
        entity_id: savedProspect?.id ?? initialEntity?.id ?? null
      });
      onOpenChange(false);
    } catch {
      return;
    } finally {
      setIsSaving(false);
    }
  };

  const title = mode === 'convert'
    ? 'Convertir le prospect en client'
    : 'Nouvelle fiche entreprise';
  const subtitle = mode === 'convert'
    ? 'Qualifier l etablissement et finaliser le compte client.'
    : 'Rechercher, verifier et creer une fiche dans l annuaire.';
  const renderedSteps = STEP_DEFINITIONS.map((step) => {
    if (step.id === 'company' && isIndividualClient) {
      return {
        ...step,
        description: 'Qualifier le particulier et verifier les doublons'
      };
    }

    if (step.id === 'details' && isIndividualClient) {
      return {
        ...step,
        description: 'Completer les coordonnees et le compte'
      };
    }

    return step;
  });
  const showHeaderBack = surface === 'page';
  const showFooterBack = stepper.flow.is('review')
    || stepper.flow.is('details')
    || (!shouldSkipIntent && stepper.flow.is('company'));
  const primaryButtonLabel = stepper.flow.is('review')
    ? mode === 'convert'
      ? 'Convertir en client'
      : effectiveIntent === 'client'
        ? 'Creer le client'
        : 'Creer le prospect'
    : 'Continuer';
  const footerMessage = stepError ?? (
    stepper.flow.is('company')
      ? 'Selection et doublons visibles avant creation.'
      : stepper.flow.is('details')
        ? 'Champs obligatoires verifies en ligne.'
        : stepper.flow.is('review')
          ? 'Resume final exactement conforme aux donnees sauvegardees.'
          : 'Le type choisi ajuste tout le reste du parcours.'
  );
  const stepMotionProps = reducedMotion
    ? {}
    : {
      initial: { opacity: 0, x: 8 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -8 },
      transition: { duration: 0.15 }
    };
  const currentStep = renderedSteps[currentStepIndex] ?? renderedSteps[0];

  const goToCompletedStep = (stepId: string) => {
    const targetIndex = renderedSteps.findIndex((step) => step.id === stepId);
    if (targetIndex === -1 || targetIndex >= currentStepIndex) {
      return;
    }

    stepper.navigation.goTo(stepId as 'intent' | 'company' | 'details' | 'review');
  };

  const content = (
    <section
      aria-label={title}
      className={cn(
        'flex h-full min-h-0 flex-col overflow-hidden bg-background',
        surface === 'page' ? 'flex-1 rounded-xl border border-border-subtle shadow-sm' : 'border-0'
      )}
    >
      <div className="sticky top-0 z-20 border-b border-border-subtle bg-background/92 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 py-4 sm:px-5 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {showHeaderBack ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="dense"
                    className="px-2 text-muted-foreground"
                    onClick={requestClose}
                  >
                    <ArrowLeft className="size-4" />
                    {backLabel}
                  </Button>
                ) : null}
                <Badge variant="outline" density="dense" className="gap-1.5 border-border-subtle bg-surface-1/80">
                  <Sparkles className="size-3.5" />
                  {sourceLabel}
                </Badge>
                <Badge variant={mode === 'convert' ? 'secondary' : 'ghost'} density="dense">
                  {mode === 'convert' ? 'Conversion' : 'Creation'}
                </Badge>
                <Badge variant="outline" density="dense" className="border-border-subtle bg-surface-1/80 tabular-nums">
                  Etape {currentStepIndex + 1}/{renderedSteps.length}
                </Badge>
                {values.official_data_source ? (
                  <Badge variant="success" density="dense">
                    Donnees officielles
                  </Badge>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  {mode === 'convert' ? 'Workflow client' : 'Creation annuaire'}
                </p>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.8rem]">
                  {title}
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{subtitle}</p>
              </div>
            </div>

            <div className="hidden min-w-[240px] rounded-lg border border-border-subtle bg-surface-1/80 px-4 py-3 lg:block">
              <p className="text-xs font-medium text-muted-foreground">En cours</p>
              <p className="mt-1 text-sm font-medium text-foreground">{currentStep.title}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{currentStep.description}</p>
            </div>
          </div>

          <nav aria-label="Progression du parcours">
            <div className={cn(surface === 'page' && 'xl:hidden')}>
              <ol className="grid list-none gap-2 p-0 sm:grid-cols-2 xl:grid-cols-4">
                {renderedSteps.map((step, index) => {
                  const isCurrent = currentStepIndex === index;
                  const isCompleted = currentStepIndex > index;
                  const isClickable = index < currentStepIndex;
                  const stepCardClassName = cn(
                    'flex w-full min-w-0 items-start gap-3 rounded-lg border px-3 py-3 text-left transition-[background-color,border-color,box-shadow]',
                    isCurrent
                      ? 'border-primary/35 bg-primary/5'
                      : isCompleted
                        ? 'border-border-subtle bg-background'
                        : 'border-border-subtle bg-surface-1/70'
                  );
                  const stepContent = (
                    <>
                      <span
                        className={cn(
                          'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold',
                          isCurrent
                            ? 'border-primary/35 bg-primary text-primary-foreground'
                            : isCompleted
                              ? 'border-success/35 bg-success/10 text-success'
                              : 'border-border-subtle bg-background text-muted-foreground'
                        )}
                      >
                        {isCompleted ? <CircleCheckBig className="size-3.5" /> : index + 1}
                      </span>
                      <span className="space-y-1">
                        <span className="block truncate text-sm font-medium text-foreground">{step.title}</span>
                        <span className="block text-xs leading-5 text-muted-foreground">
                          {step.description}
                        </span>
                      </span>
                    </>
                  );

                  return (
                    <li key={step.id} aria-current={isCurrent ? 'step' : undefined}>
                      {isClickable ? (
                        <button
                          type="button"
                          aria-label={`Revenir à l'étape ${step.title}`}
                          onClick={() => {
                            goToCompletedStep(step.id);
                          }}
                          className={cn(stepCardClassName, 'cursor-pointer hover:border-primary/20 hover:bg-background')}
                        >
                          {stepContent}
                        </button>
                      ) : (
                        <div className={cn(stepCardClassName, 'cursor-default')}>
                          {stepContent}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          </nav>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden bg-surface-1/50">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-1 flex-col px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
          <AnimatePresence mode="wait" initial={false}>
            {stepper.flow.is('intent') ? (
              <motion.div key="step-intent" className="min-h-0 flex-1" {...stepMotionProps}>
                <EntityOnboardingIntentStep
                  effectiveIntent={effectiveIntent}
                  intents={intents}
                  isIntentLocked={isIntentLocked}
                  mode={mode}
                  clientKind={values.client_kind}
                  onIntentChange={handleIntentChange}
                  onClientKindChange={handleClientKindChange}
                />
              </motion.div>
            ) : null}

            {stepper.flow.is('company') ? (
              <motion.div key="step-company" className="min-h-0 flex-1" {...stepMotionProps}>
                <EntityOnboardingSearchStep
                  form={form}
                  values={values}
                  isIndividualClient={isIndividualClient}
                  searchDraft={searchDraft}
                  onSearchDraftChange={setSearchDraft}
                  department={departmentFilter}
                  onDepartmentChange={setDepartmentFilter}
                  city={cityFilter}
                  onCityChange={setCityFilter}
                  departmentOptions={OFFICIAL_DEPARTMENT_OPTIONS}
                  citySuggestions={citySuggestions}
                  manualEntry={manualEntry}
                  onToggleManualEntry={() => {
                    setManualEntry((previous) => !previous);
                    setStepError(null);
                  }}
                  isFetching={companySearchQuery.isFetching}
                  isStale={isSearchStale}
                  groups={companyGroups}
                  selectedGroup={selectedGroup}
                  onGroupSelect={handleGroupSelect}
                  selectedCompany={displaySelectedCompany}
                  onEstablishmentSelect={applyCompany}
                  duplicateMatches={duplicateMatches}
                  duplicatesLoading={duplicatesQuery.isFetching}
                  onOpenDuplicate={onOpenDuplicate}
                />
              </motion.div>
            ) : null}

            {stepper.flow.is('details') ? (
              <motion.div key="step-details" className="min-h-0 flex-1 overflow-y-auto pr-1" {...stepMotionProps}>
                <EntityOnboardingDetailsStep
                  form={form}
                  values={values}
                  effectiveIntent={effectiveIntent}
                  isIndividualClient={isIndividualClient}
                  agencies={agencies}
                  commercials={commercials}
                  userRole={userRole}
                  selectedCompany={displaySelectedCompany}
                  duplicateMatches={duplicateMatches}
                  remainingRequiredFields={missingChecklist}
                />
              </motion.div>
            ) : null}

            {stepper.flow.is('review') ? (
              <motion.div key="step-review" className="min-h-0 flex-1 overflow-y-auto pr-1" {...stepMotionProps}>
                <EntityOnboardingReviewStep
                  values={values}
                  agencies={agencies}
                  effectiveIntent={effectiveIntent}
                  isIndividualClient={isIndividualClient}
                  selectedCompany={displaySelectedCompany}
                  duplicateMatches={duplicateMatches}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <div className="border-t border-border-subtle bg-background/92 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 lg:px-6">
          <div
            aria-live="polite"
            className={cn(
              'flex items-start gap-2 text-sm leading-6',
              stepError ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            <span>{footerMessage}</span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {showFooterBack ? (
              <Button type="button" variant="outline" size="dense" onClick={handleBack}>
                <ArrowLeft className="size-4" />
                Retour
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="dense" onClick={requestClose}>
              Annuler
            </Button>
            <Button
              type="button"
              size="comfortable"
              disabled={isSaving || (stepper.flow.is('company') && !canContinueCompany)}
              onClick={() => {
                if (stepper.flow.is('intent')) {
                  stepper.navigation.goTo('company');
                  return;
                }
                if (stepper.flow.is('company')) {
                  void handleCompanyNext();
                  return;
                }
                if (stepper.flow.is('details')) {
                  void handleDetailsNext();
                  return;
                }
                void handleSubmit();
              }}
            >
              {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {primaryButtonLabel}
              {!stepper.flow.is('review') ? <ArrowRight className="size-4" /> : null}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );

  const closeConfirmDialog = (
    <AlertDialog open={isCloseConfirmOpen} onOpenChange={setIsCloseConfirmOpen}>
      <AlertDialogContent className="border-border-subtle">
        <AlertDialogHeader>
          <AlertDialogTitle>Quitter le parcours ?</AlertDialogTitle>
          <AlertDialogDescription>
            Les modifications non enregistrees seront perdues si tu fermes maintenant ce flux.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Revenir au formulaire</AlertDialogCancel>
          <AlertDialogAction onClick={confirmClose}>Quitter</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (surface === 'page') {
    return (
      <>
        {closeConfirmDialog}
        {content}
      </>
    );
  }

  return (
    <>
      {closeConfirmDialog}

      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          overlayClassName="bg-foreground/20 backdrop-blur-[6px]"
          className="h-[min(96vh,920px)] w-[min(96vw,1320px)] max-w-[1320px] overflow-hidden rounded-xl border border-border-subtle bg-background p-0 shadow-2xl sm:rounded-xl"
        >
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Flux de creation et de conversion d entreprise integre a l annuaire.
          </DialogDescription>
          {content}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EntityOnboardingDialog;
