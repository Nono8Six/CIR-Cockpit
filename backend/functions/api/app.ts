import { Hono } from 'https://deno.land/x/hono@4.6.10/mod.ts';

import type { AppEnv } from './types.ts';
import { handleError } from './middleware/errorHandler.ts';
import { requestId } from './middleware/requestId.ts';
import { registerAdminAgenciesRoutes } from './routes/adminAgencies.ts';
import { registerAdminUsersRoutes } from './routes/adminUsers.ts';

const allowedOrigin = Deno.env.get('CORS_ALLOWED_ORIGIN') ?? '*';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'x-request-id'
};

const app = new Hono<AppEnv>();

app.use('*', requestId);
app.use('*', async (c, next) => {
  if (c.req.method === 'OPTIONS') {
    return c.text('ok', 200, corsHeaders);
  }
  await next();
  for (const [key, value] of Object.entries(corsHeaders)) {
    c.header(key, value);
  }
});

app.onError((err, c) => handleError(err, c));

registerAdminUsersRoutes(app);
registerAdminAgenciesRoutes(app);

export type AppType = typeof app;
export default app;
