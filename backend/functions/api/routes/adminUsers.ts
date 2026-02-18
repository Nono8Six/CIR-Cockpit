import { Hono } from '@hono/hono';

import { adminUsersPayloadSchema } from '../../../../shared/schemas/user.schema.ts';
import type { AppEnv } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import { requireSuperAdmin } from '../middleware/auth.ts';
import { zValidator } from '../middleware/zodValidator.ts';
import { handleAdminUsersAction } from '../services/adminUsers.ts';

const adminUsersRoutes = new Hono<AppEnv>().post(
  '/admin/users',
  requireSuperAdmin,
  zValidator('json', adminUsersPayloadSchema),
  async (c) => {
    const requestId = c.get('requestId');
    const db = c.get('db');
    const callerId = c.get('callerId');
    if (!db || !callerId) {
      throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
    }

    const payload = c.req.valid('json');
    const result = await handleAdminUsersAction(db, callerId, requestId, payload);
    return c.json(result);
  }
);

export default adminUsersRoutes;
