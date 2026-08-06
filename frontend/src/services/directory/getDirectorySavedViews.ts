import {
  directorySavedViewsListResponseSchema,
  type DirectorySavedViewsListResponse
} from '../../../../shared/schemas/system/api-responses';
import type { DirectorySavedViewsListInput } from '../../../../shared/schemas/system/directory.schema';

import { invokeTrpc } from '@/services/api/invokeTrpc';;

export const getDirectorySavedViews = (
  input: DirectorySavedViewsListInput = { viewType: 'clients' }
): Promise<DirectorySavedViewsListResponse> =>
  invokeTrpc(
    (api, options) => api.directory['saved-views'].list.query(input, options),
    directorySavedViewsListResponseSchema,
    'Impossible de charger les vues sauvegardées.'
  );
