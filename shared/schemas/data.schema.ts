import { z } from 'zod/v4';

import { uuidSchema } from './auth.schema.ts';
import { clientFormSchema } from './client.schema.ts';
import { clientContactFormSchema } from './client-contact.schema.ts';
import { convertClientSchema } from './convert-client.schema.ts';
import { interactionBaseSchema } from './interaction.schema.ts';
import { prospectFormSchema } from './prospect.schema.ts';

// --- Entities ---

const saveClientEntitySchema = z.object({
  action: z.literal('save'),
  agency_id: uuidSchema,
  entity_type: z.literal('Client'),
  id: uuidSchema.optional(),
  entity: clientFormSchema
});

const saveProspectEntitySchema = z.object({
  action: z.literal('save'),
  agency_id: uuidSchema,
  entity_type: z.literal('Prospect'),
  id: uuidSchema.optional(),
  entity: prospectFormSchema
});

const archiveEntitySchema = z.object({
  action: z.literal('archive'),
  entity_id: uuidSchema,
  archived: z.boolean()
});

const convertEntitySchema = z.object({
  action: z.literal('convert_to_client'),
  entity_id: uuidSchema,
  convert: convertClientSchema
});

// Keep z.union here because two branches intentionally share action="save"
// (Client vs Prospect), which is incompatible with discriminatedUnion.
export const dataEntitiesPayloadSchema = z.union([
  saveClientEntitySchema,
  saveProspectEntitySchema,
  archiveEntitySchema,
  convertEntitySchema
]);

export type DataEntitiesPayload = z.infer<typeof dataEntitiesPayloadSchema>;

// --- Entity Contacts ---

const saveContactSchema = z.object({
  action: z.literal('save'),
  entity_id: uuidSchema,
  id: uuidSchema.optional(),
  contact: clientContactFormSchema
});

const deleteContactSchema = z.object({
  action: z.literal('delete'),
  contact_id: uuidSchema
});

export const dataEntityContactsPayloadSchema = z.discriminatedUnion('action', [
  saveContactSchema,
  deleteContactSchema
]);

export type DataEntityContactsPayload = z.infer<typeof dataEntityContactsPayloadSchema>;

// --- Interactions ---

const timelineEventSchema = z.object({
  type: z.string().min(1, 'Type requis'),
  content: z.string().optional(),
  author: z.string().optional(),
  date: z.string().optional()
});

const saveInteractionSchema = z.object({
  action: z.literal('save'),
  agency_id: uuidSchema.optional(),
  interaction: interactionBaseSchema.extend({
    id: uuidSchema,
    timeline: z.array(timelineEventSchema).optional()
  })
});

const addTimelineEventSchema = z.object({
  action: z.literal('add_timeline_event'),
  interaction_id: uuidSchema,
  expected_updated_at: z.string().min(1, 'Version requise'),
  event: timelineEventSchema,
  updates: z.record(z.string(), z.unknown()).optional()
});

export const dataInteractionsPayloadSchema = z.discriminatedUnion('action', [
  saveInteractionSchema,
  addTimelineEventSchema
]);

export type DataInteractionsPayload = z.infer<typeof dataInteractionsPayloadSchema>;

// --- Config ---

const statusItemSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, 'Label requis'),
  category: z.string().min(1, 'Categorie requise')
});

export const dataConfigPayloadSchema = z.object({
  agency_id: uuidSchema,
  statuses: z.array(statusItemSchema).min(1, 'Au moins un statut requis'),
  services: z.array(z.string()),
  entities: z.array(z.string()),
  families: z.array(z.string()),
  interactionTypes: z.array(z.string())
});

export type DataConfigPayload = z.infer<typeof dataConfigPayloadSchema>;

// --- Profile ---

const passwordChangedSchema = z.object({
  action: z.literal('password_changed')
});

export const dataProfilePayloadSchema = z.discriminatedUnion('action', [
  passwordChangedSchema
]);

export type DataProfilePayload = z.infer<typeof dataProfilePayloadSchema>;
