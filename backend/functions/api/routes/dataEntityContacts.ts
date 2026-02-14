import type { Hono } from 'jsr:@hono/hono';

import { dataEntityContactsPayloadSchema } from '../../../../shared/schemas/data.schema.ts';
import type { AppEnv } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import { requireAuth } from '../middleware/auth.ts';
import { handleDataEntityContactsAction } from '../services/dataEntityContacts.ts';

export const registerDataEntityContactsRoutes = (app: Hono<AppEnv>) => {
  app.post('/data/entity-contacts', requireAuth, async (c) => {
    const requestId = c.get('requestId');
    const db = c.get('db');
    const callerId = c.get('callerId');
    if (!db || !callerId) {
      throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
    }

    const payload = await c.req.json().catch(() => {
      throw httpError(400, 'INVALID_JSON', 'Corps JSON invalide.');
    });

    const parsed = dataEntityContactsPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      throw httpError(400, 'INVALID_PAYLOAD', 'Payload invalide.', parsed.error.message);
    }

    const result = await handleDataEntityContactsAction(db, callerId, requestId, parsed.data);
    return c.json(result);
  });
};
