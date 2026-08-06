import { useQuery } from '@tanstack/react-query';

import type { MotorCatalogGetInput } from '../../../../shared/schemas/configurator/motor.schema';
import { getMotorCatalogEntry } from '@/services/configurator/motorConfigurator';
import { configuratorMotorCatalogGetKey } from '@/services/query/queryKeys';
import { requireConfiguratorInput } from './requireConfiguratorInput';

/**
 * Fiche technique complete d'un point de fonctionnement, avec sa normalisation
 * `fromMotor`, ses anomalies et sa provenance. Mesure runtime C3-8 : 1,4 a 1,5 s.
 * L'entree nulle laisse la requete inactive : aucune valeur par defaut n'est
 * fabriquee pour declencher un appel.
 */
export const useMotorCatalogEntry = (input: MotorCatalogGetInput | null) =>
  useQuery({
    queryKey: configuratorMotorCatalogGetKey(input),
    queryFn: () => getMotorCatalogEntry(requireConfiguratorInput(input, 'useMotorCatalogEntry')),
    enabled: input !== null,
    staleTime: 5 * 60_000
  });
