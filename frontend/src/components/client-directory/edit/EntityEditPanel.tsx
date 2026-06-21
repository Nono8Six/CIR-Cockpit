import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useBlocker } from '@tanstack/react-router';
import { Check, ChevronDown, Loader2, RefreshCcw, RotateCcw, Save, Search, X } from 'lucide-react';

import type {
  DirectoryCommercialOption,
  DirectoryCompanySearchResult,
  DirectoryRecord
} from '../../../../../shared/schemas/system/directory.schema';
import type {
  OfficialDataResyncIdentityMode,
  OfficialDataResyncPayload
} from '../../../../../shared/schemas/system/data.schema';
import type { EntityPayload, ProspectEntityPayload, SupplierEntityPayload } from '@/services/entities/saveEntity';
import type { ClientPayload } from '@/services/clients/saveClient';
import type { Agency, EntityContact, UserRole } from '@/types';
import { Button } from '@/components/ui/inputs/basic/Button';
import { Input } from '@/components/ui/inputs/basic/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/inputs/selects/Select';
import { Textarea } from '@/components/ui/inputs/basic/Textarea';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle
} from '@/components/ui/feedback/Sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/feedback/AlertDialog';
import { getDirectoryCompanyDetails } from '@/services/directory/getDirectoryCompanyDetails';
import { getDirectoryCompanySearch } from '@/services/directory/getDirectoryCompanySearch';
import { handleUiError } from '@/services/errors/handleUiError';
import { notifySuccess } from '@/services/errors/notifySuccess';
import { cn } from '@/lib/utils';

import EntityEditField from './EntityEditField';
import EntityEditSection from './EntityEditSection';
import EntityEditSummaryRail from './EntityEditSummaryRail';
import { entityEditFormSchema, type EntityEditFormValues } from './entityEditPanel.schema';
import {
  ENTITY_EDIT_FIELD_ORDER,
  NO_PRIMARY_CONTACT_VALUE,
  buildManualOfficialSearchQuery,
  buildEntityEditDefaultValues,
  getChangedFieldLabels,
  getContactLabel,
  getErrorLabels,
  getExplicitPrimaryContact,
  getOfficialResyncIdentityBase,
  buildOfficialResyncDiffs,
  buildPersistedOfficialIdentityValues,
  isOfficialDataLocked,
  normalizeIdentifierDigits,
  normalizeText,
  nullableText,
  optionalText,
  OFFICIAL_SOURCE,
  type OfficialResyncDiff,
  type OfficialResyncReviewField
} from './entityEditPanel.utils';

const NO_COMMERCIAL_VALUE = '__no_commercial__';
const LOCATION_OFFICIAL_FIELDS = new Set<OfficialResyncReviewField>([
  'address',
  'postal_code',
  'department',
  'city'
]);

type OfficialResyncReview = {
  identityMode: OfficialDataResyncIdentityMode;
  baseSiren: string;
  diffs: OfficialResyncDiff[];
  selectedFields: OfficialResyncReviewField[];
  officialValues: Partial<Record<OfficialResyncReviewField, string | null>>;
  syncedAt: string;
};

type EntityEditPanelProps = {
  open: boolean;
  record: DirectoryRecord;
  contacts: EntityContact[];
  agencies: Agency[];
  commercials: DirectoryCommercialOption[];
  userRole: UserRole;
  activeAgencyId: string | null;
  isSaving: boolean;
  onClose: () => void;
  onRequestAddContact: () => void;
  onSaveClient: (payload: ClientPayload) => Promise<void>;
  onSaveProspect: (payload: EntityPayload) => Promise<void>;
  onSaveSupplier: (payload: SupplierEntityPayload) => Promise<void>;
};

const getFieldError = (
  errors: FieldErrors<EntityEditFormValues>,
  field: keyof EntityEditFormValues,
): string | undefined => {
  const message = errors[field]?.message;
  return typeof message === 'string' ? message : undefined;
};

const focusFirstInvalidField = (
  errors: FieldErrors<EntityEditFormValues>,
  setFocus: (field: keyof EntityEditFormValues) => void,
) => {
  const firstField = ENTITY_EDIT_FIELD_ORDER.find((field) => Boolean(errors[field]));
  if (firstField) {
    setFocus(firstField);
  }
};

const getDefaultSelectedOfficialFields = (diffs: OfficialResyncDiff[]): OfficialResyncReviewField[] =>
  diffs
    .map((diff) => diff.field)
    .filter((field) => !LOCATION_OFFICIAL_FIELDS.has(field));

const buildClientPayload = (
  record: DirectoryRecord,
  values: EntityEditFormValues,
  resolvedAgencyId: string | null,
): ClientPayload => {
  const officialSource: ClientPayload['official_data_source'] =
    values.official_data_source === OFFICIAL_SOURCE ? OFFICIAL_SOURCE : null;
  const common = {
    id: record.id,
    client_number: normalizeText(values.client_number),
    name: normalizeText(values.name),
    agency_id: resolvedAgencyId,
    address: normalizeText(values.address),
    postal_code: normalizeText(values.postal_code),
    department: normalizeText(values.department),
    city: normalizeText(values.city),
    siret: nullableText(values.siret),
    siren: nullableText(values.siren),
    naf_code: nullableText(values.naf_code),
    official_name: nullableText(values.official_name),
    official_data_source: officialSource,
    official_data_synced_at: nullableText(values.official_data_synced_at),
    notes: nullableText(values.notes)
  };

  if (values.client_kind === 'individual') {
    return {
      ...common,
      client_kind: 'individual',
      account_type: 'cash',
      cir_commercial_id: null,
      primary_contact: {
        first_name: normalizeText(values.contact_first_name),
        last_name: normalizeText(values.contact_last_name),
        email: optionalText(values.contact_email) ?? '',
        phone: optionalText(values.contact_phone) ?? '',
        position: optionalText(values.contact_position) ?? '',
        service_label: optionalText(values.contact_service_label) ?? '',
        notes: optionalText(values.contact_notes) ?? ''
      }
    };
  }

  return {
    ...common,
    client_kind: 'company',
    account_type: values.account_type,
    cir_commercial_id: values.cir_commercial_id,
    primary_contact_id: values.primary_contact_id
  };
};

