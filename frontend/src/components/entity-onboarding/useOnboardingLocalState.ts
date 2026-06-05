import { useDeferredValue, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';

import type {
  CompanySearchHeadOfficeFilter,
  CompanySearchStatusFilter,
  EntityOnboardingSeed,
} from './entityOnboarding.types';

export const useOnboardingLocalState = (
  initialEntity: EntityOnboardingSeed | null,
  initialManualEntry: boolean,
) => {
  const [searchDraft, setSearchDraft] = useState(initialEntity?.name ?? '');
  const [departmentFilter, setDepartmentFilter] = useState(
    initialEntity?.department ?? '',
  );
  const [postalCodeFilter, setPostalCodeFilter] = useState(
    initialEntity?.postal_code ?? '',
  );
  const [cityFilter, setCityFilter] = useState(initialEntity?.city ?? '');
  const [nafCodeFilter, setNafCodeFilter] = useState(
    initialEntity?.naf_code ?? '',
  );
  const [activitySectionFilter, setActivitySectionFilter] = useState('');
  const [headOfficeFilter, setHeadOfficeFilter] =
    useState<CompanySearchHeadOfficeFilter>('all');
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
  const deferredPostalCodeFilter = useDeferredValue(postalCodeFilter.trim());
  const deferredCityFilter = useDeferredValue(cityFilter.trim());
  const deferredNafCodeFilter = useDeferredValue(nafCodeFilter.trim());
  const deferredActivitySectionFilter = useDeferredValue(
    activitySectionFilter.trim(),
  );
  const deferredHeadOfficeFilter = useDeferredValue(headOfficeFilter);

  return {
    activitySectionFilter,
    cityFilter,
    deferredActivitySectionFilter,
    deferredCityFilter,
    deferredDepartmentFilter,
    deferredHeadOfficeFilter,
    deferredNafCodeFilter,
    deferredPostalCodeFilter,
    deferredSearchDraft,
    departmentFilter,
    hasInitializedOpenRef,
    headOfficeFilter,
    isCloseConfirmOpen,
    isSaving,
    manualEntry,
    nafCodeFilter,
    postalCodeFilter,
    reducedMotion,
    searchDraft,
    selectedGroupId,
    setActivitySectionFilter,
    setCityFilter,
    setDepartmentFilter,
    setHeadOfficeFilter,
    setIsCloseConfirmOpen,
    setIsSaving,
    setManualEntry,
    setNafCodeFilter,
    setPostalCodeFilter,
    setSearchDraft,
    setSelectedGroupId,
    setStatusFilter,
    setStepError,
    statusFilter,
    stepError,
  };
};
