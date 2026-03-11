import { useQuery } from '@tanstack/react-query';

import { getDirectorySavedViews } from '@/services/directory/getDirectorySavedViews';
import { directorySavedViewsKey } from '@/services/query/queryKeys';
import { useNotifyError } from './useNotifyError';

export const useDirectorySavedViews = (enabled = true) => {
  const query = useQuery({
    queryKey: directorySavedViewsKey(),
    queryFn: () => getDirectorySavedViews(),
    enabled,
    staleTime: 60_000
  });

  useNotifyError(query.error, 'Impossible de charger les vues sauvegardees.', 'useDirectorySavedViews');

  return query;
};
