import {
  cockpitPhoneLookupResponseSchema,
  type CockpitPhoneLookupInput,
  type CockpitPhoneLookupResponse
} from '../../../../shared/schemas/interaction/cockpit.schema';
import { invokeTrpc } from '@/services/api/invokeTrpc';;

export const getCockpitPhoneLookup = (
  input: CockpitPhoneLookupInput
): Promise<CockpitPhoneLookupResponse> =>
  invokeTrpc(
    (api, options) => api.cockpit['phone-lookup'].query(input, options),
    cockpitPhoneLookupResponseSchema,
    "Impossible de rechercher l'historique du numéro."
  );
