import type { Hono } from 'jsr:@hono/hono';

import { adminUsersPayloadSchema } from '../../../../shared/schemas/user.schema.ts';
import type { AppEnv } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import { requireSuperAdmin } from '../middleware/auth.ts';
import { handleAdminUsersAction } from '../services/adminUsers.ts';

export const registerAdminUsersRoutes = (app: Hono<AppEnv>) => {
  app.post('/admin/users', requireSuperAdmin, async (c) => {
    const requestId = c.get('requestId');
    const db = c.get('db');
    const callerId = c.get('callerId');
    if (!db || !callerId) {
      throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
    }

    const payload = await c.req.json().catch(() => {
      throw httpError(400, 'INVALID_JSON', 'Corps JSON invalide.');
    });

    const parsed = adminUsersPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      throw httpError(400, 'INVALID_PAYLOAD', 'Payload invalide.', parsed.error.message);
    }

    const result = await handleAdminUsersAction(db, callerId, requestId, parsed.data);
    return c.json(result);
  });
};
