import { useMemo } from 'react';

import type { Channel, Entity, EntityContact } from '@/types';

type StepStatus = 'complete' | 'current' | 'upcoming';

type Step = {
  label: string;
  status: StepStatus;
};

type InteractionStepperInput = {
  channel: Channel;
  entityType: string;
  companyName: string;
  companyCity: string;
  contactFirstName: string;
  contactLastName: string;
  contactPosition: string;
  contactPhone: string;
  contactService: string;
  interactionType: string;
  hasContactMethod: boolean;
  isClientRelation: boolean;
  isProspectRelation: boolean;
  isSupplierRelation: boolean;
  isInternalRelation: boolean;
  isSolicitationRelation: boolean;
  selectedEntity: Entity | null;
  selectedContact: EntityContact | null;
};

export const useInteractionStepper = ({
  channel,
  entityType,
  companyName,
  companyCity,
  contactFirstName,
  contactLastName,
  contactPosition,
  contactPhone,
  contactService,
  interactionType,
  hasContactMethod,
  isClientRelation,
  isProspectRelation,
  isSupplierRelation,
  isInternalRelation,
  isSolicitationRelation,
  selectedEntity,
  selectedContact
}: InteractionStepperInput) => {
  const stepperSteps = useMemo<Step[]>(() => {
    const identityComplete = isClientRelation
      ? Boolean(selectedEntity)
      : isInternalRelation
        ? true
        : Boolean(companyName.trim() && (!isProspectRelation || companyCity.trim()));
    const contactComplete = isClientRelation
      ? Boolean(selectedContact)
      : isSolicitationRelation
        ? Boolean(contactPhone.trim())
        : Boolean(
            contactFirstName.trim()
              && contactLastName.trim()
              && (isInternalRelation || hasContactMethod)
              && (!isSupplierRelation || contactPosition.trim())
          );
    const typeComplete = Boolean(interactionType.trim() && contactService.trim());
    const steps = [
      Boolean(channel),
      Boolean(entityType),
      identityComplete,
      contactComplete,
      typeComplete
    ];
    const firstIncomplete = steps.findIndex((step) => !step);
    const labels = ['Canal', 'Relation', 'Identité', 'Contact', 'Type & Service'];

    return labels.map((label, index) => {
      if (firstIncomplete === -1) {
        return { label, status: 'complete' };
      }
      if (index < firstIncomplete) {
        return { label, status: 'complete' };
      }
      if (index === firstIncomplete) {
        return { label, status: 'current' };
      }
      return { label, status: 'upcoming' };
    });
  }, [
    channel,
    companyCity,
    companyName,
    contactFirstName,
    contactLastName,
    contactPosition,
    contactPhone,
    contactService,
    entityType,
    hasContactMethod,
    interactionType,
    isClientRelation,
    isProspectRelation,
    isSupplierRelation,
    isInternalRelation,
    isSolicitationRelation,
    selectedEntity,
    selectedContact
  ]);

  const currentStepIndex = useMemo(
    () => stepperSteps.findIndex((step) => step.status === 'current'),
    [stepperSteps]
  );

  return { stepperSteps, currentStepIndex };
};
