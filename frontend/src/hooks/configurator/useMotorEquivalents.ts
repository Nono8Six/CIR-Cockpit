import { useQuery } from '@tanstack/react-query';

import type {
  MotorEquivalentFromMotorInput,
  MotorEquivalentFromSpecInput
} from '../../../../shared/schemas/configurator/motor.schema';
import {
  findMotorEquivalentsFromMotor,
  findMotorEquivalentsFromSpec
} from '@/services/configurator/motorConfigurator';
import {
  configuratorMotorEquivalentsFromMotorKey,
  configuratorMotorEquivalentsFromSpecKey
} from '@/services/query/queryKeys';
import { requireConfiguratorInput } from './requireConfiguratorInput';

/**
 * Duree mesuree en runtime distant (C3-8) : 5,7 a 7,1 s. L'interface qui
 * consomme ce hook doit rendre l'attente lisible sans inventer de progression.
 */
export const MOTOR_EQUIVALENTS_EXPECTED_SECONDS = 7;

/**
 * Seuil au-dela duquel l'interface explique que la recherche est longue par
 * nature. En deca, un squelette suffit et un message serait du bruit.
 */
export const MOTOR_EQUIVALENTS_LONG_WAIT_SECONDS = 3;

const EQUIVALENTS_QUERY_OPTIONS = {
  staleTime: 5 * 60_000,
  // Une recherche de 7 s ne doit pas etre relancee au retour d'onglet.
  refetchOnWindowFocus: false,
  // Un echec apres 7 s d'attente se re-tente une fois, pas davantage.
  retry: 1
} as const;

export const useMotorEquivalentsFromMotor = (input: MotorEquivalentFromMotorInput | null) =>
  useQuery({
    queryKey: configuratorMotorEquivalentsFromMotorKey(input),
    queryFn: () =>
      findMotorEquivalentsFromMotor(
        requireConfiguratorInput(input, 'useMotorEquivalentsFromMotor')
      ),
    enabled: input !== null,
    ...EQUIVALENTS_QUERY_OPTIONS
  });

export const useMotorEquivalentsFromSpec = (input: MotorEquivalentFromSpecInput | null) =>
  useQuery({
    queryKey: configuratorMotorEquivalentsFromSpecKey(input),
    queryFn: () =>
      findMotorEquivalentsFromSpec(
        requireConfiguratorInput(input, 'useMotorEquivalentsFromSpec')
      ),
    enabled: input !== null,
    ...EQUIVALENTS_QUERY_OPTIONS
  });
