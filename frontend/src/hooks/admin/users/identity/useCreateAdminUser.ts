import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createAdminUser, CreateAdminUserPayload } from '@/services/admin/createAdminUser';
import { invalidateAdminUsersQuery } from '@/services/query/queryInvalidation';
import { mapAdminDomainError } from '@/services/errors/mapAdminDomainError';

export const useCreateAdminUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAdminUserPayload) =>
      createAdminUser(payload).match(
        (response) => response,
        (error) => {
          throw mapAdminDomainError(error, {
            action: 'create_user',
            fallbackMessage: "Impossible de creer l'utilisateur."
          });
        }
      ),
    onSuccess: () => {
      void invalidateAdminUsersQuery(queryClient);
    }
  });
};
