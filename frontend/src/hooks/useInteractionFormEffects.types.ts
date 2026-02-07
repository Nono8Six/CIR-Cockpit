import type { UseFormClearErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form';

import type { AgencyConfig } from '@/services/config';
import type { InteractionFormValues } from '@/schemas/interactionSchema';
import type { Entity, EntityContact } from '@/types';

export type InteractionFormEffectsParams = {
  register: UseFormRegister<InteractionFormValues>;
  setValue: UseFormSetValue<InteractionFormValues>;
  clearErrors: UseFormClearErrors<InteractionFormValues>;
  config: AgencyConfig;
  relationOptions: string[];
  defaultStatusId: string;
  entityType: string;
  statusId: string;
  contactService: string;
  interactionType: string;
  normalizedRelation: string;
  selectedEntity: Entity | null;
  setSelectedEntity: (entity: Entity | null) => void;
  setSelectedContact: (contact: EntityContact | null) => void;
  entityId: string;
  contactFirstName: string;
  contactLastName: string;
  contactName: string;
  isInternalRelation: boolean;
  isSolicitationRelation: boolean;
  onCloseContactDialog: () => void;
};
