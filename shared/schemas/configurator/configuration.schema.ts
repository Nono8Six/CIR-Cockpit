import { z } from 'zod/v4';

import { uuidSchema } from '../admin/auth.schema.ts';
import { configuratorDomainSchema } from './common.schema.ts';
import {
  motorCandidateVerdictSchema,
  motorEquivalentSpecSchema
} from './motor.schema.ts';

const MAX_CONFIGURATION_LABEL_LENGTH = 200;
const MAX_CONFIGURATION_RESULTS = 50;

export const configurationScopeSchema = z.enum(['personal', 'agency']);

export const savedConfigurationPayloadSchema = z.discriminatedUnion('domain', [
  z.strictObject({
    domain: z.literal('motor'),
    payload_schema_version: z.literal(1),
    payload: z.strictObject({
      spec: motorEquivalentSpecSchema,
      selection: motorCandidateVerdictSchema,
      computed_at: z.string().datetime({ message: 'Date de calcul invalide' })
    })
  })
]);

const saveConfigurationInputBaseSchema = z.strictObject({
  id: uuidSchema.optional(),
  schema_version: z.literal(1),
  scope: configurationScopeSchema,
  label: z.string()
    .trim()
    .min(1, 'Nom de configuration requis')
    .max(MAX_CONFIGURATION_LABEL_LENGTH, 'Nom de configuration trop long'),
  client_entity_id: uuidSchema.nullable().optional(),
  snapshot_id: uuidSchema,
  configuration: savedConfigurationPayloadSchema
});

const addMatchingSnapshotIssues = (
  input: {
    snapshot_id: string;
    configuration: z.infer<typeof savedConfigurationPayloadSchema>;
  },
  ctx: z.RefinementCtx
) => {
  const payloadSnapshotId = input.configuration.payload.spec.snapshot_id;
  if (payloadSnapshotId == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Le snapshot de la specification sauvegardee est requis',
      path: ['configuration', 'payload', 'spec', 'snapshot_id']
    });
  } else if (payloadSnapshotId !== input.snapshot_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Le snapshot de la configuration doit correspondre au snapshot de l enveloppe',
      path: ['configuration', 'payload', 'spec', 'snapshot_id']
    });
  }
};

export const saveConfigurationInputSchema =
  saveConfigurationInputBaseSchema.superRefine(addMatchingSnapshotIssues);

export const listConfigurationsInputSchema = z.strictObject({
  domain: configuratorDomainSchema.optional(),
  scope: z.enum(['all', 'personal', 'agency']).default('all'),
  include_archived: z.boolean().default(false),
  cursor: z.string().trim().min(1, 'Curseur invalide').max(500, 'Curseur trop long').optional(),
  limit: z.number()
    .int('Limite invalide')
    .min(1, 'Limite invalide')
    .max(MAX_CONFIGURATION_RESULTS, 'Limite trop grande')
    .default(25)
});

const savedConfigurationBaseSchema = z.strictObject({
  id: uuidSchema,
  schema_version: z.literal(1),
  agency_id: uuidSchema,
  owner_id: uuidSchema,
  scope: configurationScopeSchema,
  label: z.string().trim().min(1).max(MAX_CONFIGURATION_LABEL_LENGTH),
  client_entity_id: uuidSchema.nullable(),
  snapshot_id: uuidSchema,
  configuration: savedConfigurationPayloadSchema,
  created_at: z.string().datetime({ message: 'Date de creation invalide' }),
  updated_at: z.string().datetime({ message: 'Date de modification invalide' }),
  archived_at: z.string().datetime({ message: 'Date d archivage invalide' }).nullable()
});

export const savedConfigurationSchema =
  savedConfigurationBaseSchema.superRefine(addMatchingSnapshotIssues);

export const listConfigurationsResponseSchema = z.strictObject({
  configurations: z.array(savedConfigurationSchema).max(MAX_CONFIGURATION_RESULTS),
  next_cursor: z.string().trim().min(1).max(500).nullable()
});

export const archiveConfigurationInputSchema = z.strictObject({
  id: uuidSchema,
  archived: z.boolean()
});

export type ConfigurationScope = z.infer<typeof configurationScopeSchema>;
export type SaveConfigurationInput = z.infer<typeof saveConfigurationInputSchema>;
export type SavedConfiguration = z.infer<typeof savedConfigurationSchema>;
