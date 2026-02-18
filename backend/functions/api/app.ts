import { Hono } from '@hono/hono';

import type { AppEnv } from './types.ts';
import { handleError, httpError } from './middleware/errorHandler.ts';
import { corsAndBodySize } from './middleware/corsAndBodySize.ts';
import { requestId } from './middleware/requestId.ts';
import adminAgenciesRoutes from './routes/adminAgencies.ts';
import adminUsersRoutes from './routes/adminUsers.ts';
import dataConfigRoutes from './routes/dataConfig.ts';
import dataEntitiesRoutes from './routes/dataEntities.ts';
import dataEntityContactsRoutes from './routes/dataEntityContacts.ts';
import dataInteractionsRoutes from './routes/dataInteractions.ts';
import dataProfileRoutes from './routes/dataProfile.ts';

const app = new Hono<AppEnv>();

app.use('*', requestId);
app.use('*', corsAndBodySize);

app.onError((err, c) => handleError(err, c));
app.notFound((c) => handleError(httpError(404, 'NOT_FOUND', 'Ressource introuvable.'), c));

const routes = app
  .route('/', adminUsersRoutes)
  .route('/', adminAgenciesRoutes)
  .route('/', dataEntitiesRoutes)
  .route('/', dataEntityContactsRoutes)
  .route('/', dataInteractionsRoutes)
  .route('/', dataConfigRoutes)
  .route('/', dataProfileRoutes);

export type AppType = typeof routes;
export default app;
