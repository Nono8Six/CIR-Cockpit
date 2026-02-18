import { Hono } from '@hono/hono';

import { dataConfigPayloadSchema } from '../../../../shared/schemas/data.schema.ts';
import type { AppEnv } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import { requireAuth } from '../middleware/auth.ts';
import { zValidator } from '../middleware/zodValidator.ts';
import { handleDataConfigAction } from '../services/dataConfig.ts';

const dataConfigRoutes = new Hono<AppEnv>().post(
  '/data/config',
  requireAuth,
  zValidator('json', dataConfigPayloadSchema),
  async (c) => {
    const requestId = c.get('requestId');
    const userDb = c.get('userDb');
    const authContext = c.get('authContext');
    if (!userDb || !authContext) {
      throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
    }

    const payload = c.req.valid('json');
    const result = await handleDataConfigAction(userDb, authContext, requestId, payload.agency_id, payload);
    return c.json(result);
  }
);

export default dataConfigRoutes;
