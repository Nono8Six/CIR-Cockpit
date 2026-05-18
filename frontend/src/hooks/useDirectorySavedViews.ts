import { useQuery } from '@tanstack/react-query';

import type { DirectorySavedViewType } from 'shared/schemas/directory.schema';
import { getDirectorySavedViews } from '@/services/directory/getDirectorySavedViews';
import { directorySavedViewsKey } from '@/services/query/queryKeys';
import { useNotifyError } from './useNotifyError';

export const useDirectorySavedViews = (
  viewType: DirectorySavedViewType = 'clients',
  enabled = true
) => {
  const query = useQuery({
    queryKey: directorySavedViewsKey(viewType),
    queryFn: () => getDirectorySavedViews({ viewType }),
    enabled,
    staleTime: 60_000
  });

  useNotifyError(query.error, 'Impossible de charger les vues sauvegardees.', 'useDirectorySavedViews');

  return query;
};
