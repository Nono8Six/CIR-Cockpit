import {
  directorySavedViewResponseSchema,
  type DirectorySavedViewResponse
} from '../../../../shared/schemas/system/api-responses';
import { type DirectorySavedViewSaveInput } from '../../../../shared/schemas/system/directory.schema';

import { invokeTrpc } from '@/services/api/invokeTrpc';;

export const saveDirectorySavedView = (
  input: DirectorySavedViewSaveInput
): Promise<DirectorySavedViewResponse> =>
  invokeTrpc(
    (api, options) => api.directory['saved-views'].save.mutate(input, options),
    directorySavedViewResponseSchema,
    'Impossible de sauvegarder la vue.'
  );
