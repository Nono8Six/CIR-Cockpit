import { useCallback } from 'react';
import type { UseFormClearErrors, UseFormReset } from 'react-hook-form';

import {
  INTERNAL_COMPANY_NAME,
  isInternalRelationValue
} from '@/constants/relations';
import type { AgencyConfig } from '@/services/config';
import type { Entity, EntityContact } from '@/types';
import type { InteractionFormValues } from 'shared/schemas/interaction.schema';

type BuildRelationChangeValuesParams = {
  channel: InteractionFormValues['channel'];
  entityType: string;
  config: AgencyConfig;
  defaultStatusId: string;
};

type UseCockpitRelationChangeParams = BuildRelationChangeValuesParams & {
  reset: UseFormReset<InteractionFormValues>;
  clearErrors: UseFormClearErrors<InteractionFormValues>;
  setSelectedEntity: (entity: Entity | null) => void;
  setSelectedContact: (contact: EntityContact | null) => void;
};

const normalizeRelation = (value: string): string => value.trim().toLowerCase();

export const buildRelationChangeValues = ({
  channel,
  entityType,
  config,
  defaultStatusId
}: BuildRelationChangeValuesParams): InteractionFormValues => ({
  channel,
  entity_type: entityType.trim(),
  contact_service: config.services[0] ?? '',
  company_name: isInternalRelationValue(entityType) ? INTERNAL_COMPANY_NAME : '',
  company_city: '',
  contact_first_name: '',
  contact_last_name: '',
  contact_position: '',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  subject: '',
  mega_families: [],
  status_id: defaultStatusId,
  interaction_type: config.interactionTypes[0] ?? '',
  order_ref: '',
  reminder_at: '',
  notes: '',
  entity_id: '',
  contact_id: ''
});

export const useCockpitRelationChange = ({
  reset,
  clearErrors,
  channel,
  entityType,
  config,
  defaultStatusId,
  setSelectedEntity,
  setSelectedContact
}: UseCockpitRelationChangeParams) =>
  useCallback((nextEntityType: string) => {
    if (normalizeRelation(nextEntityType) === normalizeRelation(entityType)) return;

    setSelectedEntity(null);
    setSelectedContact(null);
    reset(
      buildRelationChangeValues({
        channel,
        entityType: nextEntityType,
        config,
        defaultStatusId
      }),
      { keepDefaultValues: true }
    );
    clearErrors();
  }, [
    channel,
    clearErrors,
    config,
    defaultStatusId,
    entityType,
    reset,
    setSelectedContact,
    setSelectedEntity
  ]);
