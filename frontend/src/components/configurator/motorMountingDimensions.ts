import type { MotorMounting } from 'shared/schemas/configurator/motor.schema';

export type MotorDimensionKey =
  | 'A' | 'B' | 'C' | 'H' | 'K'
  | 'D' | 'E' | 'F'
  | 'M' | 'N' | 'P' | 'S' | 'S_thread' | 'T' | 'Z';

export type MotorDimensionGroup = 'feet' | 'shaft' | 'flange';

export type MotorDimensionSpec = {
  key: MotorDimensionKey;
  group: MotorDimensionGroup;
  /** Ce que la cote mesure, dans les mots de l'atelier. */
  label: string;
  /** Où poser le mètre. C'est la seule chose qui compte au téléphone. */
  where: string;
  unit: 'mm' | 'trous' | 'filetage';
};

export const MOTOR_DIMENSIONS: Record<MotorDimensionKey, MotorDimensionSpec> = {
  A: {
    key: 'A',
    group: 'feet',
    label: 'Entraxe transversal des pattes',
    where: 'D’un trou de patte à l’autre, en travers du moteur.',
    unit: 'mm'
  },
  B: {
    key: 'B',
    group: 'feet',
    label: 'Entraxe longitudinal des pattes',
    where: 'D’un trou de patte à l’autre, dans le sens de l’arbre.',
    unit: 'mm'
  },
  C: {
    key: 'C',
    group: 'feet',
    label: 'Bout d’arbre au premier trou',
    where: 'De l’épaulement de l’arbre au premier trou de patte.',
    unit: 'mm'
  },
  H: {
    key: 'H',
    group: 'feet',
    label: 'Hauteur d’axe',
    where: 'Du dessous des pattes à l’axe de l’arbre.',
    unit: 'mm'
  },
  K: {
    key: 'K',
    group: 'feet',
    label: 'Diamètre des trous de pattes',
    where: 'Diamètre du perçage dans la patte, pas du boulon monté.',
    unit: 'mm'
  },
  D: {
    key: 'D',
    group: 'shaft',
    label: 'Diamètre du bout d’arbre',
    where: 'Au pied à coulisse, sur la partie cylindrique.',
    unit: 'mm'
  },
  E: {
    key: 'E',
    group: 'shaft',
    label: 'Longueur du bout d’arbre',
    where: 'De l’épaulement à l’extrémité de l’arbre.',
    unit: 'mm'
  },
  F: {
    key: 'F',
    group: 'shaft',
    label: 'Largeur de clavette',
    where: 'Largeur de la rainure, pas sa hauteur.',
    unit: 'mm'
  },
  M: {
    key: 'M',
    group: 'flange',
    label: 'Entraxe des trous de bride',
    where: 'Diamètre du cercle passant par les trous de fixation.',
    unit: 'mm'
  },
  N: {
    key: 'N',
    group: 'flange',
    label: 'Diamètre de centrage',
    where: 'Le portage cylindrique qui centre la bride.',
    unit: 'mm'
  },
  P: {
    key: 'P',
    group: 'flange',
    label: 'Diamètre extérieur de bride',
    where: 'Le plus grand diamètre du plateau.',
    unit: 'mm'
  },
  S: {
    key: 'S',
    group: 'flange',
    label: 'Trous de bride',
    where: 'Diamètre du perçage, ou filetage s’ils sont taraudés.',
    unit: 'mm'
  },
  S_thread: {
    key: 'S_thread',
    group: 'flange',
    label: 'Filetage des trous de bride',
    where: 'Lisez ou mesurez le filetage taraudé, par exemple M8 ou M10.',
    unit: 'filetage'
  },
  T: {
    key: 'T',
    group: 'flange',
    label: 'Épaisseur du plateau',
    where: 'Épaisseur de la bride au droit des trous.',
    unit: 'mm'
  },
  Z: {
    key: 'Z',
    group: 'flange',
    label: 'Nombre de trous',
    where: 'Comptez les trous de fixation de la bride.',
    unit: 'trous'
  }
};

/**
 * Cotes reellement decisives par forme de montage, verrouillees par le plan
 * directeur §4.4.
 *
 * En B3 et B35, mesurer bride et arbre ne suffit pas : A, B, C et H sont
 * necessaires. Inversement en B5 et B14, les cotes de pattes n'existent pas et
 * les demander serait une question absurde au telephone. C'est pourquoi la liste
 * des champs suit le montage et jamais l'inverse.
 */
