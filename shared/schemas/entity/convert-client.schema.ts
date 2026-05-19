import { z } from 'zod/v4';

import { accountTypeSchema, clientNumberSchema } from './client.schema.ts';

export const convertClientSchema = z.strictObject({
  client_number: clientNumberSchema,
  account_type: accountTypeSchema
});

export type ConvertClientValues = z.infer<typeof convertClientSchema>;
