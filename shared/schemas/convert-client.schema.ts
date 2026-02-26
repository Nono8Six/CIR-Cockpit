import { z } from 'zod/v4';

import { accountTypeSchema, clientNumberSchema } from './client.schema.ts';

export const convertClientSchema = z.object({
  client_number: clientNumberSchema,
  account_type: accountTypeSchema
}).strict();

export type ConvertClientValues = z.infer<typeof convertClientSchema>;
