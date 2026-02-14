import type { Hono } from 'jsr:@hono/hono';

import { dataConfigPayloadSchema } from '../../../../shared/schemas/data.schema.ts';
import type { AppEnv } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import { requireAuth } from '../middleware/auth.ts';
import { handleDataConfigAction } from '../services/dataConfig.ts';

export const registerDataConfigRoutes = (app: Hono<AppEnv>) => {
  app.post('/data/config', requireAuth, async (c) => {
    const requestId = c.get('requestId');
    const db = c.get('db');
    const callerId = c.get('callerId');
    if (!db || !callerId) {
      throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
    }

    const payload = await c.req.json().catch(() => {
      throw httpError(400, 'INVALID_JSON', 'Corps JSON invalide.');
    });

    const parsed = dataConfigPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      throw httpError(400, 'INVALID_PAYLOAD', 'Payload invalide.', parsed.error.message);
    }

    const result = await handleDataConfigAction(db, callerId, requestId, parsed.data.agency_id, parsed.data);
    return c.json(result);
  });
};
