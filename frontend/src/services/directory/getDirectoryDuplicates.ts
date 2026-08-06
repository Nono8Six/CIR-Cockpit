import {
  directoryDuplicatesResponseSchema,
  type DirectoryDuplicatesResponse
} from '../../../../shared/schemas/system/api-responses';
import { type DirectoryDuplicatesInput } from '../../../../shared/schemas/system/directory.schema';

import { invokeTrpc } from '@/services/api/invokeTrpc';;

export const getDirectoryDuplicates = async (
  input: DirectoryDuplicatesInput
): Promise<DirectoryDuplicatesResponse> =>
  invokeTrpc(
    (api, options) => api.directory.duplicates.query(input, options),
    directoryDuplicatesResponseSchema,
    'Impossible de vérifier les doublons.'
  );
