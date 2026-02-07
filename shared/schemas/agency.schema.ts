import { z } from 'zod/v4';

import { agencyNameSchema, uuidSchema } from './auth.schema.ts';

const createAgencySchema = z.object({
  action: z.literal('create'),
  name: agencyNameSchema
});

const renameAgencySchema = z.object({
  action: z.literal('rename'),
  agency_id: uuidSchema,
  name: agencyNameSchema
});

const archiveAgencySchema = z.object({
  action: z.literal('archive'),
  agency_id: uuidSchema
});

const unarchiveAgencySchema = z.object({
  action: z.literal('unarchive'),
  agency_id: uuidSchema
});

const hardDeleteAgencySchema = z.object({
  action: z.literal('hard_delete'),
  agency_id: uuidSchema
});

export const adminAgenciesPayloadSchema = z.discriminatedUnion('action', [
  createAgencySchema,
  renameAgencySchema,
  archiveAgencySchema,
  unarchiveAgencySchema,
  hardDeleteAgencySchema
]);

export type AdminAgenciesPayload = z.infer<typeof adminAgenciesPayloadSchema>;
