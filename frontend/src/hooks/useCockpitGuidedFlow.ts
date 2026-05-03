import { useCallback, useEffect, useMemo, useState } from 'react';

import type { RelationMode } from '@/constants/relations';
import type { Entity, EntityContact } from '@/types';

export type CockpitGuidedStep =
  | 'channel'
  | 'relation'
  | 'search'
  | 'contact'
  | 'subject'
  | 'details';

type UseCockpitGuidedFlowParams = {
  relationMode: RelationMode;
  entityType: string;
  selectedEntity: Entity | null;
  selectedContact: EntityContact | null;
  companyName: string;
  companyCity: string;
  contactFirstName: string;
  contactLastName: string;
  contactPosition: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  interactionType: string;
  contactService: string;
  statusValue: string;
  subject: string;
};

export const GUIDED_STEP_ORDER: CockpitGuidedStep[] = [
  'channel',
  'relation',
  'search',
  'contact',
  'subject',
  'details'
];

const hasText = (value: string): boolean => value.trim().length > 0;

export const useCockpitGuidedFlow = ({
  relationMode,
  entityType,
  selectedEntity,
  selectedContact,
  companyName,
  companyCity,
  contactFirstName,
  contactLastName,
  contactPosition,
  contactName,
  contactPhone,
  contactEmail,
  interactionType,
  contactService,
  statusValue,
  subject
}: UseCockpitGuidedFlowParams) => {
  const hasExistingProgress = Boolean(selectedEntity || selectedContact)
    || [entityType, companyName, companyCity, contactFirstName, contactLastName, contactName, contactPhone, contactEmail, interactionType, contactService, statusValue, subject].some(hasText);
  const [isChannelConfirmed, setIsChannelConfirmed] = useState(hasExistingProgress);
  const [isRelationConfirmed, setIsRelationConfirmed] = useState(hasText(entityType));
  const [editingStep, setEditingStep] = useState<CockpitGuidedStep | null>(null);

  const hasContactMethod = hasText(contactPhone) || hasText(contactEmail);

  useEffect(() => {
    if (hasExistingProgress) {
      setIsChannelConfirmed(true);
    }
  }, [hasExistingProgress]);
  useEffect(() => {
    if (hasText(entityType)) {
      setIsRelationConfirmed(true);
    }
  }, [entityType]);
  const identityComplete = useMemo(() => {
    if (relationMode === 'client') return Boolean(selectedEntity);
    if (relationMode === 'individual') return Boolean(selectedEntity) || (hasText(contactFirstName) && hasText(contactLastName));
    if (relationMode === 'internal') return hasText(contactName) || hasText(contactLastName);
    if (relationMode === 'solicitation') return hasText(companyName) && hasText(contactPhone);
    if (relationMode === 'prospect') return Boolean(selectedEntity) || (hasText(companyName) && hasText(companyCity));
    if (relationMode === 'supplier') return Boolean(selectedEntity) || hasText(companyName);
    return hasText(entityType) && (Boolean(selectedEntity) || hasText(companyName));
  }, [companyCity, companyName, contactFirstName, contactLastName, contactName, contactPhone, relationMode, selectedEntity]);

  const contactComplete = useMemo(() => {
    if (relationMode === 'client') return Boolean(selectedContact);
    if (relationMode === 'individual') return (Boolean(selectedContact) || (hasText(contactFirstName) && hasText(contactLastName))) && hasContactMethod;
    if (relationMode === 'internal' || relationMode === 'solicitation') return identityComplete;
    const hasContactName = hasText(contactFirstName) || hasText(contactLastName);
    if (relationMode === 'supplier') return hasContactName && hasText(contactPosition) && hasContactMethod;
    return hasContactName && hasContactMethod;
  }, [contactFirstName, contactLastName, contactPosition, hasContactMethod, identityComplete, relationMode, selectedContact]);

  const qualificationComplete = hasText(interactionType) && hasText(contactService) && hasText(statusValue);
  const subjectComplete = hasText(subject) && qualificationComplete;

  const firstIncompleteStep = useMemo<CockpitGuidedStep>(() => {
    if (!isChannelConfirmed) return 'channel';
    if (!isRelationConfirmed) return 'relation';
    if (!identityComplete) return 'search';
    if (!contactComplete) return 'contact';
    if (!subjectComplete) return 'subject';
    return 'details';
  }, [contactComplete, identityComplete, isChannelConfirmed, isRelationConfirmed, qualificationComplete, subjectComplete]);

  const activeStep = editingStep ?? firstIncompleteStep;

  const completeStep = useCallback((step: CockpitGuidedStep) => {
    if (step === 'channel') {
      setIsChannelConfirmed(true);
    }
    if (step === 'relation') {
      setIsRelationConfirmed(true);
    }
    setEditingStep(null);
  }, []);

  const editStep = useCallback((step: CockpitGuidedStep) => {
    setEditingStep(step);
  }, []);

  const resetFlow = useCallback(() => {
    setIsChannelConfirmed(false);
    setIsRelationConfirmed(false);
    setEditingStep(null);
  }, []);

  return {
    activeStep,
    completeStep,
    editStep,
    resetFlow,
    isChannelConfirmed,
    isRelationConfirmed,
    identityComplete,
    contactComplete,
    qualificationComplete,
    subjectComplete
  };
};