export const MOUNTING_DIMENSIONS: Record<MotorMounting, readonly MotorDimensionKey[]> = {
  B3: ['A', 'B', 'C', 'H', 'K', 'D', 'E', 'F'],
  B5: ['M', 'N', 'P', 'S', 'T', 'Z', 'D', 'E', 'F'],
  B14: ['M', 'N', 'P', 'S_thread', 'T', 'Z', 'D', 'E', 'F'],
  B34: ['A', 'B', 'C', 'H', 'K', 'M', 'N', 'P', 'S_thread', 'T', 'Z', 'D', 'E', 'F'],
  B35: ['A', 'B', 'C', 'H', 'K', 'M', 'N', 'P', 'S', 'T', 'Z', 'D', 'E', 'F']
};

export type MountingPresentation = {
  mounting: MotorMounting;
  name: string;
  /** Comment le moteur est tenu, en une phrase reconnaissable. */
  description: string;
  hasFeet: boolean;
  hasFlange: boolean;
  /** Bride à trous lisses traversants, ou trous taraudés. */
  flangeBore: 'through' | 'tapped' | null;
};

export const MOUNTING_PRESENTATIONS: readonly MountingPresentation[] = [
  {
    mounting: 'B3',
    name: 'Pattes seules',
    description: 'Le moteur repose sur quatre pattes boulonnées au bâti.',
    hasFeet: true,
    hasFlange: false,
    flangeBore: null
  },
  {
    mounting: 'B5',
    name: 'Bride à trous lisses',
    description: 'Le moteur est suspendu par une grande bride traversée de boulons.',
    hasFeet: false,
    hasFlange: true,
    flangeBore: 'through'
  },
  {
    mounting: 'B14',
    name: 'Bride taraudée',
    description: 'Bride plus petite, vissée par des trous taraudés dans le plateau.',
    hasFeet: false,
    hasFlange: true,
    flangeBore: 'tapped'
  },
  {
    mounting: 'B34',
    name: 'Pattes et bride taraudée',
    description: 'Pattes au sol et petite bride taraudée à l’avant.',
    hasFeet: true,
    hasFlange: true,
    flangeBore: 'tapped'
  },
  {
    mounting: 'B35',
    name: 'Pattes et bride à trous lisses',
    description: 'Pattes au sol et grande bride traversante à l’avant.',
    hasFeet: true,
    hasFlange: true,
    flangeBore: 'through'
  }
];

export const getMountingPresentation = (mounting: MotorMounting): MountingPresentation =>
  MOUNTING_PRESENTATIONS.find((entry) => entry.mounting === mounting)
  ?? MOUNTING_PRESENTATIONS[0];

/**
 * Vitesse de synchronisme, n = 120 x f / p.
 *
 * Ce n'est pas une regle metier CIR mais la definition physique de la machine
 * asynchrone. Elle sert uniquement d'indication a l'ecran pour aider a lire une
 * plaque, et n'est jamais envoyee au backend comme une valeur relevee : la
 * vitesse reelle est toujours inferieure a cause du glissement.
 */
export const synchronousSpeedRpm = (poles: number, frequencyHz: number): number | null => {
  if (!Number.isFinite(poles) || !Number.isFinite(frequencyHz)) return null;
  if (poles <= 0 || frequencyHz <= 0) return null;
  return Math.round((120 * frequencyHz) / poles);
};

/** Nombre de pôles le plus probable pour une vitesse de plaque relevée. */
export const polesFromPlateSpeed = (
  speedRpm: number,
  frequencyHz: number
): number | null => {
  if (!Number.isFinite(speedRpm) || speedRpm <= 0) return null;
  const candidates = [2, 4, 6, 8, 10, 12];
  let best: number | null = null;
  let bestGap = Number.POSITIVE_INFINITY;

  for (const poles of candidates) {
    const synchronous = synchronousSpeedRpm(poles, frequencyHz);
    if (synchronous === null) continue;
    // Le glissement d'une asynchrone reste sous 10 % : au-dela, la vitesse
    // relevee ne correspond pas a cette polarite.
    const gap = synchronous - speedRpm;
    if (gap < 0 || gap > synchronous * 0.1) continue;
    if (gap < bestGap) {
      bestGap = gap;
      best = poles;
    }
  }

  return best;
};
