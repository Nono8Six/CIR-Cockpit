import type { Interaction } from '@/types';

import type { AgencyConfig } from '@/services/config';
import { resolveReferenceLabel } from '@/utils/references/resolveReferenceLabel';

export const filterInteractionsBySearch = (
  interactions: Interaction[],
  normalizedSearchTerm: string,
  compactSearchTerm: string,
  resolutions: NonNullable<AgencyConfig['resolutions']> = []
): Interaction[] => {
  if (!normalizedSearchTerm) {
    return interactions;
  }

  return interactions.filter((interaction) =>
    interaction.company_name.toLowerCase().includes(normalizedSearchTerm)
    || interaction.contact_name.toLowerCase().includes(normalizedSearchTerm)
    || interaction.subject.toLowerCase().includes(normalizedSearchTerm)
    || Boolean(interaction.order_ref && interaction.order_ref.includes(compactSearchTerm))
    || Boolean(interaction.contact_phone && interaction.contact_phone.includes(compactSearchTerm))
    || Boolean(
      interaction.contact_email
      && interaction.contact_email.toLowerCase().includes(normalizedSearchTerm)
    )
    || interaction.mega_families.some((family) =>
      family.toLowerCase().includes(normalizedSearchTerm)
      || resolveReferenceLabel('families', family, resolutions).toLowerCase().includes(normalizedSearchTerm)
    )
    || resolveReferenceLabel('services', interaction.contact_service, resolutions).toLowerCase().includes(normalizedSearchTerm)
    || resolveReferenceLabel('interaction_types', interaction.interaction_type, resolutions).toLowerCase().includes(normalizedSearchTerm)
    || resolveReferenceLabel('statuses', interaction.status, resolutions).toLowerCase().includes(normalizedSearchTerm)
  );
};
