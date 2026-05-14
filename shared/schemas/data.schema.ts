import { z } from 'zod/v4';

import type { Json } from '../supabase.types.ts';
import { uuidSchema } from './auth.schema.ts';
import { clientFormSchema } from './client.schema.ts';
import { clientContactFormSchema } from './client-contact.schema.ts';
import { convertClientSchema } from './convert-client.schema.ts';
import { addSharedInteractionRules, interactionBaseSchema } from './interaction.schema.ts';
import { prospectFormSchema } from './prospect.schema.ts';
import { supplierFormSchema } from './supplier.schema.ts';

const MAX_TIMELINE_CONTENT_LENGTH = 5000;
const MAX_TIMELINE_AUTHOR_LENGTH = 120;
const MAX_CONFIG_LABEL_LENGTH = 120;
const MAX_DRAFT_FORM_TYPE_LENGTH = 64;

const jsonValueSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema)
  ])
);

// --- Entities ---

const saveClientEntitySchema = z.strictObject({
  action: z.literal('save'),
  agency_id: uuidSchema,
  entity_type: z.literal('Client'),
  id: uuidSchema.optional(),
  entity: clientFormSchema
});

const saveProspectEntitySchema = z.strictObject({
  action: z.literal('save'),
  agency_id: uuidSchema,
  entity_type: z.literal('Prospect'),
  id: uuidSchema.optional(),
  entity: prospectFormSchema
});

const saveSupplierEntitySchema = z.strictObject({
  action: z.literal('save'),
  agency_id: uuidSchema,
  entity_type: z.literal('Fournisseur'),
  id: uuidSchema.optional(),
  entity: supplierFormSchema
});

const archiveEntitySchema = z.strictObject({
  action: z.literal('archive'),
  entity_id: uuidSchema,
  archived: z.boolean()
});

const listEntitiesSchema = z.strictObject({
  action: z.literal('list'),
  entity_type: z.enum(['Client', 'Prospect']),
  agency_id: z.union([uuidSchema, z.null()]).optional(),
  include_archived: z.boolean().optional(),
  orphans_only: z.boolean().optional()
});

const searchIndexEntitiesSchema = z.strictObject({
  /** @deprecated Legacy Saisie index. New V1 flows must use data.searchEntitiesUnified. */
  action: z.literal('search_index'),
  agency_id: z.union([uuidSchema, z.null()]),
  include_archived: z.boolean().optional()
});

const deleteEntitySchema = z.strictObject({
  action: z.literal('delete'),
  entity_id: uuidSchema,
  delete_related_interactions: z.boolean().optional()
});

const convertEntitySchema = z.strictObject({
  action: z.literal('convert_to_client'),
  entity_id: uuidSchema,
  convert: convertClientSchema
});

const reassignEntitySchema = z.strictObject({
  action: z.literal('reassign'),
  entity_id: uuidSchema,
  target_agency_id: uuidSchema
});

// Keep z.union here because save branches intentionally share action="save",
// which is incompatible with discriminatedUnion.
export const dataEntitiesPayloadSchema = z.union([
  saveClientEntitySchema,
  saveProspectEntitySchema,
  saveSupplierEntitySchema,
  listEntitiesSchema,
  searchIndexEntitiesSchema,
  archiveEntitySchema,
  deleteEntitySchema,
  convertEntitySchema,
  reassignEntitySchema
]);

export type DataEntitiesPayload = z.infer<typeof dataEntitiesPayloadSchema>;

// --- Entity Contacts ---

const saveContactSchema = z.strictObject({
  action: z.literal('save'),
  entity_id: uuidSchema,
  id: uuidSchema.optional(),
  contact: clientContactFormSchema
});

const deleteContactSchema = z.strictObject({
  action: z.literal('delete'),
  contact_id: uuidSchema
});

const listEntityContactsSchema = z.strictObject({
  action: z.literal('list_by_entity'),
  entity_id: uuidSchema,
  include_archived: z.boolean().optional()
});

export const dataEntityContactsPayloadSchema = z.discriminatedUnion('action', [
  listEntityContactsSchema,
  saveContactSchema,
  deleteContactSchema
]);

export type DataEntityContactsPayload = z.infer<typeof dataEntityContactsPayloadSchema>;

// --- Interactions ---

const timelineEventSchema = z.strictObject({
  id: z.string().trim().min(1, 'Identifiant evenement requis'),
  date: z.string().trim().min(1, 'Date evenement requise'),
  type: z.enum(['note', 'status_change', 'reminder_change', 'creation', 'file', 'order_ref_change']),
  content: z.string().trim().min(1, 'Contenu evenement requis').max(MAX_TIMELINE_CONTENT_LENGTH, 'Contenu trop long'),
  author: z.string().trim().max(MAX_TIMELINE_AUTHOR_LENGTH, 'Auteur trop long').optional(),
  meta: z.record(z.string(), jsonValueSchema).optional()
});

