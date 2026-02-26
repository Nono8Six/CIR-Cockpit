import { z } from 'zod/v4';

import { agencyNameSchema, uuidSchema } from './auth.schema.ts';

export const agencyFormSchema = z.object({
  name: agencyNameSchema
}).strict();

const createAgencySchema = z.object({
  action: z.literal('create'),
  name: agencyNameSchema
}).strict();

const renameAgencySchema = z.object({
  action: z.literal('rename'),
  agency_id: uuidSchema,
  name: agencyNameSchema
}).strict();

const archiveAgencySchema = z.object({
  action: z.literal('archive'),
  agency_id: uuidSchema
}).strict();

const unarchiveAgencySchema = z.object({
  action: z.literal('unarchive'),
  agency_id: uuidSchema
}).strict();

const hardDeleteAgencySchema = z.object({
  action: z.literal('hard_delete'),
  agency_id: uuidSchema
}).strict();

export const adminAgenciesPayloadSchema = z.discriminatedUnion('action', [
  createAgencySchema,
  renameAgencySchema,
  archiveAgencySchema,
  unarchiveAgencySchema,
  hardDeleteAgencySchema
]);

export type AgencyFormValues = z.infer<typeof agencyFormSchema>;
export type AdminAgenciesPayload = z.infer<typeof adminAgenciesPayloadSchema>;
