import type { DataConfigResponse } from '../../../../../shared/schemas/system/api-responses.ts';
import type { DataConfigPayload } from '../../../../../shared/schemas/system/data.schema.ts';
import type { AuthContext, DbClient } from '../../types.ts';
import { saveLegacyDataConfig } from '../config/configSettings.ts';

export {
  assertValidStatusCategories,
  buildStatusUpsertRows,
  normalizeLabelList,
  resolveStatusDeleteMode
} from '../config/configSettings.ts';

export const handleDataConfigAction = (
  db: DbClient,
  authContext: AuthContext,
  requestId: string | undefined,
  _agencyId: string,
  data: DataConfigPayload
): Promise<DataConfigResponse> => saveLegacyDataConfig(db, authContext, requestId, data);
