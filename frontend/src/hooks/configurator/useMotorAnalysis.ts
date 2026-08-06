import { useQuery } from '@tanstack/react-query';

import type {
  MotorAdviceInput,
  MotorCompareInput,
  MotorEnergyComputeInput
} from '../../../../shared/schemas/configurator/motor.schema';
import {
  buildMotorAdvice,
  compareMotors,
  computeMotorEnergy
} from '@/services/configurator/motorConfigurator';
import {
  configuratorMotorAdviceKey,
  configuratorMotorCompareKey,
  configuratorMotorEnergyKey
} from '@/services/query/queryKeys';
import { requireConfiguratorInput } from './requireConfiguratorInput';

/**
 * Conseils structures pour un candidat deja evalue. L'entree contient le verdict
 * complet : la clef de cache ne retient que les identites, pour rester stable.
 */
export const useMotorAdvice = (input: MotorAdviceInput | null) =>
  useQuery({
    queryKey: configuratorMotorAdviceKey(input),
    queryFn: () => buildMotorAdvice(requireConfiguratorInput(input, 'useMotorAdvice')),
    enabled: input !== null,
    staleTime: 5 * 60_000
  });

/**
 * Consommation annuelle a partir d'un profil de charge explicite. Sans profil,
 * aucune requete : l'energie n'est jamais estimee par defaut.
 */
export const useMotorEnergy = (input: MotorEnergyComputeInput | null) =>
  useQuery({
    queryKey: configuratorMotorEnergyKey(input),
    queryFn: () => computeMotorEnergy(requireConfiguratorInput(input, 'useMotorEnergy')),
    enabled: input !== null,
    staleTime: 5 * 60_000
  });

/**
 * Comparaison de deux a quatre points de fonctionnement, dans l'ordre demande.
 */
export const useMotorComparison = (input: MotorCompareInput | null) =>
  useQuery({
    queryKey: configuratorMotorCompareKey(input),
    queryFn: () => compareMotors(requireConfiguratorInput(input, 'useMotorComparison')),
    enabled: input !== null,
    staleTime: 5 * 60_000
  });
