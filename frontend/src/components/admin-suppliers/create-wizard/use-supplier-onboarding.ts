import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';

import type { DirectoryCompanySearchResult } from '../../../../../shared/schemas/system/directory.schema';
import { useSaveSupplier } from '../../../hooks/entities/suppliers/useSaveSupplier';
import { notifySuccess } from '@/services/errors/notifySuccess';
import { DEFAULT_SUPPLIER_SEARCH } from '../supplierDirectorySearch';
import useSupplierSearchFilters from './search-step/use-supplier-search-filters';
import useEstablishmentSelection from './search-step/use-establishment-selection';

export type Step = 'search' | 'details' | 'review';
export type StatusFilter = 'all' | 'open' | 'closed' | 'unknown';
export type HeadOfficeFilter = 'all' | 'head_office' | 'secondary';

export type SupplierDraft = {
  name: string;
  supplier_code: string;
  supplier_number: string;
  primary_phone: string;
  primary_email: string;
  address: string;
  postal_code: string;
  department: string;
  city: string;
  siren: string;
  siret: string;
  naf_code: string;
  official_name: string;
  official_data_source: 'api-recherche-entreprises' | null;
  official_data_synced_at: string | null;
  notes: string;
};

/**
 * Returns an empty supplier draft object.
 * @returns {SupplierDraft} An empty supplier draft.
 */
const emptyDraft = (): SupplierDraft => ({
  name: '',
  supplier_code: '',
  supplier_number: '',
  primary_phone: '',
  primary_email: '',
  address: '',
  postal_code: '',
  department: '',
  city: '',
  siren: '',
  siret: '',
  naf_code: '',
  official_name: '',
  official_data_source: null,
  official_data_synced_at: null,
  notes: ''
});

/**
 * Builds a supplier draft from official company search results.
 * @param {DirectoryCompanySearchResult} company - The company search result.
 * @returns {SupplierDraft} The prepared supplier draft.
 */
const buildDraftFromOfficial = (company: DirectoryCompanySearchResult): SupplierDraft => ({
  ...emptyDraft(),
  name: company.name,
  address: company.address ?? '',
  postal_code: company.postal_code ?? '',
  department: company.department ?? '',
  city: company.city ?? '',
  siren: company.siren ?? '',
  siret: company.siret ?? '',
  naf_code: company.naf_code ?? '',
  official_name: company.official_name ?? company.name,
  official_data_source: 'api-recherche-entreprises',
  official_data_synced_at: company.official_data_synced_at ?? new Date().toISOString()
});

/**
 * Custom hook to manage the state and actions of the supplier onboarding wizard flow.
 * Orchestrates step routing, draft form state, and backend save mutations.
 * @returns {object} State values and action handlers.
 */
const useSupplierOnboarding = () => {
  const navigate = useNavigate({ from: '/admin/suppliers/new' });
  const [step, setStep] = useState<Step>('search');
  const [draft, setDraft] = useState<SupplierDraft>(() => emptyDraft());
  const [hasAttemptedNext, setHasAttemptedNext] = useState(false);

  const saveSupplier = useSaveSupplier(false);

  // Delegate search filters and API calling to dedicated sub-hook
  const searchFilters = useSupplierSearchFilters();

  // Delegate establishment listing, filtering and pagination to dedicated sub-hook
  const selection = useEstablishmentSelection(searchFilters.queryState.visibleGroups);

  const isNameValid = draft.name.trim().length > 0;
  const isContactValid = draft.primary_phone.trim().length > 0 || draft.primary_email.trim().length > 0;
  const canContinueDetails = isNameValid && isContactValid;

  const activeStepIndex = ['search', 'details', 'review'].indexOf(step);

  /**
   * Updates a field value in the supplier draft.
   * @param {keyof SupplierDraft} key - Field key.
   * @param {string} value - New field value.
   */
  const updateDraft = (key: keyof SupplierDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  /**
   * Updates and formats the internal supplier code.
   * @param {string} value - Raw internal code input.
   */
  const updateSupplierCode = (value: string) => {
    updateDraft('supplier_code', value.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4));
  };

  /**
   * Updates and formats the supplier number.
   * @param {string} value - Raw supplier number input.
   */
  const updateSupplierNumber = (value: string) => {
    updateDraft('supplier_number', value.replace(/\D/g, '').slice(0, 15));
  };

  /**
   * Imports selected establishment details into the draft and advances to Details step.
   */
  const importSelectedCompany = () => {
    if (!selection.selectionState.selectedCompany) return;
    setDraft(buildDraftFromOfficial(selection.selectionState.selectedCompany));
    setHasAttemptedNext(false);
    setStep('details');
  };

  /**
   * Saves the supplier and navigates back to list.
   * @returns {Promise<void>} Resolves when the save mutation completes.
   */
  const save = async (): Promise<void> => {
    setHasAttemptedNext(true);
    if (!canContinueDetails || saveSupplier.isPending) return;
    await saveSupplier.mutateAsync({
      entity_type: 'Fournisseur',
      name: draft.name,
      supplier_code: draft.supplier_code,
      supplier_number: draft.supplier_number,
      primary_phone: draft.primary_phone,
      primary_email: draft.primary_email,
      address: draft.address,
      postal_code: draft.postal_code,
      department: draft.department,
      city: draft.city,
      siren: draft.siren,
      siret: draft.siret,
      naf_code: draft.naf_code,
      official_name: draft.official_name,
      official_data_source: draft.official_data_source,
      official_data_synced_at: draft.official_data_synced_at,
      notes: draft.notes
    });
    notifySuccess('Fournisseur créé.');
    void navigate({ to: '/admin/suppliers', search: () => DEFAULT_SUPPLIER_SEARCH });
  };

  /**
   * Advances from Details step to Review step, performing validations first.
   */
  const handleContinueToReview = () => {
    setHasAttemptedNext(true);
    if (canContinueDetails) {
      setStep('review');
    }
  };

  return {
    // Delegated search and selection hook outputs
    searchFilters,
    selection,

    // Onboarding Core wizard states/methods
    step,
    setStep,
    draft,
    setDraft,
    hasAttemptedNext,
    setHasAttemptedNext,
    saveSupplier,
    isNameValid,
    isContactValid,
    canContinueDetails,
    activeStepIndex,
    updateDraft,
    updateSupplierCode,
    updateSupplierNumber,
    importSelectedCompany,
    save,
    handleContinueToReview
  };
};

export default useSupplierOnboarding;
