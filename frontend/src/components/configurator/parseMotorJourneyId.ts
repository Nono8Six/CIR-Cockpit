import { MOTOR_JOURNEY_ORDER, type MotorJourneyId } from './motorJourneys';

const KNOWN_JOURNEY_IDS = new Set<string>(MOTOR_JOURNEY_ORDER);

/**
 * Valide le segment d'URL d'un parcours moteur.
 *
 * Une URL inconnue n'est pas une erreur applicative : elle renvoie simplement a
 * l'accueil moteurs, sans page d'erreur ni segment invente.
 */
export const parseMotorJourneyId = (rawJourneyId: string): MotorJourneyId | null =>
  KNOWN_JOURNEY_IDS.has(rawJourneyId) ? (rawJourneyId as MotorJourneyId) : null;
