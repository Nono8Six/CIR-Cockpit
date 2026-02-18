import { Hono } from '@hono/hono';

import { dataEntitiesPayloadSchema } from '../../../../shared/schemas/data.schema.ts';
import type { DataEntitiesPayload } from '../../../../shared/schemas/data.schema.ts';
import type { AppEnv, DbClient } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import { requireAuth } from '../middleware/auth.ts';
import { zValidator } from '../middleware/zodValidator.ts';
import { handleDataEntitiesAction } from '../services/dataEntities.ts';

const isReassignAction = (payload: Pick<DataEntitiesPayload, 'action'>): boolean =>
  payload.action === 'reassign';

export const selectDataEntitiesDb = (
  payload: Pick<DataEntitiesPayload, 'action'>,
  db: DbClient,
  userDb: DbClient
): DbClient => (isReassignAction(payload) ? db : userDb);

const dataEntitiesRoutes = new Hono<AppEnv>().post(
  '/data/entities',
  requireAuth,
  zValidator('json', dataEntitiesPayloadSchema),
  async (c) => {
    const requestId = c.get('requestId');
    const db = c.get('db');
    const userDb = c.get('userDb');
    const authContext = c.get('authContext');
    if (!db || !userDb || !authContext) {
      throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
    }

    const payload = c.req.valid('json');
    const actionDb = selectDataEntitiesDb(payload, db, userDb);
    const result = await handleDataEntitiesAction(actionDb, authContext, requestId, payload);
    return c.json(result);
  }
);

export default dataEntitiesRoutes;
