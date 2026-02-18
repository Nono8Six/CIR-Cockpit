import type { ValidationTargets } from '@hono/hono';
import { validator } from '@hono/hono/validator';
import type { ZodType } from 'zod/v4';

import { httpError } from './errorHandler.ts';

type ValidationTarget = keyof ValidationTargets;

export const zValidator = <
  TTarget extends ValidationTarget,
  TOutput,
  TInput
>(
  target: TTarget,
  schema: ZodType<TOutput, TInput>
) =>
  validator(target, (value) => {
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      throw httpError(400, 'INVALID_PAYLOAD', 'Payload invalide.', parsed.error.message);
    }
    return parsed.data;
  });
