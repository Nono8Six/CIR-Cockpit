import { z } from 'zod/v4';

import { agencyNameSchema, uuidSchema } from './auth.schema.ts';

export const agencyFormSchema = z.strictObject({
  name: agencyNameSchema
});

const createAgencySchema = z.strictObject({
  action: z.literal('create'),
  name: agencyNameSchema
});

const renameAgencySchema = z.strictObject({
  action: z.literal('rename'),
  agency_id: uuidSchema,
  name: agencyNameSchema
});

const archiveAgencySchema = z.strictObject({
  action: z.literal('archive'),
  agency_id: uuidSchema
});

const unarchiveAgencySchema = z.strictObject({
  action: z.literal('unarchive'),
  agency_id: uuidSchema
});

const hardDeleteAgencySchema = z.strictObject({
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

export type AgencyFormValues = z.infer<typeof agencyFormSchema>;
export type AdminAgenciesPayload = z.infer<typeof adminAgenciesPayloadSchema>;
