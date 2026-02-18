import { Hono } from '@hono/hono';

import { dataEntityContactsPayloadSchema } from '../../../../shared/schemas/data.schema.ts';
import type { AppEnv } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import { requireAuth } from '../middleware/auth.ts';
import { zValidator } from '../middleware/zodValidator.ts';
import { handleDataEntityContactsAction } from '../services/dataEntityContacts.ts';

const dataEntityContactsRoutes = new Hono<AppEnv>().post(
  '/data/entity-contacts',
  requireAuth,
  zValidator('json', dataEntityContactsPayloadSchema),
  async (c) => {
    const requestId = c.get('requestId');
    const userDb = c.get('userDb');
    const authContext = c.get('authContext');
    if (!userDb || !authContext) {
      throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
    }

    const payload = c.req.valid('json');
    const result = await handleDataEntityContactsAction(userDb, authContext, requestId, payload);
    return c.json(result);
  }
);

export default dataEntityContactsRoutes;
