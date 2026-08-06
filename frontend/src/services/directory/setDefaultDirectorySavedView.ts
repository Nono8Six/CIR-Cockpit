import {
  directorySavedViewResponseSchema,
  type DirectorySavedViewResponse
} from '../../../../shared/schemas/system/api-responses';
import { type DirectorySavedViewSetDefaultInput } from '../../../../shared/schemas/system/directory.schema';

import { invokeTrpc } from '@/services/api/invokeTrpc';;

export const setDefaultDirectorySavedView = (
  input: DirectorySavedViewSetDefaultInput
): Promise<DirectorySavedViewResponse> =>
  invokeTrpc(
    (api, options) => api.directory['saved-views']['set-default'].mutate(input, options),
    directorySavedViewResponseSchema,
    'Impossible de définir la vue par défaut.'
  );
