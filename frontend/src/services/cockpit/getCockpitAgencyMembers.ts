import {
  cockpitAgencyMembersResponseSchema,
  type CockpitAgencyMembersInput,
  type CockpitAgencyMembersResponse
} from '../../../../shared/schemas/interaction/cockpit.schema';
import { invokeTrpc } from '@/services/api/invokeTrpc';;

export const getCockpitAgencyMembers = (
  input: CockpitAgencyMembersInput
): Promise<CockpitAgencyMembersResponse> =>
  invokeTrpc(
    (api, options) => api.cockpit['agency-members'].query(input, options),
    cockpitAgencyMembersResponseSchema,
    "Impossible de charger les membres de l'agence."
  );
