import type { Hono } from '@hono/hono';

import { dataInteractionsPayloadSchema } from '../../../../shared/schemas/data.schema.ts';
import type { AppEnv } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import { requireAuth } from '../middleware/auth.ts';
import { handleDataInteractionsAction } from '../services/dataInteractions.ts';

export const registerDataInteractionsRoutes = (app: Hono<AppEnv>) => {
  app.post('/data/interactions', requireAuth, async (c) => {
    const requestId = c.get('requestId');
    const db = c.get('db');
    const callerId = c.get('callerId');
    if (!db || !callerId) {
      throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
    }

    const payload = await c.req.json().catch(() => {
      throw httpError(400, 'INVALID_JSON', 'Corps JSON invalide.');
    });

    const parsed = dataInteractionsPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      throw httpError(400, 'INVALID_PAYLOAD', 'Payload invalide.', parsed.error.message);
    }

    const result = await handleDataInteractionsAction(db, callerId, requestId, parsed.data);
    return c.json(result);
  });
};
