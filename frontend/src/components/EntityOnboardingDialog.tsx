import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { defineStepper } from '@stepperize/react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CircleCheckBig,
  LoaderCircle,
  Search,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

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
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import EntityOnboardingDetailsStep from '@/components/entity-onboarding/EntityOnboardingDetailsStep';
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
  const stepper = useStepper({ initialStep: shouldSkipIntent ? 'company' : 'intent' });
  const form = useForm<OnboardingFormInput, unknown, OnboardingValues>({
    resolver: zodResolver(onboardingFormSchema),
    defaultValues: buildValues(activeAgencyId, resolvedIntent, initialEntity)
  });

  const [searchDraft, setSearchDraft] = useState(initialEntity?.name ?? '');
  const [departmentFilter, setDepartmentFilter] = useState(initialEntity?.department ?? '');
  const [cityFilter, setCityFilter] = useState(initialEntity?.city ?? '');
  const [manualEntry, setManualEntry] = useState(
    initialEntity?.client_kind === 'individual' || (mode === 'convert' && !initialEntity?.name)
  );
  const [stepError, setStepError] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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

  const handleClose = () => {
    onOpenChange(false);
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
    ? 'Conserver la base prospect, qualifier le bon etablissement et finaliser le compte client.'
    : 'Un seul flux pour rechercher, verifier et creer une fiche proprement dans l annuaire.';
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
      ? 'Les donnees officielles restent verifiables avant creation.'
      : stepper.flow.is('details')
        ? 'Les champs obligatoires sont controles en ligne.'
        : stepper.flow.is('review')
          ? 'La validation finale reprend exactement les donnees qui seront sauvegardees.'
          : 'Le type choisi ajuste les champs du parcours.'
  );

  const content = (
    <section
      aria-label={title}
      className={cn(
        'flex h-full min-h-0 flex-col overflow-hidden bg-background',
        surface === 'page' ? 'flex-1 rounded-xl border border-border/60 shadow-sm' : 'border-0'
      )}
    >
      <div className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 py-4 sm:px-5 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {showHeaderBack ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="px-2 text-muted-foreground"
                    onClick={handleClose}
                  >
                    <ArrowLeft className="size-4" />
                    {backLabel}
                  </Button>
                ) : null}
                <Badge variant="outline" density="dense" className="gap-1.5">
                  <Sparkles className="size-3.5" />
                  {sourceLabel}
                </Badge>
                <Badge variant={mode === 'convert' ? 'secondary' : 'ghost'} density="dense">
                  {mode === 'convert' ? 'Conversion' : 'Creation'}
                </Badge>
                {values.official_data_source ? (
                  <Badge variant="success" density="dense">
                    Donnees officielles
                  </Badge>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  {mode === 'convert' ? 'Workflow client' : 'Creation annuaire'}
                </p>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.8rem]">
                  {title}
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{subtitle}</p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {renderedSteps.map((step, index) => {
                const isCurrent = currentStepIndex === index;
                const isCompleted = currentStepIndex > index;
                const isClickable = index < currentStepIndex;

                return (
                  <button
                    key={step.id}
                    type="button"
                    disabled={!isClickable}
                    onClick={() => {
                      if (isClickable) {
                        stepper.navigation.goTo(step.id);
                      }
                    }}
                    className={cn(
                      'flex min-w-0 items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                      isCurrent
                        ? 'border-primary/30 bg-primary/5'
                        : isCompleted
                          ? 'border-emerald-200 bg-emerald-50/70'
                          : 'border-border/60 bg-card',
                      isClickable ? 'cursor-pointer hover:bg-muted/40' : 'cursor-default'
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold',
                        isCurrent
                          ? 'border-primary/50 bg-primary text-primary-foreground'
                          : isCompleted
                            ? 'border-emerald-300 bg-emerald-100 text-emerald-700'
                            : 'border-border/70 bg-background text-muted-foreground'
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
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-[1400px] flex-1 flex-col gap-4 px-4 py-4 sm:px-5 lg:px-6">
          {stepper.flow.is('intent') ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_360px]">
              <div className="rounded-xl border border-border/60 bg-card shadow-sm">
                <div className="border-b border-border/60 px-5 py-5">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/8 text-primary">
                      <Building2 className="size-4" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-lg font-semibold tracking-tight text-foreground">
                        Type de fiche
                      </h2>
                      <p className="text-sm leading-6 text-muted-foreground">
                        Le type choisi regle la profondeur du parcours et les champs exposes.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-5 p-5">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Type de dossier
                    </p>
                    <div className="grid gap-3 md:grid-cols-2">
                      {([
                        {
                          id: 'prospect',
                          title: 'Prospect',
                          body: 'Qualification legere pour lancer la relation.',
                          chips: ['Recherche officielle', 'Fiche courte']
                        },
                        {
                          id: 'client',
                          title: 'Client',
                          body: 'Creation d un compte complet dans l annuaire.',
                          chips: ['Numero client', 'Compte client']
                        }
                      ] as const)
                        .filter((option) => intents.includes(option.id))
                        .map((option) => {
                          const isActive = effectiveIntent === option.id;

                          return (
                            <button
                              key={option.id}
                              type="button"
                              disabled={isIntentLocked}
                              onClick={() => handleIntentChange(option.id)}
                              className={cn(
                                'rounded-xl border px-4 py-4 text-left transition-colors',
                                isActive
                                  ? 'border-primary/30 bg-primary/5'
                                  : 'border-border/60 bg-background hover:bg-muted/25',
                                isIntentLocked && 'cursor-default'
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-base font-semibold text-foreground">{option.title}</span>
                                    {isActive ? <Badge variant="secondary" density="dense">Actif</Badge> : null}
                                  </div>
                                  <p className="text-sm leading-6 text-muted-foreground">{option.body}</p>
                                </div>
                                {isActive ? <CircleCheckBig className="mt-0.5 size-4 shrink-0 text-primary" /> : null}
                              </div>
                              <div className="mt-4 flex flex-wrap gap-2">
                                {option.chips.map((chip) => (
                                  <Badge key={chip} variant="outline" density="dense">
                                    {chip}
                                  </Badge>
                                ))}
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  {effectiveIntent === 'client' ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Cadre client
                        </p>
                        {mode === 'convert' ? <Badge variant="outline">Societe imposee</Badge> : null}
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {([
                          {
                            id: 'company',
                            title: 'Societe',
                            body: 'Recherche officielle, etablissements et controle des doublons.',
                            chips: ['SIRET', 'SIREN', 'Commercial CIR']
                          },
                          {
                            id: 'individual',
                            title: 'Particulier',
                            body: 'Client sans societe, avec contact principal et compte comptant.',
                            chips: ['Nom + prenom', 'Telephone ou email', 'Sans commercial']
                          }
                        ] as const).map((option) => {
                          const isActive = values.client_kind === option.id;
                          const isDisabled = mode === 'convert' && option.id === 'individual';

                          return (
                            <button
                              key={option.id}
                              type="button"
                              disabled={isDisabled}
                              onClick={() => handleClientKindChange(option.id)}
                              className={cn(
                                'rounded-xl border px-4 py-4 text-left transition-colors',
                                isActive
                                  ? 'border-primary/30 bg-primary/5'
                                  : 'border-border/60 bg-background hover:bg-muted/25',
                                isDisabled && 'cursor-not-allowed opacity-60'
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-base font-semibold text-foreground">{option.title}</span>
                                    {isActive ? <Badge variant="secondary" density="dense">Actif</Badge> : null}
                                  </div>
                                  <p className="text-sm leading-6 text-muted-foreground">{option.body}</p>
                                </div>
                                {isActive ? <CircleCheckBig className="mt-0.5 size-4 shrink-0 text-primary" /> : null}
                              </div>
                              <div className="mt-4 flex flex-wrap gap-2">
                                {option.chips.map((chip) => (
                                  <Badge key={chip} variant="outline" density="dense">
                                    {chip}
                                  </Badge>
                                ))}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <aside className="rounded-xl border border-border/60 bg-card shadow-sm">
                <div className="border-b border-border/60 px-5 py-5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="size-4 text-primary" />
                    Cadre du parcours
                  </div>
                </div>
                <div className="space-y-4 px-5 py-5 text-sm leading-6 text-muted-foreground">
                  <p>
                    {mode === 'convert'
                      ? 'Le type client est impose par la conversion. Le prospect sert de base, puis les champs client sont ajoutes.'
                      : effectiveIntent === 'client' && isIndividualClient
                        ? 'Le parcours particulier remplace la recherche entreprise par une qualification identite + doublons, tout en restant dans le shell annuaire.'
                        : 'Le flux reste le meme: recherche, verification, completion puis validation finale.'}
                  </p>
                  <div className="rounded-lg border border-border/60 bg-muted/25 p-4">
                    <p className="font-medium text-foreground">Ce qui change ensuite</p>
                    <ul className="mt-3 space-y-2">
                      <li className="flex items-start gap-2">
                        <Search className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        {effectiveIntent === 'client' && isIndividualClient
                          ? 'L etape recherche qualifie le particulier puis controle les doublons sur les donnees de contact.'
                          : 'L etape recherche consolide l entreprise et detecte les doublons.'}
                      </li>
                      <li className="flex items-start gap-2">
                        <Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        Les champs metier s adaptent automatiquement au type retenu.
                      </li>
                    </ul>
                  </div>
                </div>
              </aside>
            </div>
          ) : null}

          {stepper.flow.is('company') ? (
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
          ) : null}

          {stepper.flow.is('details') ? (
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
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
            </div>
          ) : null}

          {stepper.flow.is('review') ? (
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <EntityOnboardingReviewStep
                values={values}
                agencies={agencies}
                effectiveIntent={effectiveIntent}
                isIndividualClient={isIndividualClient}
                selectedCompany={displaySelectedCompany}
                duplicateMatches={duplicateMatches}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-t border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 lg:px-6">
          <div
            className={cn(
              'flex items-start gap-2 text-sm leading-6',
              stepError ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            <span>{footerMessage}</span>
          </div>

          <div className="flex items-center justify-end gap-2">
            {showFooterBack ? (
              <Button type="button" variant="outline" onClick={handleBack}>
                <ArrowLeft className="size-4" />
                Retour
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button
              type="button"
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

  if (surface === 'page') {
    return content;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-foreground/28 backdrop-blur-[3px]"
        className="h-[min(96vh,920px)] w-[min(96vw,1320px)] max-w-[1320px] overflow-hidden rounded-2xl border border-border/60 bg-background p-0 shadow-2xl sm:rounded-2xl"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          Flux de creation et de conversion d entreprise integre a l annuaire.
        </DialogDescription>
        {content}
      </DialogContent>
    </Dialog>
  );
};

export default EntityOnboardingDialog;
