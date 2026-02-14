import type { DataProfilePayload } from '../../../../shared/schemas/data.schema.ts';
import type { DbClient } from '../types.ts';
import { httpError } from '../middleware/errorHandler.ts';

export const handleDataProfileAction = async (
  db: DbClient,
  callerId: string,
  requestId: string | undefined,
  data: DataProfilePayload
): Promise<Record<string, unknown>> => {
  switch (data.action) {
    case 'password_changed': {
      const { error } = await db
        .from('profiles')
        .update({ must_change_password: false })
        .eq('id', callerId);

      if (error) {
        throw httpError(500, 'PROFILE_UPDATE_FAILED', 'Impossible de mettre a jour le profil.');
      }

      return { request_id: requestId, ok: true };
    }
    default:
      throw httpError(400, 'ACTION_REQUIRED', 'Action requise.');
  }
};
