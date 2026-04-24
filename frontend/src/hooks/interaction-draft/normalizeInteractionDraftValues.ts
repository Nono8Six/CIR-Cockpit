import type { InteractionFormValues } from 'shared/schemas/interaction.schema';

import type { AgencyConfig } from '@/services/config';
import { INTERNAL_COMPANY_NAME, isInternalRelationValue } from '@/constants/relations';

export interface InteractionDraftNormalizationContext {
  defaultValues: InteractionFormValues;
  relationOptions: string[];
  config: AgencyConfig;
  defaultStatusId: string;
}

export const buildInteractionDraftResetValues = ({
  defaultValues,
  config,
  defaultStatusId,
}: InteractionDraftNormalizationContext): InteractionFormValues => ({
  ...defaultValues,
  entity_type: '',
  contact_service: config.services[0] ?? '',
  interaction_type: config.interactionTypes[0] ?? '',
  status_id: defaultStatusId,
});

export const normalizeInteractionDraftValues = (
  values: Partial<InteractionFormValues>,
  context: InteractionDraftNormalizationContext,
): InteractionFormValues => {
  const defaults = buildInteractionDraftResetValues(context);
  const { config, relationOptions } = context;

  const normalized: InteractionFormValues = {
    ...defaults,
    ...values,
    company_name: values.company_name ?? '',
    company_city: values.company_city ?? '',
    contact_first_name: values.contact_first_name ?? '',
    contact_last_name: values.contact_last_name ?? '',
    contact_position: values.contact_position ?? '',
    contact_name: values.contact_name ?? '',
    contact_phone: values.contact_phone ?? '',
    contact_email: values.contact_email ?? '',
    interaction_type: values.interaction_type ?? defaults.interaction_type ?? '',
    subject: values.subject ?? '',
    order_ref: values.order_ref ?? '',
    reminder_at: values.reminder_at ?? '',
    notes: values.notes ?? '',
    mega_families: values.mega_families ?? defaults.mega_families ?? [],
    entity_id: values.entity_id ?? '',
    contact_id: values.contact_id ?? '',
  };

  if (!normalized.entity_id) {
    normalized.contact_id = '';
  }

  if (isInternalRelationValue(normalized.entity_type)) {
    normalized.company_name = INTERNAL_COMPANY_NAME;
    normalized.company_city = '';
    normalized.entity_id = '';
    normalized.contact_id = '';
  }

  if (
    !config.statuses.find(
      (item) => item.id === normalized.status_id || item.label === normalized.status_id,
    )
  ) {
    normalized.status_id = defaults.status_id;
  }

  if (
    normalized.entity_type.trim() &&
    relationOptions.length > 0 &&
    !relationOptions.includes(normalized.entity_type)
  ) {
    normalized.entity_type = defaults.entity_type;
  }

  if (config.services.length > 0 && !config.services.includes(normalized.contact_service)) {
    normalized.contact_service = defaults.contact_service;
  }

  if (config.families.length > 0) {
    normalized.mega_families = (normalized.mega_families ?? []).filter((family) =>
      config.families.includes(family),
    );
  }

  if (
    config.interactionTypes.length > 0 &&
    !config.interactionTypes.includes(normalized.interaction_type)
  ) {
    normalized.interaction_type = defaults.interaction_type;
  }

  return normalized;
};
