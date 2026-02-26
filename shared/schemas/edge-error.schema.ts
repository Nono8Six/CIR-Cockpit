import { z } from 'zod/v4';

export const edgeErrorPayloadSchema = z.object({
  request_id: z.string().min(1),
  ok: z.literal(false),
  error: z.string().min(1),
  code: z.string().min(1),
  details: z.string().min(1).optional()
}).strict();

export type EdgeErrorPayload = z.infer<typeof edgeErrorPayloadSchema>;
