import { z } from 'zod/v4';

export const recoveryActionSchema = z.enum([
  'retry',
  'reload',
  'relogin',
  'contact_support',
  'none'
]);

const PUBLIC_DETAILS_CODES = new Set(['INVALID_JSON', 'INVALID_PAYLOAD']);

export const publicErrorDetails = (
  code: string,
  details: string | undefined
): string | undefined =>
  details && PUBLIC_DETAILS_CODES.has(code) ? details : undefined;

export const publicTrpcErrorDataSchema = z.strictObject({
  appCode: z.string().trim().min(1),
  httpStatus: z.number().int().min(400).max(599),
  requestId: z.string().trim().min(1),
  retryable: z.boolean(),
  recoveryAction: recoveryActionSchema,
  retryAfterMs: z.number().int().nonnegative().max(300_000).optional(),
  details: z.string().trim().min(1).optional()
});

export const edgeErrorPayloadSchema = z.strictObject({
  request_id: z.string().min(1),
  ok: z.literal(false),
  error: z.string().min(1),
  code: z.string().min(1),
  retryable: z.boolean(),
  recovery_action: recoveryActionSchema,
  retry_after_ms: z.number().int().nonnegative().max(300_000).optional(),
  details: z.string().min(1).optional()
});

export type EdgeErrorPayload = z.infer<typeof edgeErrorPayloadSchema>;
export type PublicTrpcErrorData = z.infer<typeof publicTrpcErrorDataSchema>;
