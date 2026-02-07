import { getSupabaseAdmin } from '../middleware/auth.ts';
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
  const { data, error } = await getSupabaseAdmin().rpc('check_rate_limit', {
    p_key: rateLimitKey,
    p_limit: RATE_LIMIT_MAX,
    p_window_seconds: RATE_LIMIT_WINDOW_SECONDS
  });

  if (error) {
    throw httpError(500, 'RATE_LIMIT_CHECK_FAILED', 'Rate limit check failed');
  }

  return data === true;
};
