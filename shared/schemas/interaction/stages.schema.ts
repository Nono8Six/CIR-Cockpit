import { z } from 'zod/v4';

// Etapes de vente du pipeline. Null cote donnees = dossier a qualifier.
export const INTERACTION_STAGE_VALUES = [
  'qualification',
  'quote_sent',
  'negotiation',
  'won',
  'lost'
] as const;

export type InteractionStage = (typeof INTERACTION_STAGE_VALUES)[number];

export const interactionStageSchema = z.enum(INTERACTION_STAGE_VALUES, {
  message: 'Étape de vente invalide'
});
