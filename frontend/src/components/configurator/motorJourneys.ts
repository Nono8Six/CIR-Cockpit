import type { LucideIcon } from 'lucide-react';
import { ArrowLeftRight, Cog, FileSearch, ListOrdered } from 'lucide-react';

export type MotorJourneyId = 'consultation' | 'remplacement' | 'application' | 'pas-a-pas';

export type MotorJourneyAvailability =
  | { state: 'open' }
  | { state: 'planned'; slice: string; sliceLabel: string };

export type MotorJourney = {
  id: MotorJourneyId;
  path: string;
  label: string;
  /** Ce que l'utilisateur apporte en entrée. */
  input: string;
  /** Ce que le parcours produit. */
  output: string;
  icon: LucideIcon;
  availability: MotorJourneyAvailability;
};

/**
 * Les quatre entrees du configurateur moteur, dans l'ordre de leur utilite
 * terrain : le remplacement est le cas le plus frequent en clientele, il vient
 * donc en premier.
 *
 * L'etat de livraison de chaque parcours est declare explicitement. Un parcours
 * qui n'est pas ouvert le dit, avec la tranche qui l'ouvrira : c'est une
 * information produit, pas un espace reserve decoratif.
 */
const MOTOR_JOURNEY_BY_ID = {
  remplacement: {
    id: 'remplacement',
    path: '/configurateurs/moteurs/remplacement',
    label: 'Remplacement',
    input: 'Une référence connue, ou une plaque signalétique relevée sur le moteur en place.',
    output: 'Les moteurs du catalogue qui peuvent le remplacer, avec le verdict de chaque critère.',
    icon: ArrowLeftRight,
    availability: { state: 'open' }
  },
  consultation: {
    id: 'consultation',
    path: '/configurateurs/moteurs/consultation',
    label: 'Consultation',
    input: 'Une recherche libre dans le catalogue technique.',
    output: 'La fiche technique complète d’un moteur, avec ses cotes, ses brides et sa provenance.',
    icon: FileSearch,
    availability: { state: 'planned', slice: 'C10', sliceLabel: 'parcours Consultation' }
  },
  application: {
    id: 'application',
    path: '/configurateurs/moteurs/application',
    label: 'Application',
    input: 'Les données du process : convoyage, pompage, ventilation, levage, hydraulique.',
    output: 'Une spécification moteur calculée et sourcée, puis les candidats correspondants.',
    icon: Cog,
    availability: { state: 'planned', slice: 'C11', sliceLabel: 'parcours Application' }
  },
  'pas-a-pas': {
    id: 'pas-a-pas',
    path: '/configurateurs/moteurs/pas-a-pas',
    label: 'Pas à pas',
    input: 'Une puissance déjà connue, sans référence ni plaque.',
    output: 'Un entonnoir guidé qui resserre les candidats question après question.',
    icon: ListOrdered,
    availability: { state: 'planned', slice: 'C12', sliceLabel: 'parcours Pas à pas' }
  }
} as const satisfies Record<MotorJourneyId, MotorJourney>;

/**
 * Ordre d'affichage : le remplacement est le cas le plus frequent en clientele,
 * il ouvre donc la liste.
 */
export const MOTOR_JOURNEY_ORDER: readonly MotorJourneyId[] = [
  'remplacement',
  'consultation',
  'application',
  'pas-a-pas'
] as const;

export const MOTOR_JOURNEYS: readonly MotorJourney[] = MOTOR_JOURNEY_ORDER.map(
  (journeyId) => MOTOR_JOURNEY_BY_ID[journeyId]
);

export const getMotorJourney = (journeyId: MotorJourneyId): MotorJourney =>
  MOTOR_JOURNEY_BY_ID[journeyId];
