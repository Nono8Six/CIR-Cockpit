import { useMemo } from 'react';

import type { Channel } from '@/types';
import { getInteractionGateState } from '@/utils/interactions/getInteractionGateState';

type InteractionGateStateInput = {
  channel: Channel;
  entityType: string;
  contactService: string;
  interactionType: string;
  subject: string;
  statusId: string;
  companyName: string;
  companyCity: string;
  contactFirstName: string;
  contactLastName: string;
  contactPosition: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  isClientRelation: boolean;
  isInternalRelation: boolean;
  hasSelectedEntity: boolean;
  hasSelectedContact: boolean;
  requiresProductFamilies: boolean;
  megaFamilies: string[];
};

export const useInteractionGateState = ({
  channel,
  entityType,
  contactService,
  interactionType,
  subject,
  statusId,
  companyName,
  companyCity,
  contactFirstName,
  contactLastName,
  contactPosition,
  contactName,
  contactPhone,
  contactEmail,
  isClientRelation,
  isInternalRelation,
  hasSelectedEntity,
  hasSelectedContact,
  requiresProductFamilies,
  megaFamilies
}: InteractionGateStateInput) =>
  useMemo(
    () =>
      getInteractionGateState({
        channel,
        entityType,
        contactService,
        interactionType,
        subject,
        statusId,
        companyName,
        companyCity,
        contactFirstName,
        contactLastName,
        contactPosition,
        contactName,
        contactPhone,
        contactEmail,
        isClientRelation,
        isInternalRelation,
        hasSelectedEntity,
        hasSelectedContact,
        requiresProductFamilies,
        megaFamilies
      }),
    [
      channel,
      companyCity,
      companyName,
      contactEmail,
      contactFirstName,
      contactLastName,
      contactName,
      contactPhone,
      contactPosition,
      contactService,
      entityType,
      interactionType,
      isClientRelation,
      isInternalRelation,
      hasSelectedContact,
      hasSelectedEntity,
      megaFamilies,
      requiresProductFamilies,
      statusId,
      subject
    ]
  );
