import { Hono, type MiddlewareHandler } from '@hono/hono';
import { trpcServer } from '@hono/trpc-server';

import type { AppEnv } from './types.ts';
import { handleError, httpError } from './middleware/errorHandler.ts';
import { corsAndBodySize } from './middleware/corsAndBodySize.ts';
import { requestId } from './middleware/requestId.ts';
import { createContext } from './trpc/context.ts';
import { appRouter } from './trpc/router.ts';

const app = new Hono<AppEnv>();
const trpcMiddleware = trpcServer({ router: appRouter, createContext }) as unknown as MiddlewareHandler<AppEnv>;

app.use('*', requestId);
app.use('*', corsAndBodySize);
app.use('/trpc/*', trpcMiddleware);

app.onError((err, c) => handleError(err, c));
app.notFound((c) => handleError(httpError(404, 'NOT_FOUND', 'Ressource introuvable.'), c));
export type AppType = unknown;
export default app;
