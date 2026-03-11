import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type DirectorySavedViewSaveInput } from 'shared/schemas/directory.schema';
import { saveDirectorySavedView } from '@/services/directory/saveDirectorySavedView';
import { invalidateDirectoryQueries } from '@/services/query/queryInvalidation';

export const useSaveDirectorySavedView = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DirectorySavedViewSaveInput) => saveDirectorySavedView(input),
    onSuccess: async () => {
      await invalidateDirectoryQueries(queryClient);
    }
  });
};
