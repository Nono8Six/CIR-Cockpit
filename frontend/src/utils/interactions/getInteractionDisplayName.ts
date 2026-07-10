import type { Interaction } from '@/types';

export const INTERACTION_FALLBACK_DISPLAY_NAME = 'Dossier sans nom';

export const getInteractionDisplayName = (interaction: Interaction): string =>
  interaction.company_name?.trim()
  || interaction.contact_name?.trim()
  || interaction.contact_phone?.trim()
  || INTERACTION_FALLBACK_DISPLAY_NAME;
