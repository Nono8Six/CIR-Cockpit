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

const saveClientEntitySchema = z.object({
  action: z.literal('save'),
  agency_id: uuidSchema,
  entity_type: z.literal('Client'),
  id: uuidSchema.optional(),
  entity: clientFormSchema
}).strict();

const saveProspectEntitySchema = z.object({
  action: z.literal('save'),
  agency_id: uuidSchema,
  entity_type: z.literal('Prospect'),
  id: uuidSchema.optional(),
  entity: prospectFormSchema
}).strict();

const saveSupplierEntitySchema = z.object({
  action: z.literal('save'),
  agency_id: uuidSchema,
  entity_type: z.literal('Fournisseur'),
  id: uuidSchema.optional(),
  entity: supplierFormSchema
}).strict();

const archiveEntitySchema = z.object({
  action: z.literal('archive'),
  entity_id: uuidSchema,
  archived: z.boolean()
}).strict();

const listEntitiesSchema = z.object({
  action: z.literal('list'),
  entity_type: z.enum(['Client', 'Prospect']),
  agency_id: z.union([uuidSchema, z.null()]).optional(),
  include_archived: z.boolean().optional(),
  orphans_only: z.boolean().optional()
}).strict();

const searchIndexEntitiesSchema = z.object({
  action: z.literal('search_index'),
  agency_id: z.union([uuidSchema, z.null()]),
  include_archived: z.boolean().optional()
}).strict();

const deleteEntitySchema = z.object({
  action: z.literal('delete'),
  entity_id: uuidSchema,
  delete_related_interactions: z.boolean().optional()
}).strict();

const convertEntitySchema = z.object({
  action: z.literal('convert_to_client'),
  entity_id: uuidSchema,
  convert: convertClientSchema
}).strict();

const reassignEntitySchema = z.object({
  action: z.literal('reassign'),
  entity_id: uuidSchema,
  target_agency_id: uuidSchema
}).strict();

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

const saveContactSchema = z.object({
  action: z.literal('save'),
  entity_id: uuidSchema,
  id: uuidSchema.optional(),
  contact: clientContactFormSchema
}).strict();

const deleteContactSchema = z.object({
  action: z.literal('delete'),
  contact_id: uuidSchema
}).strict();

const listEntityContactsSchema = z.object({
  action: z.literal('list_by_entity'),
  entity_id: uuidSchema,
  include_archived: z.boolean().optional()
}).strict();

export const dataEntityContactsPayloadSchema = z.discriminatedUnion('action', [
  listEntityContactsSchema,
  saveContactSchema,
  deleteContactSchema
]);

export type DataEntityContactsPayload = z.infer<typeof dataEntityContactsPayloadSchema>;

// --- Interactions ---

const timelineEventSchema = z.object({
  id: z.string().trim().min(1, 'Identifiant evenement requis'),
  date: z.string().trim().min(1, 'Date evenement requise'),
  type: z.enum(['note', 'status_change', 'reminder_change', 'creation', 'file', 'order_ref_change']),
  content: z.string().trim().min(1, 'Contenu evenement requis').max(MAX_TIMELINE_CONTENT_LENGTH, 'Contenu trop long'),
  author: z.string().trim().max(MAX_TIMELINE_AUTHOR_LENGTH, 'Auteur trop long').optional(),
  meta: z.record(z.string(), jsonValueSchema).optional()
}).strict();

const saveInteractionSchema = z.object({
  action: z.literal('save'),
  agency_id: uuidSchema,
  interaction: interactionBaseSchema.extend({
    id: uuidSchema,
    timeline: z.array(timelineEventSchema).optional()
  }).strict().superRefine((values, ctx) => {
    addSharedInteractionRules(values, ctx);
  })
}).strict();

const timelineUpdatesSchema = z.object({
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
}).strict();

const addTimelineEventSchema = z.object({
  action: z.literal('add_timeline_event'),
  interaction_id: uuidSchema,
  expected_updated_at: z.string().min(1, 'Version requise'),
  event: timelineEventSchema,
  updates: timelineUpdatesSchema.optional()
}).strict();

const listByEntitySchema = z.object({
  action: z.literal('list_by_entity'),
  entity_id: uuidSchema,
  page: z.number().int().min(1, 'Page invalide').optional(),
  page_size: z.number().int().min(1, 'Taille de page invalide').max(50, 'Taille de page trop grande').optional()
}).strict();

const deleteInteractionSchema = z.object({
  action: z.literal('delete'),
  interaction_id: uuidSchema
}).strict();

export const dataInteractionsPayloadSchema = z.discriminatedUnion('action', [
  saveInteractionSchema,
  addTimelineEventSchema,
  listByEntitySchema,
  deleteInteractionSchema
]);

export type DataInteractionsPayload = z.infer<typeof dataInteractionsPayloadSchema>;

// --- Config ---

const statusItemSchema = z.object({
  id: z.string().optional(),
  label: z.string().trim().min(1, 'Label requis').max(MAX_CONFIG_LABEL_LENGTH, 'Label trop long'),
  category: z.string().trim().min(1, 'Categorie requise').max(32, 'Categorie trop longue')
}).strict();

export const dataConfigPayloadSchema = z.object({
  agency_id: uuidSchema,
  statuses: z.array(statusItemSchema).min(1, 'Au moins un statut requis'),
  services: z.array(z.string().trim().max(MAX_CONFIG_LABEL_LENGTH, 'Label service trop long')),
  entities: z.array(z.string().trim().max(MAX_CONFIG_LABEL_LENGTH, 'Label entite trop long')),
  families: z.array(z.string().trim().max(MAX_CONFIG_LABEL_LENGTH, 'Label famille trop long')),
  interactionTypes: z.array(z.string().trim().max(MAX_CONFIG_LABEL_LENGTH, "Label type d'interaction trop long"))
}).strict();

export type DataConfigPayload = z.infer<typeof dataConfigPayloadSchema>;

// --- Profile ---

const passwordChangedSchema = z.object({
  action: z.literal('password_changed')
}).strict();

export const dataProfilePayloadSchema = z.discriminatedUnion('action', [
  passwordChangedSchema
]);

export type DataProfilePayload = z.infer<typeof dataProfilePayloadSchema>;
