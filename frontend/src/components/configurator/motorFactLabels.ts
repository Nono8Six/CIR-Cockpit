import { motorFactPathSchema } from 'shared/schemas/configurator/motor.schema';

export type MotorFactPath = (typeof motorFactPathSchema.options)[number];

export type MotorFactFamily = 'mounting' | 'electrical' | 'frame' | 'shaft' | 'flange' | 'application';

export const MOTOR_FACT_FAMILY_LABELS: Record<MotorFactFamily, string> = {
  mounting: 'Montage',
  electrical: 'Électrique',
  frame: 'Fixation',
  shaft: 'Arbre',
  flange: 'Bride',
  application: 'Application'
};

/**
 * Libelle metier de chaque fait expose par le backend. La liste couvre
 * exactement `motorFactPathSchema` : un fait manquant doit toujours pouvoir
 * etre nomme a l'utilisateur, jamais affiche sous sa cle technique.
 */
export const MOTOR_FACT_LABELS: Record<MotorFactPath, string> = {
  'mounting': 'Forme de montage',
  'electrical.power_kw': 'Puissance',
  'electrical.speed_rpm': 'Vitesse nominale',
  'electrical.poles': 'Nombre de pôles',
  'electrical.network': 'Réseau',
  'electrical.frequency_hz': 'Fréquence',
  'electrical.supply_mode': 'Mode d’alimentation',
  'electrical.voltage_v': 'Tension',
  'electrical.coupling': 'Couplage',
  'electrical.rated_current_a': 'Courant nominal',
  'electrical.rated_torque_nm': 'Couple nominal',
  'electrical.efficiency_class': 'Classe de rendement',
  'mechanical.frame.A': 'Cote A — entraxe transversal des pattes',
  'mechanical.frame.B': 'Cote B — entraxe longitudinal des pattes',
  'mechanical.frame.C': 'Cote C — bout d’arbre au premier trou de patte',
  'mechanical.frame.H': 'Cote H — hauteur d’axe',
  'mechanical.frame.K': 'Cote K — diamètre des trous de pattes',
  'mechanical.frame.bolt_diameter': 'Diamètre réel du boulon de fixation',
  'mechanical.frame.transverse_travel': 'Course transversale du bâti',
  'mechanical.frame.longitudinal_travel': 'Course longitudinale du bâti',
  'mechanical.shaft.D': 'Cote D — diamètre du bout d’arbre',
  'mechanical.shaft.D_fit_tolerance': 'Tolérance d’ajustement de l’arbre',
  'mechanical.shaft.E': 'Cote E — longueur du bout d’arbre',
  'mechanical.shaft.F': 'Cote F — largeur de clavette',
  'mechanical.coupling.axial_min': 'Borne axiale minimale de l’accouplement',
  'mechanical.coupling.axial_max': 'Borne axiale maximale de l’accouplement',
  'mechanical.flange.M': 'Cote M — entraxe des trous de bride',
  'mechanical.flange.N': 'Cote N — diamètre de centrage',
  'mechanical.flange.P': 'Cote P — diamètre extérieur de bride',
  'mechanical.flange.bore_type': 'Nature des trous de bride',
  'mechanical.flange.S': 'Cote S — diamètre des trous de bride',
  'mechanical.flange.S_thread': 'Cote S — filetage des trous de bride',
  'mechanical.flange.T': 'Cote T — épaisseur du plateau de bride',
  'mechanical.flange.Z': 'Cote Z — nombre de trous de bride',
  'mechanical.flange.P_clearance': 'Dégagement radial disponible autour de la bride',
  'mechanical.flange.T_clearance': 'Dégagement axial disponible devant la bride',
  'application.ip_rating': 'Indice de protection exigé',
  'application.brake_required': 'Frein exigé',
  'application.vfd_required': 'Variateur exigé',
  'application.cooling_method': 'Mode de refroidissement exigé',
  'application.duty_service': 'Service exigé',
  'application.ambient_temperature': 'Température ambiante',
  'application.starts_per_hour': 'Démarrages par heure'
};

/**
 * Action attendue de l'utilisateur pour lever le fait manquant. C'est la
 * difference entre « il manque une information » et « voici quoi faire ».
 */
export const MOTOR_FACT_RESOLUTION: Record<MotorFactFamily, string> = {
  mounting: 'Précisez la forme de montage réellement installée.',
  electrical: 'Relevez la valeur sur la plaque signalétique du moteur en place.',
  frame: 'Mesurez la cote sur le bâti, puis confirmez-la.',
  shaft: 'Mesurez la cote sur le bout d’arbre, puis confirmez-la.',
  flange: 'Mesurez la cote sur la bride, puis confirmez-la.',
  application: 'Renseignez l’exigence applicative si elle existe pour ce poste.'
};

export const getMotorFactFamily = (factPath: MotorFactPath): MotorFactFamily => {
  if (factPath === 'mounting') return 'mounting';
  if (factPath.startsWith('electrical.')) return 'electrical';
  if (factPath.startsWith('application.')) return 'application';
  if (factPath.startsWith('mechanical.frame.')) return 'frame';
  if (factPath.startsWith('mechanical.shaft.') || factPath.startsWith('mechanical.coupling.')) {
    return 'shaft';
  }
  return 'flange';
};

export const getMotorFactLabel = (factPath: MotorFactPath): string =>
  MOTOR_FACT_LABELS[factPath] ?? factPath;

/**
 * Regroupe des faits manquants par famille, en conservant l'ordre d'apparition
 * renvoye par le backend a l'interieur de chaque famille.
 */
export const groupMotorFactsByFamily = (
  factPaths: readonly MotorFactPath[]
): Array<{ family: MotorFactFamily; factPaths: MotorFactPath[] }> => {
  const grouped = new Map<MotorFactFamily, MotorFactPath[]>();

  for (const factPath of factPaths) {
    const family = getMotorFactFamily(factPath);
    const bucket = grouped.get(family);
    if (bucket) {
      bucket.push(factPath);
      continue;
    }
    grouped.set(family, [factPath]);
  }

  const familyOrder: MotorFactFamily[] = [
    'mounting',
    'electrical',
    'frame',
    'shaft',
    'flange',
    'application'
  ];

  return familyOrder
    .filter((family) => grouped.has(family))
    .map((family) => ({ family, factPaths: grouped.get(family) ?? [] }));
};
