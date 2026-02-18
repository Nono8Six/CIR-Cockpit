import { Hono } from '@hono/hono';

import { adminAgenciesPayloadSchema } from '../../../../shared/schemas/agency.schema.ts';
import type { AppEnv } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import { requireSuperAdmin } from '../middleware/auth.ts';
import { zValidator } from '../middleware/zodValidator.ts';
import { handleAdminAgenciesAction } from '../services/adminAgencies.ts';

const adminAgenciesRoutes = new Hono<AppEnv>().post(
  '/admin/agencies',
  requireSuperAdmin,
  zValidator('json', adminAgenciesPayloadSchema),
  async (c) => {
    const requestId = c.get('requestId');
    const db = c.get('db');
    const callerId = c.get('callerId');
    if (!db || !callerId) {
      throw httpError(403, 'AUTH_FORBIDDEN', 'Acces interdit.');
    }

    const payload = c.req.valid('json');
    const result = await handleAdminAgenciesAction(db, callerId, requestId, payload);
    return c.json(result);
  }
);

export default adminAgenciesRoutes;
