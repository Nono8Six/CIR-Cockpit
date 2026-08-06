import { withInvalidTrpcResponse } from '@/services/api/invokeTrpc';
import {
  adminAgenciesAgencyResponseSchema,
  type AdminAgenciesAgencyResponse
} from '../../../../shared/schemas/system/api-responses';
import { safeTrpc } from '@/services/api/safeTrpc';

export type AdminAgencyResponse = AdminAgenciesAgencyResponse;;

export const archiveAdminAgency = (agencyId: string) =>
  safeTrpc(
    (api, options) => api.admin.agencies.mutate({
      action: 'archive',
      agency_id: agencyId
      }, options),
    withInvalidTrpcResponse(adminAgenciesAgencyResponseSchema, { code: 'EDGE_INVALID_RESPONSE' }),
    "Impossible d'archiver l'agence."
  );
