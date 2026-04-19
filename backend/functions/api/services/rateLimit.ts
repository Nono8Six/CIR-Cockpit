import { sql } from 'drizzle-orm';

import { getDbClient } from '../../../drizzle/index.ts';
import { httpError } from '../middleware/errorHandler.ts';

const RATE_LIMIT_MAX_RAW = Number.parseInt(Deno.env.get('RATE_LIMIT_MAX') ?? '10', 10);
const RATE_LIMIT_WINDOW_SECONDS_RAW = Number.parseInt(
  Deno.env.get('RATE_LIMIT_WINDOW_SECONDS') ?? '300',
  10
);

export const RATE_LIMIT_MAX = Number.isFinite(RATE_LIMIT_MAX_RAW) && RATE_LIMIT_MAX_RAW > 0
  ? RATE_LIMIT_MAX_RAW
  : 10;
export const RATE_LIMIT_WINDOW_SECONDS = Number.isFinite(RATE_LIMIT_WINDOW_SECONDS_RAW)
    && RATE_LIMIT_WINDOW_SECONDS_RAW > 0
  ? RATE_LIMIT_WINDOW_SECONDS_RAW
  : 300;

export const checkRateLimit = async (prefix: string, callerId: string): Promise<boolean> => {
  const rateLimitKey = `${prefix}:${callerId}:${RATE_LIMIT_WINDOW_SECONDS}`;
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
        ${RATE_LIMIT_MAX},
        ${RATE_LIMIT_WINDOW_SECONDS}
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
