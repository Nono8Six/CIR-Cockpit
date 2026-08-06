import {
  directoryRecordResponseSchema,
  type DirectoryRecordResponse
} from '../../../../shared/schemas/system/api-responses';
import { type DirectoryRouteRef } from '../../../../shared/schemas/system/directory.schema';
import { invokeTrpc } from '@/services/api/invokeTrpc';;

export const getDirectoryRecord = (input: DirectoryRouteRef): Promise<DirectoryRecordResponse> =>
  invokeTrpc(
    (api, options) => api.directory.record.query(input, options),
    directoryRecordResponseSchema,
    "Impossible de charger la fiche annuaire."
  );
