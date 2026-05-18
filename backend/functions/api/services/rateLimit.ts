import { sql } from 'drizzle-orm';

import { getDbClient } from '../../../drizzle/index.ts';
import { httpError } from '../middleware/errorHandler.ts';

export type RateLimitOptions = {
  max?: number;
  windowSeconds?: number;
};

const parsePositiveInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const RATE_LIMIT_MAX_RAW = parsePositiveInteger(Deno.env.get('RATE_LIMIT_MAX'), 10);
const RATE_LIMIT_WINDOW_SECONDS_RAW = parsePositiveInteger(Deno.env.get('RATE_LIMIT_WINDOW_SECONDS'), 300);

export const RATE_LIMIT_MAX = Number.isFinite(RATE_LIMIT_MAX_RAW) && RATE_LIMIT_MAX_RAW > 0
  ? RATE_LIMIT_MAX_RAW
  : 10;
export const RATE_LIMIT_WINDOW_SECONDS = Number.isFinite(RATE_LIMIT_WINDOW_SECONDS_RAW)
    && RATE_LIMIT_WINDOW_SECONDS_RAW > 0
  ? RATE_LIMIT_WINDOW_SECONDS_RAW
  : 300;

export const DRAFT_RATE_LIMIT_MAX = parsePositiveInteger(Deno.env.get('DRAFT_RATE_LIMIT_MAX'), 120);
export const DRAFT_RATE_LIMIT_WINDOW_SECONDS = parsePositiveInteger(Deno.env.get('DRAFT_RATE_LIMIT_WINDOW_SECONDS'), 60);

export const checkRateLimit = async (
  prefix: string,
  callerId: string,
  options: RateLimitOptions = {}
): Promise<boolean> => {
  const max = options.max ?? RATE_LIMIT_MAX;
  const windowSeconds = options.windowSeconds ?? RATE_LIMIT_WINDOW_SECONDS;
  const rateLimitKey = `${prefix}:${callerId}:${windowSeconds}`;
  const db = getDbClient();
  if (!db) {
    throw httpError(
      500,
      'RATE_LIMIT_CHECK_FAILED',
      'Impossible de verifier la limitation de requetes.'
    );
  }
  try {
    const rows = await db.execute<{ allowed: boolean }>(sql`
      select private.check_rate_limit(
        ${rateLimitKey},
        ${max},
        ${windowSeconds}
      ) as allowed
    `);
    return rows[0]?.allowed === true;
  } catch {
    throw httpError(
      500,
      'RATE_LIMIT_CHECK_FAILED',
      'Impossible de verifier la limitation de requetes.'
    );
  }
};
