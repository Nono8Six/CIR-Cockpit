import type { ValidationTargets } from '@hono/hono';
import { validator } from '@hono/hono/validator';
import type { ZodType } from 'zod/v4';

import { httpError } from './errorHandler.ts';

type ValidationTarget = keyof ValidationTargets;

const formatIssuePath = (path: PropertyKey[]): string =>
  path.length === 0 ? 'payload' : path.map(String).join('.');

const formatZodDetailsFr = (
  issues: Array<{ code: string; path: PropertyKey[]; message: string; keys?: string[] }>
): string =>
  issues
    .map((issue) => {
      const location = formatIssuePath(issue.path);
      if (issue.code === 'unrecognized_keys' && Array.isArray(issue.keys) && issue.keys.length > 0) {
        return `${location}: champs non autorises (${issue.keys.join(', ')}).`;
      }
      return `${location}: ${issue.message}`;
    })
    .join(' | ');

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
      throw httpError(400, 'INVALID_PAYLOAD', 'Payload invalide.', formatZodDetailsFr(parsed.error.issues));
    }
    return parsed.data;
  });
