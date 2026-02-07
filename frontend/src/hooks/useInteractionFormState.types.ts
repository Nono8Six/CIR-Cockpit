import type { Control } from 'react-hook-form';

import type { AgencyConfig } from '@/services/config';
import type { InteractionFormValues } from '@/schemas/interactionSchema';
import type { Entity, EntityContact } from '@/types';

export type InteractionFormStateInput = {
  control: Control<InteractionFormValues>;
  config: AgencyConfig;
  activeAgencyId: string | null;
  entitySearchIndex: {
    entities: Entity[];
    contacts: EntityContact[];
  };
  selectedEntity: Entity | null;
  selectedContact: EntityContact | null;
};

export const getDefaultStatusId = (statuses: AgencyConfig['statuses']) =>
  statuses.find((status) => status.is_default)?.id ?? statuses[0]?.id ?? '';
