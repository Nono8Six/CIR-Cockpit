import { withInvalidTrpcResponse } from '@/services/api/invokeTrpc';
import {
  adminAgenciesDeleteResponseSchema,
  type AdminAgenciesDeleteResponse
} from '../../../../shared/schemas/system/api-responses';
import { safeTrpc } from '@/services/api/safeTrpc';

export type AdminAgencyDeleteResponse = AdminAgenciesDeleteResponse;;

export const hardDeleteAdminAgency = (agencyId: string) =>
  safeTrpc(
    (api, options) => api.admin.agencies.mutate({
      action: 'hard_delete',
      agency_id: agencyId
      }, options),
    withInvalidTrpcResponse(adminAgenciesDeleteResponseSchema, { code: 'EDGE_INVALID_RESPONSE' }),
    "Impossible de supprimer l'agence."
  );
