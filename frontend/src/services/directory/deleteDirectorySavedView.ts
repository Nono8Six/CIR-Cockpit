import {
  directorySavedViewDeleteResponseSchema,
  type DirectorySavedViewDeleteResponse
} from '../../../../shared/schemas/system/api-responses';
import { type DirectorySavedViewDeleteInput } from '../../../../shared/schemas/system/directory.schema';

import { invokeTrpc } from '@/services/api/invokeTrpc';;

export const deleteDirectorySavedView = (
  input: DirectorySavedViewDeleteInput
): Promise<DirectorySavedViewDeleteResponse> =>
  invokeTrpc(
    (api, options) => api.directory['saved-views'].delete.mutate(input, options),
    directorySavedViewDeleteResponseSchema,
    'Impossible de supprimer la vue.'
  );
