import type { Hono } from 'https://deno.land/x/hono@4.6.10/mod.ts';

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
      throw httpError(403, 'AUTH_FORBIDDEN', 'Forbidden');
    }

    const payload = await c.req.json().catch(() => {
      throw httpError(400, 'INVALID_JSON', 'Invalid JSON body');
    });

    const parsed = adminUsersPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      throw httpError(400, 'INVALID_PAYLOAD', 'Invalid payload', parsed.error.message);
    }

    const result = await handleAdminUsersAction(db, callerId, requestId, parsed.data);
    return c.json(result);
  });
};
