import type { DataProfileResponse } from '../../../../shared/schemas/api-responses.ts';
import type { DataProfilePayload } from '../../../../shared/schemas/data.schema.ts';
import type { AuthContext, DbClient } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';
import { ensureDataRateLimit } from './dataAccess.ts';

export const handleDataProfileAction = async (
  db: DbClient,
  authContext: AuthContext,
  requestId: string | undefined,
  data: DataProfilePayload
): Promise<DataProfileResponse> => {
  await ensureDataRateLimit(`data_profile:${data.action}`, authContext.userId);

  switch (data.action) {
    case 'password_changed': {
      const { error } = await db
        .from('profiles')
        .update({ must_change_password: false })
        .eq('id', authContext.userId);

      if (error) {
        throw httpError(500, 'PROFILE_UPDATE_FAILED', 'Impossible de mettre a jour le profil.');
      }

      return { request_id: requestId, ok: true };
    }
    default:
      throw httpError(400, 'ACTION_REQUIRED', 'Action requise.');
  }
};
