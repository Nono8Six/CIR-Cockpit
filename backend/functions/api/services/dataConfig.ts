import type { DataConfigResponse } from '../../../../shared/schemas/api-responses.ts';
import type { DataConfigPayload } from '../../../../shared/schemas/data.schema.ts';
import type { AuthContext, DbClient } from '../types.ts';
import { saveLegacyDataConfig } from './configSettings.ts';

export { assertValidStatusCategories, buildStatusUpsertRows, normalizeLabelList } from './configSettings.ts';

export const handleDataConfigAction = (
  db: DbClient,
  authContext: AuthContext,
  requestId: string | undefined,
  _agencyId: string,
  data: DataConfigPayload
): Promise<DataConfigResponse> => saveLegacyDataConfig(db, authContext, requestId, data);
