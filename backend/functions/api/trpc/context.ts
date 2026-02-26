import type { Context } from '@hono/hono';

type TrpcBaseContext = {
  req: Request;
  resHeaders: Headers;
  requestId: string;
};

export const createContext = (
  _options: unknown,
  c: Context
): TrpcBaseContext => {
  const requestIdValue = c.get('requestId');
  const requestId = typeof requestIdValue === 'string' && requestIdValue.trim()
    ? requestIdValue
    : crypto.randomUUID();

  return {
    req: c.req.raw,
    resHeaders: c.res.headers,
    requestId
  };
};

export type TrpcContext = Awaited<ReturnType<typeof createContext>>;
