import {
  directoryListResponseSchema,
  type DirectoryListResponse
} from '../../../../shared/schemas/system/api-responses';
import { type DirectoryListInput } from '../../../../shared/schemas/system/directory.schema';

import { invokeTrpc } from '@/services/api/invokeTrpc';;

export const getDirectoryPage = (input: DirectoryListInput): Promise<DirectoryListResponse> =>
  invokeTrpc(
    (api, options) => api.directory.list.query(input, options),
    directoryListResponseSchema,
    "Impossible de charger l'annuaire."
  );
