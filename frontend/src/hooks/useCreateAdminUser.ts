import { useMutation, useQueryClient } from '@tanstack/react-query';

import { adminUsersCreate, CreateAdminUserPayload } from '@/services/admin/adminUsersCreate';
import { invalidateAdminUsersQuery } from '@/services/query/queryInvalidation';
import { mapAdminDomainError } from '@/services/errors/mapAdminDomainError';

export const useCreateAdminUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAdminUserPayload) =>
      adminUsersCreate(payload).match(
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
