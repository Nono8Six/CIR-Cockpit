import { useMutation, useQueryClient } from '@tanstack/react-query';

import { reassignEntity, type ReassignEntityPayload } from '@/services/entities/reassignEntity';
import { handleUiError } from '@/services/errors/handleUiError';

export const useReassignEntity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ReassignEntityPayload) =>
      reassignEntity(payload).match(
        (result) => result,
        (error) => {
          throw error;
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
    },
    onError: (error) => {
      handleUiError(error, "Impossible de reassigner l'entite.", {
        source: 'useReassignEntity.onError'
      });
    }
  });
};

