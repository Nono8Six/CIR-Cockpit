import { withInvalidTrpcResponse } from '@/services/api/invokeTrpc';
import {
  adminAgenciesAgencyResponseSchema,
  type AdminAgenciesAgencyResponse
} from '../../../../shared/schemas/system/api-responses';
import { safeTrpc } from '@/services/api/safeTrpc';

export type AdminAgencyResponse = AdminAgenciesAgencyResponse;;

export const renameAdminAgency = (agencyId: string, name: string) =>
  safeTrpc(
    (api, options) => api.admin.agencies.mutate({
      action: 'rename',
      agency_id: agencyId,
      name
      }, options),
    withInvalidTrpcResponse(adminAgenciesAgencyResponseSchema, { code: 'EDGE_INVALID_RESPONSE' }),
    "Impossible de renommer l'agence."
  );