const buildProspectPayload = (
  record: DirectoryRecord,
  values: EntityEditFormValues,
  resolvedAgencyId: string | null,
): ProspectEntityPayload => ({
  id: record.id,
  entity_type: 'Prospect',
  name: normalizeText(values.name),
  agency_id: resolvedAgencyId,
  address: nullableText(values.address),
  postal_code: nullableText(values.postal_code),
  department: nullableText(values.department),
  city: nullableText(values.city),
  siret: nullableText(values.siret),
  siren: nullableText(values.siren),
  naf_code: nullableText(values.naf_code),
  official_name: nullableText(values.official_name),
  official_data_source: values.official_data_source === OFFICIAL_SOURCE ? OFFICIAL_SOURCE : null,
  official_data_synced_at: nullableText(values.official_data_synced_at),
  notes: nullableText(values.notes),
  primary_contact_id: values.primary_contact_id
});

const buildSupplierPayload = (
  record: DirectoryRecord,
  values: EntityEditFormValues,
): SupplierEntityPayload => ({
  id: record.id,
  entity_type: 'Fournisseur',
  name: normalizeText(values.name),
  supplier_code: nullableText(values.supplier_code),
  supplier_number: nullableText(values.supplier_number),
  primary_phone: nullableText(values.primary_phone),
  primary_email: nullableText(values.primary_email),
  address: nullableText(values.address),
  postal_code: nullableText(values.postal_code),
  department: nullableText(values.department),
  city: nullableText(values.city),
  siret: nullableText(values.siret),
  siren: nullableText(values.siren),
  naf_code: nullableText(values.naf_code),
  official_name: nullableText(values.official_name),
  official_data_source: values.official_data_source === OFFICIAL_SOURCE ? OFFICIAL_SOURCE : null,
  official_data_synced_at: nullableText(values.official_data_synced_at),
  notes: nullableText(values.notes)
});

