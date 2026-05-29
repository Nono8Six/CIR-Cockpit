import { z } from 'zod/v4';
import type { ResolvedConfigSnapshot } from '../../../../shared/schemas/system/config.schema';
import { uuidSchema } from '../../../../shared/schemas/admin/auth.schema';

import { normalizeStatusesForUi } from './use-settings-state.helpers';

const MAX_CONFIG_LABEL_LENGTH = 120;

const statusCategorySchema = z.enum(['todo', 'in_progress', 'done']);

const settingsStatusSchema = z
  .object({
    id: z.string().optional(),
    agency_id: z.string().optional(),
    label: z
      .string()
      .trim()
      .min(1, 'Label requis')
      .max(MAX_CONFIG_LABEL_LENGTH, 'Label trop long'),
    category: statusCategorySchema,
    is_terminal: z.boolean(),
    is_default: z.boolean(),
    is_active: z.boolean(),
    sort_order: z.number().int(),
  })
  ;

export const settingsFormSchema = z
  .object({
    agency_id: uuidSchema,
    statuses: z.array(settingsStatusSchema).min(1, 'Au moins un statut requis'),
    services: z.array(z.string().trim().max(MAX_CONFIG_LABEL_LENGTH, 'Label service trop long')),
    families: z.array(z.string().trim().max(MAX_CONFIG_LABEL_LENGTH, 'Label famille trop long')),
    interactionTypes: z.array(
      z.string().trim().max(MAX_CONFIG_LABEL_LENGTH, "Label type d'interaction trop long"),
    ),
    newFamily: z.string(),
    newService: z.string(),
    newInteractionType: z.string(),
    newStatus: z.string(),
    newStatusCategory: statusCategorySchema,
  })
  ;

export type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export const buildSettingsFormDefaultValues = (
  snapshot: ResolvedConfigSnapshot,
  agencyId: string | null,
): SettingsFormValues => ({
  agency_id: agencyId ?? '',
  statuses: normalizeStatusesForUi(snapshot.references.statuses),
  services: snapshot.references.services,
  families: snapshot.references.families,
  interactionTypes: snapshot.references.interaction_types,
  newFamily: '',
  newService: '',
  newInteractionType: '',
  newStatus: '',
  newStatusCategory: 'todo',
});
