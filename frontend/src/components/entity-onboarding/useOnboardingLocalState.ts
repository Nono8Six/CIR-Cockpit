import { useDeferredValue, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';

import type {
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

  return {
    deferredDepartmentFilter,
    deferredSearchDraft,
    departmentFilter,
    hasInitializedOpenRef,
    isCloseConfirmOpen,
    isSaving,
    manualEntry,
    reducedMotion,
    searchDraft,
    selectedGroupId,
    setDepartmentFilter,
    setIsCloseConfirmOpen,
    setIsSaving,
    setManualEntry,
    setSearchDraft,
    setSelectedGroupId,
    setStatusFilter,
    setStepError,
    statusFilter,
    stepError,
  };
};