const saveInteractionSchema = z.strictObject({
  action: z.literal('save'),
  agency_id: uuidSchema,
  interaction: interactionBaseSchema.extend({
    id: uuidSchema,
    timeline: z.array(timelineEventSchema).optional()
  }).superRefine((values, ctx) => {
    addSharedInteractionRules(values, ctx);
  })
});

const timelineUpdatesSchema = z.strictObject({
  status: z.string().trim().optional(),
  status_id: z.union([uuidSchema, z.null()]).optional(),
  order_ref: z.union([z.string().trim(), z.null()]).optional(),
  reminder_at: z.union([z.string().trim(), z.null()]).optional(),
  notes: z.union([z.string(), z.null()]).optional(),
  entity_id: z.union([uuidSchema, z.null()]).optional(),
  contact_id: z.union([uuidSchema, z.null()]).optional(),
  last_action_at: z.string().trim().optional(),
  status_is_terminal: z.boolean().optional(),
  mega_families: z.array(z.string()).optional()
});

const addTimelineEventSchema = z.strictObject({
  action: z.literal('add_timeline_event'),
  interaction_id: uuidSchema,
  expected_updated_at: z.string().min(1, 'Version requise'),
  event: timelineEventSchema,
  updates: timelineUpdatesSchema.optional()
});

const listByEntitySchema = z.strictObject({
  action: z.literal('list_by_entity'),
  entity_id: uuidSchema,
  page: z.number().int().min(1, 'Page invalide').optional(),
  page_size: z.number().int().min(1, 'Taille de page invalide').max(50, 'Taille de page trop grande').optional()
});

const listByAgencySchema = z.strictObject({
  action: z.literal('list_by_agency'),
  agency_id: uuidSchema,
  limit: z.number().int().min(1, 'Limite invalide').max(500, 'Limite trop grande').optional()
});

const knownCompaniesSchema = z.strictObject({
  action: z.literal('known_companies'),
  agency_id: uuidSchema,
  limit: z.number().int().min(1, 'Limite invalide').max(5000, 'Limite trop grande').optional()
});

const draftFormTypeSchema = z.string()
  .trim()
  .min(1, 'Type de formulaire requis')
  .max(MAX_DRAFT_FORM_TYPE_LENGTH, 'Type de formulaire trop long');

const draftGetSchema = z.strictObject({
  action: z.literal('draft_get'),
  user_id: uuidSchema,
  agency_id: uuidSchema,
  form_type: draftFormTypeSchema.optional()
});

const draftSaveSchema = z.strictObject({
  action: z.literal('draft_save'),
  user_id: uuidSchema,
  agency_id: uuidSchema,
  form_type: draftFormTypeSchema.optional(),
  payload: jsonValueSchema
});

const draftDeleteSchema = z.strictObject({
  action: z.literal('draft_delete'),
  user_id: uuidSchema,
  agency_id: uuidSchema,
  form_type: draftFormTypeSchema.optional()
});

const deleteInteractionSchema = z.strictObject({
  action: z.literal('delete'),
  interaction_id: uuidSchema
});

export const dataInteractionsPayloadSchema = z.discriminatedUnion('action', [
  saveInteractionSchema,
  addTimelineEventSchema,
  listByEntitySchema,
  listByAgencySchema,
  knownCompaniesSchema,
  draftGetSchema,
  draftSaveSchema,
  draftDeleteSchema,
  deleteInteractionSchema
]);

export type DataInteractionsPayload = z.infer<typeof dataInteractionsPayloadSchema>;

// --- Config ---

const statusItemSchema = z.strictObject({
  id: z.string().optional(),
  label: z.string().trim().min(1, 'Label requis').max(MAX_CONFIG_LABEL_LENGTH, 'Label trop long'),
  category: z.string().trim().min(1, 'Categorie requise').max(32, 'Categorie trop longue')
});

export const dataConfigPayloadSchema = z.strictObject({
  agency_id: uuidSchema,
  statuses: z.array(statusItemSchema).min(1, 'Au moins un statut requis'),
  services: z.array(z.string().trim().max(MAX_CONFIG_LABEL_LENGTH, 'Label service trop long')),
  entities: z.array(z.string().trim().max(MAX_CONFIG_LABEL_LENGTH, 'Label entite trop long')),
  families: z.array(z.string().trim().max(MAX_CONFIG_LABEL_LENGTH, 'Label famille trop long')),
  interactionTypes: z.array(z.string().trim().max(MAX_CONFIG_LABEL_LENGTH, "Label type d'interaction trop long"))
});

export type DataConfigPayload = z.infer<typeof dataConfigPayloadSchema>;

// --- Profile ---

const passwordChangedSchema = z.strictObject({
  action: z.literal('password_changed')
});

const setActiveAgencySchema = z.strictObject({
  action: z.literal('set_active_agency'),
  agency_id: z.union([uuidSchema, z.null()])
});

export const dataProfilePayloadSchema = z.discriminatedUnion('action', [
  passwordChangedSchema,
  setActiveAgencySchema
]);

export type DataProfilePayload = z.infer<typeof dataProfilePayloadSchema>;
