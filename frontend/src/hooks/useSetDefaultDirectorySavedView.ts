import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type DirectorySavedViewSetDefaultInput } from 'shared/schemas/directory.schema';
import { setDefaultDirectorySavedView } from '@/services/directory/setDefaultDirectorySavedView';
import { invalidateDirectoryQueries } from '@/services/query/queryInvalidation';

export const useSetDefaultDirectorySavedView = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DirectorySavedViewSetDefaultInput) => setDefaultDirectorySavedView(input),
    onSuccess: async () => {
      await invalidateDirectoryQueries(queryClient);
    }
  });
};