const EntityEditPanel = ({
  open,
  record,
  contacts,
  agencies,
  commercials,
  userRole,
  activeAgencyId,
  isSaving,
  onClose,
  onRequestAddContact,
  onSaveClient,
  onSaveProspect,
  onSaveSupplier
}: EntityEditPanelProps) => {
  const [isResyncing, setIsResyncing] = useState(false);
  const [manualOfficialSearchQuery, setManualOfficialSearchQuery] = useState('');
  const [manualOfficialCandidates, setManualOfficialCandidates] = useState<DirectoryCompanySearchResult[]>([]);
  const [isManualOfficialSearching, setIsManualOfficialSearching] = useState(false);
  const [officialResyncReview, setOfficialResyncReview] = useState<OfficialResyncReview | null>(null);
  const [officialDataResync, setOfficialDataResync] = useState<OfficialDataResyncPayload | undefined>();
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
  const isClosingAfterSaveRef = useRef(false);
  const defaultValues = useMemo(() => buildEntityEditDefaultValues(record, contacts), [contacts, record]);
  const form = useForm<EntityEditFormValues>({
    resolver: zodResolver(entityEditFormSchema),
    defaultValues,
    mode: 'onSubmit',
    shouldFocusError: true
  });
  const {
    control,
    formState,
    handleSubmit,
    register,
    reset,
    setError,
    setFocus,
    setValue,
    watch
  } = form;
  const values = watch();
  const isDirty = formState.isDirty;
  const mode = values.mode;
  const isSupplier = mode === 'supplier';
  const isClient = mode === 'client';
  const isIndividualClient = isClient && values.client_kind === 'individual';
  const isCompanyLike = !isIndividualClient;
  const officialLocked = isOfficialDataLocked(record);
  const showAgencySelect = userRole === 'super_admin';
  const activeContacts = useMemo(
    () => contacts.filter((contact) => !contact.archived_at),
    [contacts],
  );
  const dirtyLabels = useMemo(() => getChangedFieldLabels(values, defaultValues), [defaultValues, values]);
  const errorLabels = useMemo(() => getErrorLabels(formState.errors), [formState.errors]);
  const selectedPrimaryContact = activeContacts.find((contact) => contact.id === values.primary_contact_id) ?? null;
  const explicitPrimaryContact = getExplicitPrimaryContact(contacts);
  const primaryContactLabel = isSupplier
    ? normalizeText(values.primary_phone) || normalizeText(values.primary_email) || null
    : isIndividualClient
      ? [values.contact_first_name, values.contact_last_name].map(normalizeText).filter(Boolean).join(' ') || null
      : selectedPrimaryContact
      ? getContactLabel(selectedPrimaryContact)
      : explicitPrimaryContact
        ? getContactLabel(explicitPrimaryContact)
        : null;
  const selectedAgencyName = agencies.find((agency) => agency.id === values.agency_id)?.name
    ?? agencies.find((agency) => agency.id === activeAgencyId)?.name
    ?? 'Agence active';
  const normalizedSiren = normalizeText(values.siren).replace(/\D/g, '');
  const normalizedSiret = normalizeIdentifierDigits(values.siret);
  const persistedSiren = normalizeIdentifierDigits(record.siren);
  const persistedSiret = normalizeIdentifierDigits(record.siret);
  const officialResyncIdentityBase = useMemo(() => getOfficialResyncIdentityBase(record), [record]);
  const canAttachManualOfficialIdentity = isCompanyLike && !officialResyncIdentityBase;
  const hasUnsavedOfficialIdentifierChange =
    normalizedSiren !== persistedSiren || normalizedSiret !== persistedSiret;
  const canResyncOfficialData = isCompanyLike && Boolean(officialResyncIdentityBase) && !hasUnsavedOfficialIdentifierChange;
  const submitting = isSaving || formState.isSubmitting;
  const blocker = useBlocker({
    shouldBlockFn: () => isDirty && !isClosingAfterSaveRef.current,
    enableBeforeUnload: () => isDirty && !isClosingAfterSaveRef.current,
    withResolver: true
  });

  useEffect(() => {
    isClosingAfterSaveRef.current = false;
    reset(defaultValues);
    setManualOfficialSearchQuery(buildManualOfficialSearchQuery(defaultValues));
    setManualOfficialCandidates([]);
    setOfficialResyncReview(null);
    setOfficialDataResync(undefined);
  }, [defaultValues, reset]);

  const requestClose = useCallback(() => {
    if (isDirty) {
      setIsCloseConfirmOpen(true);
      return;
    }

    onClose();
  }, [isDirty, onClose]);

  const handleSheetOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        requestClose();
      }
    },
    [requestClose],
  );

  const handleCancelBlockedClose = useCallback(() => {
    setIsCloseConfirmOpen(false);
    if (blocker.status === 'blocked') {
      blocker.reset();
    }
  }, [blocker]);

  const handleConfirmBlockedClose = useCallback(() => {
    setIsCloseConfirmOpen(false);
    if (blocker.status === 'blocked') {
      blocker.proceed();
      return;
    }
    onClose();
  }, [blocker, onClose]);

  const handlePostalCodeChange = useCallback(
    (value: string) => {
      const digits = value.replace(/\D/g, '').slice(0, 5);
      setValue('postal_code', digits, { shouldDirty: true, shouldValidate: true });
      setValue('department', digits.slice(0, 2), { shouldDirty: true, shouldValidate: true });
    },
    [setValue],
  );

  const handleClientNumberChange = useCallback(
    (value: string) => {
      setValue('client_number', value.replace(/\D/g, '').slice(0, 10), {
        shouldDirty: true,
        shouldValidate: true
      });
    },
    [setValue],
  );

  const handleSupplierCodeChange = useCallback(
    (value: string) => {
      setValue('supplier_code', value.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4), {
        shouldDirty: true,
        shouldValidate: true
      });
    },
    [setValue],
  );

  const handleSupplierNumberChange = useCallback(
    (value: string) => {
      setValue('supplier_number', value.replace(/\D/g, '').slice(0, 15), {
        shouldDirty: true,
        shouldValidate: true
      });
    },
    [setValue],
  );

  const loadOfficialResyncReview = useCallback(async ({
    baseSiren,
    identityMode,
    selectedCandidate
  }: {
    baseSiren: string;
    identityMode: OfficialDataResyncIdentityMode;
    selectedCandidate?: DirectoryCompanySearchResult;
  }) => {
    setIsResyncing(true);
    try {
      const response = await getDirectoryCompanyDetails({ siren: baseSiren });
      if (response.company.siren !== baseSiren) {
        setError('siren', {
          type: 'manual',
          message: 'La source officielle ne confirme pas le SIREN de cette fiche.'
        });
        return;
      }

      const syncedAt = new Date().toISOString();
      const officialValues = {
        siren: response.company.siren,
        official_name: response.company.official_name,
        naf_code: response.company.activite_principale_naf25 ?? response.company.activite_principale ?? '',
        official_data_source: OFFICIAL_SOURCE,
        official_data_synced_at: syncedAt
      } satisfies Partial<Record<OfficialResyncReviewField, string | null>>;
      const candidateSiret = normalizeIdentifierDigits(selectedCandidate?.siret);
      const officialValuesWithCandidate = {
        ...officialValues,
        ...(candidateSiret.length === 14 ? { siret: candidateSiret } : {}),
        ...(selectedCandidate?.address ? { address: selectedCandidate.address } : {}),
        ...(selectedCandidate?.postal_code ? { postal_code: selectedCandidate.postal_code } : {}),
        ...(selectedCandidate?.department ? { department: selectedCandidate.department } : {}),
        ...(selectedCandidate?.city ? { city: selectedCandidate.city } : {})
      } satisfies Partial<Record<OfficialResyncReviewField, string | null>>;
      const currentValues = identityMode === 'manual_candidate_selection'
        ? buildPersistedOfficialIdentityValues(record, values)
        : values;
      const diffs = buildOfficialResyncDiffs(currentValues, officialValuesWithCandidate);
      const selectedFields = getDefaultSelectedOfficialFields(diffs);

      setOfficialDataResync(undefined);
      if (diffs.length === 0) {
        setOfficialResyncReview(null);
        notifySuccess('Données officielles déjà à jour.');
        return;
      }

      setOfficialResyncReview({
        identityMode,
        baseSiren,
        diffs,
        selectedFields,
        officialValues: officialValuesWithCandidate,
        syncedAt
      });
      setManualOfficialCandidates([]);
      notifySuccess('Différences officielles chargées. Cochez les champs à appliquer.');
    } catch (error) {
      handleUiError(error, 'Impossible de resynchroniser les données officielles.', {
        source: 'EntityEditPanel.loadOfficialResyncReview'
      });
    } finally {
      setIsResyncing(false);
    }
  }, [record, setError, values]);

  const handleResyncOfficialData = useCallback(async () => {
    if (!officialResyncIdentityBase || hasUnsavedOfficialIdentifierChange) {
      setError('siren', {
        type: 'manual',
        message: hasUnsavedOfficialIdentifierChange
          ? 'Enregistrez ou annulez les changements SIREN/SIRET avant la resynchronisation.'
          : 'SIREN ou SIRET sauvegardé requis pour resynchroniser.'
      });
      setFocus('siren');
      return;
    }

    await loadOfficialResyncReview({
      baseSiren: officialResyncIdentityBase.siren,
      identityMode: 'persisted_identifier'
    });
  }, [
    hasUnsavedOfficialIdentifierChange,
    loadOfficialResyncReview,
    officialResyncIdentityBase,
    setError,
    setFocus
  ]);

  const handleSearchManualOfficialCandidates = useCallback(async () => {
    const query = normalizeText(manualOfficialSearchQuery);
    if (query.length < 3) {
      setError('name', {
        type: 'manual',
        message: 'Renseignez au moins 3 caractères pour rechercher la société officielle.'
      });
      setFocus('name');
      return;
    }

    setIsManualOfficialSearching(true);
    try {
      const response = await getDirectoryCompanySearch({
        query,
        city: optionalText(values.city),
        postal_code: optionalText(values.postal_code),
        head_office: 'all',
        page: 1,
        per_page: 8
      });
      const candidates = response.companies.filter((company) =>
        normalizeIdentifierDigits(company.siren).length === 9
      );
      setManualOfficialCandidates(candidates);
      setOfficialResyncReview(null);
      setOfficialDataResync(undefined);
      if (candidates.length === 0) {
        notifySuccess('Aucune société officielle trouvée pour cette recherche.');
      }
    } catch (error) {
      handleUiError(error, "Impossible de rechercher la société officielle.", {
        source: 'EntityEditPanel.handleSearchManualOfficialCandidates'
      });
    } finally {
      setIsManualOfficialSearching(false);
    }
  }, [manualOfficialSearchQuery, setError, setFocus, values.city, values.postal_code]);

  const handleUseManualOfficialCandidate = useCallback(async (
    candidate: DirectoryCompanySearchResult
  ) => {
    const candidateSiren = normalizeIdentifierDigits(candidate.siren);
    if (candidateSiren.length !== 9) {
      setError('siren', {
        type: 'manual',
        message: 'Le candidat officiel ne fournit pas de SIREN exploitable.'
      });
      return;
    }

    await loadOfficialResyncReview({
      baseSiren: candidateSiren,
      identityMode: 'manual_candidate_selection',
      selectedCandidate: candidate
    });
  }, [loadOfficialResyncReview, setError]);

  const handleToggleOfficialResyncField = useCallback((field: OfficialResyncReviewField) => {
    setOfficialResyncReview((review) => {
      if (!review) return review;
      if (
        review.identityMode === 'manual_candidate_selection' &&
        field === 'siren' &&
        review.selectedFields.includes('siren')
      ) {
        return review;
      }
      const selectedFields = review.selectedFields.includes(field)
        ? review.selectedFields.filter((entry) => entry !== field)
        : [...review.selectedFields, field];
      return { ...review, selectedFields };
    });
  }, []);

  const handleApplyOfficialResyncSelection = useCallback(() => {
    if (!officialResyncReview || officialResyncReview.selectedFields.length === 0) {
      return;
    }
    if (
      officialResyncReview.identityMode === 'manual_candidate_selection' &&
      !officialResyncReview.selectedFields.includes('siren')
    ) {
      setError('siren', {
        type: 'manual',
        message: 'Le rattachement officiel manuel doit conserver le SIREN.'
      });
      return;
    }

    for (const field of officialResyncReview.selectedFields) {
      const value = officialResyncReview.officialValues[field] ?? '';
      setValue(field, value, { shouldDirty: true, shouldValidate: true });
    }

    setOfficialDataResync({
      identity_mode: officialResyncReview.identityMode,
      base_siren: officialResyncReview.baseSiren,
      selected_fields: officialResyncReview.selectedFields,
      source: OFFICIAL_SOURCE,
      synced_at: officialResyncReview.syncedAt
    });
    setOfficialResyncReview(null);
    notifySuccess('Sélection officielle appliquée. Enregistrez pour confirmer.');
  }, [officialResyncReview, setError, setValue]);

  const onInvalid = useCallback(
    (errors: FieldErrors<EntityEditFormValues>) => {
      focusFirstInvalidField(errors, setFocus);
    },
    [setFocus],
  );

  const onValid = useCallback(
    async (submittedValues: EntityEditFormValues) => {
      const resolvedAgencyId = userRole === 'tcs'
        ? (activeAgencyId ?? submittedValues.agency_id ?? null)
        : (submittedValues.agency_id ?? null);

      try {
        if (submittedValues.mode === 'client') {
          await onSaveClient({
            ...buildClientPayload(record, submittedValues, resolvedAgencyId),
            official_data_resync: officialDataResync
          });
          notifySuccess('Client mis à jour.');
        } else if (submittedValues.mode === 'prospect') {
          await onSaveProspect({
            ...buildProspectPayload(record, submittedValues, resolvedAgencyId),
            official_data_resync: officialDataResync
          });
          notifySuccess('Prospect mis à jour.');
        } else {
          await onSaveSupplier(buildSupplierPayload(record, submittedValues));
          notifySuccess('Fournisseur mis à jour.');
        }
        reset(submittedValues);
        setManualOfficialSearchQuery(buildManualOfficialSearchQuery(submittedValues));
        setManualOfficialCandidates([]);
        setOfficialDataResync(undefined);
        setOfficialResyncReview(null);
        isClosingAfterSaveRef.current = true;
        onClose();
        queueMicrotask(() => {
          isClosingAfterSaveRef.current = false;
        });
      } catch {
        isClosingAfterSaveRef.current = false;
        setError('root', {
          type: 'server',
          message: "Impossible d'enregistrer la fiche. Corrigez les champs signalés ou réessayez."
        });
      }
    },
    [
      activeAgencyId,
      officialDataResync,
      onClose,
      onSaveClient,
      onSaveProspect,
      onSaveSupplier,
      record,
      reset,
      setError,
      userRole
    ],
  );

  return (
    <>
      <Sheet open={open} onOpenChange={handleSheetOpenChange}>
        <SheetContent
          side="right"
          showCloseButton={false}
          overlayClassName="bg-foreground/12 backdrop-blur-[1px]"
          className="flex h-dvh w-full flex-col overflow-hidden border-l border-border bg-background p-0 shadow-2xl sm:w-[min(96vw,1180px)] sm:!max-w-[1180px]"
          aria-describedby="entity-edit-panel-description"
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-5 py-4 backdrop-blur sm:px-7">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <SheetTitle className="truncate text-base font-semibold">
                    Modifier {isSupplier ? 'le fournisseur' : isClient ? 'le client' : 'le prospect'}
                  </SheetTitle>
                  <SheetDescription id="entity-edit-panel-description" className="mt-1 text-xs">
                    {isSupplier && record.supplier_code ? `Code ${record.supplier_code} - ` : null}
                    {isSupplier && !record.supplier_code && record.supplier_number ? `N° fournisseur ${record.supplier_number} - ` : null}
                    {!isSupplier && record.client_number ? `N° ${record.client_number} - ` : null}
                    {record.name}
                  </SheetDescription>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Fermer l'édition"
                  onClick={requestClose}
                >
                  <X aria-hidden="true" />
                </Button>
              </div>
            </header>

            <form
              className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_300px]"
              onSubmit={handleSubmit(onValid, onInvalid)}
            >
              <div className="min-h-0 overflow-y-auto overscroll-contain">
                <input type="hidden" {...register('mode')} />

                <EntityEditSection title="Identité" description="Identification interne et libellé affiché dans l'annuaire.">
                  {isClient ? (
                    <Controller
                      name="client_number"
                      control={control}
                      render={({ field }) => (
                        <EntityEditField
                          label="Numéro client"
                          htmlFor="entity-edit-client-number"
                          error={getFieldError(formState.errors, 'client_number')}
                          required
                        >
                          <Input
                            id="entity-edit-client-number"
                            density="dense"
                            value={field.value ?? ''}
                            onBlur={field.onBlur}
                            onChange={(event) => handleClientNumberChange(event.target.value)}
                            ref={field.ref}
                            aria-invalid={Boolean(formState.errors.client_number)}
                          />
                        </EntityEditField>
                      )}
                    />
                  ) : null}

                  {isSupplier ? (
                    <>
                      <Controller
                        name="supplier_code"
                        control={control}
                        render={({ field }) => (
                          <EntityEditField
                            label="Code fournisseur"
                            htmlFor="entity-edit-supplier-code"
                            error={getFieldError(formState.errors, 'supplier_code')}
                            helper="1 à 4 lettres ou chiffres."
                          >
                            <Input
                              id="entity-edit-supplier-code"
                              density="dense"
                              value={field.value ?? ''}
                              onBlur={field.onBlur}
                              onChange={(event) => handleSupplierCodeChange(event.target.value)}
                              ref={field.ref}
                              className="font-mono uppercase"
                              maxLength={4}
                              spellCheck={false}
                              autoComplete="off"
                              aria-invalid={Boolean(formState.errors.supplier_code)}
                            />
                          </EntityEditField>
                        )}
                      />
                      <Controller
                        name="supplier_number"
                        control={control}
                        render={({ field }) => (
                          <EntityEditField
                            label="N° fournisseur"
                            htmlFor="entity-edit-supplier-number"
                            error={getFieldError(formState.errors, 'supplier_number')}
                            helper="Jusqu'à 15 chiffres."
                          >
                            <Input
                              id="entity-edit-supplier-number"
                              density="dense"
                              value={field.value ?? ''}
                              onBlur={field.onBlur}
                              onChange={(event) => handleSupplierNumberChange(event.target.value)}
                              ref={field.ref}
                              inputMode="numeric"
                              maxLength={15}
                              autoComplete="off"
                              aria-invalid={Boolean(formState.errors.supplier_number)}
                            />
                          </EntityEditField>
                        )}
                      />
                    </>
                  ) : null}

                  <EntityEditField
                    label={isSupplier ? 'Nom fournisseur' : isIndividualClient ? 'Nom affiché' : 'Raison sociale / nom'}
                    htmlFor="entity-edit-name"
                    error={getFieldError(formState.errors, 'name')}
                    required
                    className={isClient ? undefined : 'sm:col-span-2'}
                  >
                    <Input
                      id="entity-edit-name"
                      density="dense"
                      {...register('name')}
                      aria-invalid={Boolean(formState.errors.name)}
                    />
                  </EntityEditField>

                  {isClient ? (
                    <Controller
                      name="account_type"
                      control={control}
                      render={({ field }) => (
                        <EntityEditField
                          label="Type de compte"
                          htmlFor="entity-edit-account-type"
                          helper={isIndividualClient ? 'Particulier : comptant' : undefined}
                        >
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={isIndividualClient}
                          >
                            <SelectTrigger id="entity-edit-account-type" density="dense">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="term">Compte terme</SelectItem>
                              <SelectItem value="cash">Comptant</SelectItem>
                            </SelectContent>
                          </Select>
                        </EntityEditField>
                      )}
                    />
                  ) : null}
                </EntityEditSection>

                <EntityEditSection title="Coordonnées" description="Adresse utilisée pour le dossier et les recherches.">
                  <EntityEditField
                    label="Adresse"
                    htmlFor="entity-edit-address"
                    error={getFieldError(formState.errors, 'address')}
                    required={isClient}
                    className="sm:col-span-2 lg:col-span-3"
                  >
                    <Input
                      id="entity-edit-address"
                      density="dense"
                      {...register('address')}
                      aria-invalid={Boolean(formState.errors.address)}
                    />
                  </EntityEditField>

                  <Controller
                    name="postal_code"
                    control={control}
                    render={({ field }) => (
                      <EntityEditField
                        label="Code postal"
                        htmlFor="entity-edit-postal-code"
                        error={getFieldError(formState.errors, 'postal_code')}
                        required={isClient}
                      >
                        <Input
                          id="entity-edit-postal-code"
                          density="dense"
                          value={field.value ?? ''}
                          onBlur={field.onBlur}
                          onChange={(event) => handlePostalCodeChange(event.target.value)}
                          ref={field.ref}
                          aria-invalid={Boolean(formState.errors.postal_code)}
                        />
                      </EntityEditField>
                    )}
                  />

                  <EntityEditField
                    label="Département"
                    htmlFor="entity-edit-department"
                    error={getFieldError(formState.errors, 'department')}
                    required={isClient}
                  >
                    <Input
                      id="entity-edit-department"
                      density="dense"
                      {...register('department')}
                      aria-invalid={Boolean(formState.errors.department)}
                    />
                  </EntityEditField>

                  <EntityEditField
                    label="Ville"
                    htmlFor="entity-edit-city"
                    error={getFieldError(formState.errors, 'city')}
                    required={!isSupplier}
                  >
                    <Input
                      id="entity-edit-city"
                      density="dense"
                      {...register('city')}
                      aria-invalid={Boolean(formState.errors.city)}
                    />
                  </EntityEditField>
                </EntityEditSection>

                {!isSupplier ? (
                  <EntityEditSection title="Compte & attribution" description="Agence propriétaire et affectation commerciale.">
                    {showAgencySelect ? (
                      <Controller
                        name="agency_id"
                        control={control}
                        render={({ field }) => (
                          <EntityEditField
                            label="Agence"
                            htmlFor="entity-edit-agency"
                            error={getFieldError(formState.errors, 'agency_id')}
                            required
                          >
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger
                                id="entity-edit-agency"
                                density="dense"
                                aria-invalid={Boolean(formState.errors.agency_id)}
                              >
                                <SelectValue placeholder="Sélectionner une agence" />
                              </SelectTrigger>
                              <SelectContent>
                                {agencies.map((agency) => (
                                  <SelectItem key={agency.id} value={agency.id}>{agency.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </EntityEditField>
                        )}
                      />
                    ) : (
                      <EntityEditField label="Agence" htmlFor="entity-edit-agency-readonly">
                        <div
                          id="entity-edit-agency-readonly"
                          className="flex h-8 items-center rounded-md border border-input bg-muted/35 px-2.5 text-xs text-muted-foreground"
                        >
                          {selectedAgencyName}
                        </div>
                      </EntityEditField>
                    )}

                    {isClient && values.client_kind === 'company' ? (
                      <Controller
                        name="cir_commercial_id"
                        control={control}
                        render={({ field }) => (
                          <EntityEditField label="Commercial CIR" htmlFor="entity-edit-commercial">
                            <Select
                              value={field.value ?? NO_COMMERCIAL_VALUE}
                              onValueChange={(value) => field.onChange(value === NO_COMMERCIAL_VALUE ? null : value)}
                            >
                              <SelectTrigger id="entity-edit-commercial" density="dense">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={NO_COMMERCIAL_VALUE}>Non attribué</SelectItem>
                                {commercials.map((commercial) => (
                                  <SelectItem key={commercial.id} value={commercial.id}>
                                    {commercial.display_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </EntityEditField>
                        )}
                      />
                    ) : null}
                  </EntityEditSection>
                ) : null}

                <EntityEditSection
                  title={isSupplier ? 'Coordonnées principales' : 'Contact principal'}
                  description={
                    isSupplier
                      ? 'Téléphone ou email requis pour la fiche fournisseur.'
                      : isIndividualClient ? 'Obligatoire pour un client particulier.' : 'Optionnel, sans fallback implicite.'
                  }
                >
                  {isSupplier ? (
                    <>
                      <EntityEditField
                        label="Téléphone principal"
                        htmlFor="entity-edit-primary-phone"
                        error={getFieldError(formState.errors, 'primary_phone')}
                        helper="Téléphone ou email requis."
                      >
                        <Input
                          id="entity-edit-primary-phone"
                          density="dense"
                          type="tel"
                          autoComplete="off"
                          {...register('primary_phone')}
                          aria-invalid={Boolean(formState.errors.primary_phone)}
                        />
                      </EntityEditField>
                      <EntityEditField
                        label="Email principal"
                        htmlFor="entity-edit-primary-email"
                        error={getFieldError(formState.errors, 'primary_email')}
                      >
                        <Input
                          id="entity-edit-primary-email"
                          density="dense"
                          type="email"
                          autoComplete="off"
                          spellCheck={false}
                          {...register('primary_email')}
                          aria-invalid={Boolean(formState.errors.primary_email)}
                        />
                      </EntityEditField>
                      <div className="flex items-end">
                        <Button type="button" variant="outline" size="sm" onClick={onRequestAddContact}>
                          <ChevronDown aria-hidden="true" />
                          Créer un contact
                        </Button>
                      </div>
                    </>
                  ) : isCompanyLike ? (
                    <>
                      <Controller
                        name="primary_contact_id"
                        control={control}
                        render={({ field }) => (
                          <EntityEditField label="Contact principal" htmlFor="entity-edit-primary-contact">
                            <Select
                              value={field.value ?? NO_PRIMARY_CONTACT_VALUE}
                              onValueChange={(value) => field.onChange(value === NO_PRIMARY_CONTACT_VALUE ? null : value)}
                            >
                              <SelectTrigger id="entity-edit-primary-contact" density="dense">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={NO_PRIMARY_CONTACT_VALUE}>Aucun contact principal</SelectItem>
                                {activeContacts.map((contact) => (
                                  <SelectItem key={contact.id} value={contact.id}>
                                    {getContactLabel(contact)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </EntityEditField>
                        )}
                      />
                      <div className="flex items-end">
                        <Button type="button" variant="outline" size="sm" onClick={onRequestAddContact}>
                          <ChevronDown aria-hidden="true" />
                          Créer un contact
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <EntityEditField
                        label="Prénom"
                        htmlFor="entity-edit-contact-first-name"
                        error={getFieldError(formState.errors, 'contact_first_name')}
                        required
                      >
                        <Input
                          id="entity-edit-contact-first-name"
                          density="dense"
                          {...register('contact_first_name')}
                          aria-invalid={Boolean(formState.errors.contact_first_name)}
                        />
                      </EntityEditField>
                      <EntityEditField
                        label="Nom"
                        htmlFor="entity-edit-contact-last-name"
                        error={getFieldError(formState.errors, 'contact_last_name')}
                        required
                      >
                        <Input
                          id="entity-edit-contact-last-name"
                          density="dense"
                          {...register('contact_last_name')}
                          aria-invalid={Boolean(formState.errors.contact_last_name)}
                        />
                      </EntityEditField>
                      <EntityEditField
                        label="Téléphone"
                        htmlFor="entity-edit-contact-phone"
                        error={getFieldError(formState.errors, 'contact_phone')}
                        helper="Téléphone ou email"
                      >
                        <Input
                          id="entity-edit-contact-phone"
                          density="dense"
                          {...register('contact_phone')}
                          aria-invalid={Boolean(formState.errors.contact_phone)}
                        />
                      </EntityEditField>
                      <EntityEditField
                        label="Email"
                        htmlFor="entity-edit-contact-email"
                        error={getFieldError(formState.errors, 'contact_email')}
                      >
                        <Input
                          id="entity-edit-contact-email"
                          density="dense"
                          type="email"
                          {...register('contact_email')}
                          aria-invalid={Boolean(formState.errors.contact_email)}
                        />
                      </EntityEditField>
                      <EntityEditField label="Fonction" htmlFor="entity-edit-contact-position">
                        <Input id="entity-edit-contact-position" density="dense" {...register('contact_position')} />
                      </EntityEditField>
                      <EntityEditField label="Service" htmlFor="entity-edit-contact-service">
                        <Input id="entity-edit-contact-service" density="dense" {...register('contact_service_label')} />
                      </EntityEditField>
                      <EntityEditField label="Notes contact" htmlFor="entity-edit-contact-notes" className="sm:col-span-2 lg:col-span-3">
                        <Textarea
                          id="entity-edit-contact-notes"
                          className="min-h-20 resize-none px-3 py-2 text-xs"
                          {...register('contact_notes')}
                        />
                      </EntityEditField>
                    </>
                  )}
                </EntityEditSection>

                <EntityEditSection
                  title="Données officielles"
                  description={officialLocked ? 'Champs verrouillés hors resynchronisation.' : 'Fiche manuelle : édition directe possible.'}
                >
                  <EntityEditField label="SIRET" htmlFor="entity-edit-siret">
                    <Input
                      id="entity-edit-siret"
                      density="dense"
                      readOnly={officialLocked}
                      aria-readonly={officialLocked}
                      className={cn(officialLocked && 'bg-muted/35 text-muted-foreground')}
                      {...register('siret')}
                    />
                  </EntityEditField>
                  <EntityEditField
                    label="SIREN"
                    htmlFor="entity-edit-siren"
                    error={getFieldError(formState.errors, 'siren')}
                  >
                    <Input
                      id="entity-edit-siren"
                      density="dense"
                      readOnly={officialLocked}
                      aria-readonly={officialLocked}
                      className={cn(officialLocked && 'bg-muted/35 text-muted-foreground')}
                      {...register('siren')}
                      aria-invalid={Boolean(formState.errors.siren)}
                    />
                  </EntityEditField>
                  <EntityEditField label="NAF" htmlFor="entity-edit-naf">
                    <Input
                      id="entity-edit-naf"
                      density="dense"
                      readOnly={officialLocked}
                      aria-readonly={officialLocked}
                      className={cn(officialLocked && 'bg-muted/35 text-muted-foreground')}
                      {...register('naf_code')}
                    />
                  </EntityEditField>
                  <EntityEditField label="Nom officiel" htmlFor="entity-edit-official-name" className="sm:col-span-2">
                    <Input
                      id="entity-edit-official-name"
                      density="dense"
                      readOnly={officialLocked}
                      aria-readonly={officialLocked}
                      className={cn(officialLocked && 'bg-muted/35 text-muted-foreground')}
                      {...register('official_name')}
                    />
                  </EntityEditField>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isResyncing || !canResyncOfficialData}
                      onClick={() => void handleResyncOfficialData()}
                    >
                      {isResyncing ? <Loader2 aria-hidden="true" className="animate-spin" /> : <RefreshCcw aria-hidden="true" />}
                      Resynchroniser
                    </Button>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3 rounded-md border border-border bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
                    {!isCompanyLike ? (
                      <span>Resynchronisation officielle réservée aux sociétés et prospects entreprise.</span>
                    ) : officialResyncIdentityBase ? (
                      <span>
                        Base de vérification : <span className="font-semibold text-foreground">{officialResyncIdentityBase.label}</span>.
                      </span>
                    ) : (
                      <span>Fiche sans SIREN/SIRET sauvegardé : choisissez d&apos;abord une société officielle dans l&apos;annuaire.</span>
                    )}
                    {hasUnsavedOfficialIdentifierChange ? (
                      <span className="mt-1 block font-medium text-amber-700">
                        Des changements SIREN/SIRET non sauvegardés bloquent la resynchronisation.
                      </span>
                    ) : null}
                  </div>

                  {canAttachManualOfficialIdentity ? (
                    <div className="sm:col-span-2 lg:col-span-3 rounded-md border border-border bg-background p-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <div className="min-w-0 flex-1">
                          <label
                            htmlFor="entity-edit-manual-official-search"
                            className="text-xs font-semibold text-foreground"
                          >
                            Rechercher la société officielle
                          </label>
                          <Input
                            id="entity-edit-manual-official-search"
                            className="mt-1"
                            density="dense"
                            value={manualOfficialSearchQuery}
                            onChange={(event) => setManualOfficialSearchQuery(event.target.value)}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isManualOfficialSearching || isResyncing}
                          onClick={() => void handleSearchManualOfficialCandidates()}
                        >
                          {isManualOfficialSearching ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Search aria-hidden="true" />}
                          Identifier
                        </Button>
                      </div>
                      {manualOfficialCandidates.length > 0 ? (
                        <div className="mt-3 divide-y divide-border rounded-md border border-border">
                          {manualOfficialCandidates.map((candidate) => {
                            const candidateSiren = normalizeIdentifierDigits(candidate.siren);
                            const candidateSiret = normalizeIdentifierDigits(candidate.siret);
                            const candidateLocation = [
                              candidate.address,
                              candidate.postal_code,
                              candidate.city
                            ].map(normalizeText).filter(Boolean).join(' - ');
                            return (
                              <button
                                key={`${candidateSiren}-${candidateSiret || candidate.name}`}
                                type="button"
                                className="flex w-full flex-col gap-1 px-3 py-2 text-left text-xs hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                disabled={isResyncing}
                                onClick={() => void handleUseManualOfficialCandidate(candidate)}
                              >
                                <span className="font-semibold text-foreground">{candidate.official_name ?? candidate.name}</span>
                                <span className="text-muted-foreground">
                                  SIREN {candidateSiren}
                                  {candidateSiret ? ` - SIRET ${candidateSiret}` : ''}
                                  {candidate.establishment_status === 'closed' ? ' - établissement fermé' : ''}
                                </span>
                                {candidateLocation ? (
                                  <span className="text-muted-foreground">{candidateLocation}</span>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {officialResyncReview ? (
                    <div className="sm:col-span-2 lg:col-span-3 rounded-md border border-border bg-muted/20 p-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold text-foreground">Revue des différences officielles</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            Adresse, code postal, département et ville restent décochés par défaut.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={officialResyncReview.selectedFields.length === 0}
                          onClick={handleApplyOfficialResyncSelection}
                        >
                          <Check aria-hidden="true" />
                          Appliquer la sélection
                        </Button>
                      </div>
                      <div className="mt-3 divide-y divide-border rounded-md border border-border bg-background">
                        {officialResyncReview.diffs.map((diff) => (
                          <label
                            key={diff.field}
                            className="grid cursor-pointer gap-2 px-3 py-2 text-xs sm:grid-cols-[20px_140px_minmax(0,1fr)_minmax(0,1fr)] sm:items-start"
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5 size-4 rounded border-border"
                              disabled={
                                officialResyncReview.identityMode === 'manual_candidate_selection' &&
                                diff.field === 'siren'
                              }
                              checked={officialResyncReview.selectedFields.includes(diff.field)}
                              onChange={() => handleToggleOfficialResyncField(diff.field)}
                            />
                            <span className="font-semibold text-foreground">
                              {diff.label}
                              {officialResyncReview.identityMode === 'manual_candidate_selection' && diff.field === 'siren'
                                ? <span className="block text-[10px] font-medium text-muted-foreground">Obligatoire</span>
                                : null}
                            </span>
                            <span className="min-w-0 text-muted-foreground">
                              <span className="block text-[10px] font-semibold uppercase text-muted-foreground/75">
                                Actuel
                              </span>
                              <span className="break-words">{diff.currentValue}</span>
                            </span>
                            <span className="min-w-0 text-foreground">
                              <span className="block text-[10px] font-semibold uppercase text-muted-foreground/75">
                                Officiel
                              </span>
                              <span className="break-words font-medium">{diff.officialValue}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {officialDataResync ? (
                    <div className="sm:col-span-2 lg:col-span-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900">
                      {officialDataResync.selected_fields.length} champ(s) officiel(s) sélectionné(s). Enregistrez pour appliquer.
                    </div>
                  ) : null}
                </EntityEditSection>

                <EntityEditSection title="Notes" description="Informations internes visibles sur la fiche.">
                  <EntityEditField label="Notes internes" htmlFor="entity-edit-notes" className="sm:col-span-2 lg:col-span-3">
                    <Textarea
                      id="entity-edit-notes"
                      className="min-h-28 resize-none px-3 py-2 text-sm"
                      {...register('notes')}
                    />
                  </EntityEditField>
                </EntityEditSection>

                <details className="border-t border-border px-5 py-4 lg:hidden">
                  <summary className="cursor-pointer text-sm font-semibold text-foreground">Résumé</summary>
                  <EntityEditSummaryRail
                    className="mt-4"
                    dirtyLabels={dirtyLabels}
                    errorLabels={errorLabels}
                    isOfficialLocked={officialLocked}
                    primaryContactLabel={primaryContactLabel}
                  />
                </details>

                <div className="sticky bottom-0 z-10 border-t border-border bg-background/95 px-5 py-3 backdrop-blur sm:px-7">
                  {formState.errors.root?.message ? (
                    <p role="alert" className="mb-2 text-xs font-medium text-destructive">
                      {formState.errors.root.message}
                    </p>
                  ) : null}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                      {dirtyLabels.length > 0 ? `${dirtyLabels.length} modification(s)` : 'Aucune modification'}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!isDirty || submitting}
                        onClick={() => {
                          reset(defaultValues);
                          setManualOfficialSearchQuery(buildManualOfficialSearchQuery(defaultValues));
                          setManualOfficialCandidates([]);
                          setOfficialDataResync(undefined);
                          setOfficialResyncReview(null);
                        }}
                      >
                        <RotateCcw aria-hidden="true" />
                        Réinitialiser
                      </Button>
                      <Button type="submit" size="sm" disabled={!isDirty || submitting}>
                        {submitting ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Save aria-hidden="true" />}
                        Enregistrer
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hidden min-h-0 border-l border-border bg-muted/15 px-5 py-5 lg:block">
                <EntityEditSummaryRail
                  className="sticky top-5"
                  dirtyLabels={dirtyLabels}
                  errorLabels={errorLabels}
                  isOfficialLocked={officialLocked}
                  primaryContactLabel={primaryContactLabel}
                />
              </div>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={isCloseConfirmOpen || blocker.status === 'blocked'}>
        <AlertDialogContent className="rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Modifications non sauvegardées</AlertDialogTitle>
            <AlertDialogDescription>
              En quittant cette édition, les changements en cours seront perdus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelBlockedClose}>
              Rester
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmBlockedClose}>
              <Check aria-hidden="true" />
              Quitter sans enregistrer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EntityEditPanel;
