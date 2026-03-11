import { useMutation, useQueryClient } from '@tanstack/react-query';

import { type DirectorySavedViewDeleteInput } from 'shared/schemas/directory.schema';
import { deleteDirectorySavedView } from '@/services/directory/deleteDirectorySavedView';
import { invalidateDirectoryQueries } from '@/services/query/queryInvalidation';

export const useDeleteDirectorySavedView = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DirectorySavedViewDeleteInput) => deleteDirectorySavedView(input),
    onSuccess: async () => {
      await invalidateDirectoryQueries(queryClient);
    }
  });
};
