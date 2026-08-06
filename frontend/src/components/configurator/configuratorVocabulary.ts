import type { LucideIcon } from 'lucide-react';
import { CircleCheck, CircleHelp, CircleSlash, TriangleAlert } from 'lucide-react';

import type {
  ConstraintConfirmation,
  ConstraintOrigin,
  CriterionStatus,
  DataGrade
} from 'shared/schemas/configurator/common.schema';
import type { MotorMounting } from 'shared/schemas/configurator/motor.schema';

/**
 * Vocabulaire d'affichage de la brique Configurateurs.
 *
 * Ce module ne contient aucune regle metier : il traduit en francais les valeurs
 * deja decidees par le backend. Le frontend ne recalcule jamais un statut, une
 * agregation ou une compatibilite.
 */

export type ConfiguratorTone = 'satisfied' | 'reservation' | 'indeterminate' | 'blocked';

/**
 * Ordre de severite decroissante utilise uniquement pour trier et regrouper des
 * resultats deja qualifies par le backend. Ce n'est pas une regle d'agregation.
 */
export const VERDICT_SEVERITY_ORDER: readonly CriterionStatus[] = [
  'not_satisfied',
  'indeterminate',
  'under_reservation',
  'satisfied'
] as const;

export const VERDICT_LABELS: Record<CriterionStatus, string> = {
  satisfied: 'Compatible',
  under_reservation: 'Sous réserve',
  indeterminate: 'Indéterminé',
  not_satisfied: 'Adaptation nécessaire'
};

/**
 * Libelle court reserve aux contextes tres denses (en-tete de colonne, puce de
 * regroupement). Reste au-dessus du plancher typographique de 11 px.
 */
export const VERDICT_SHORT_LABELS: Record<CriterionStatus, string> = {
  satisfied: 'Compatible',
  under_reservation: 'Réserve',
  indeterminate: 'Indéterminé',
  not_satisfied: 'Adaptation'
};

/**
 * Formulations verrouillees par le plan directeur (§4.4). Le mot « garantie »
 * n'y figure jamais : l'outil etablit une compatibilite documentaire.
 */
export const VERDICT_SENTENCES: Record<CriterionStatus, string> = {
  satisfied:
    'Tous les critères applicables sont compatibles. Validation finale au montage requise.',
  under_reservation:
    'Compatible sous réserve de confirmation des points listés ci-dessous.',
  indeterminate:
    'Indéterminé : des faits décisifs manquent pour conclure.',
  not_satisfied:
    'Adaptation nécessaire : au moins un critère décisif n’est pas satisfait.'
};

export const VERDICT_TONES: Record<CriterionStatus, ConfiguratorTone> = {
  satisfied: 'satisfied',
  under_reservation: 'reservation',
  indeterminate: 'indeterminate',
  not_satisfied: 'blocked'
};

export const VERDICT_ICONS: Record<CriterionStatus, LucideIcon> = {
  satisfied: CircleCheck,
  under_reservation: TriangleAlert,
  indeterminate: CircleHelp,
  not_satisfied: CircleSlash
};

/**
 * Couleurs de texte et de filet. Les quatre etats se distinguent d'abord par
 * leur icone et leur libelle ; la couleur ne fait que renforcer.
 *
 * Dans cette brique le rouge n'est jamais une couleur d'action : il est reserve
 * a l'etat bloquant. Les actions primaires passent en noir plein, pour qu'un
 * bouton ne puisse jamais se confondre avec un verdict.
 */
export const CONFIGURATOR_TONE_TEXT: Record<ConfiguratorTone, string> = {
  satisfied: 'text-success',
  reservation: 'text-warning-strong',
  indeterminate: 'text-muted-foreground',
  blocked: 'text-destructive'
};

export const CONFIGURATOR_TONE_SURFACE: Record<ConfiguratorTone, string> = {
  satisfied: 'border-success/25 bg-success/[0.05]',
  reservation: 'border-warning/35 bg-warning/[0.07]',
  indeterminate: 'border-border bg-surface-2',
  blocked: 'border-destructive/25 bg-destructive/[0.05]'
};

/**
 * Puces teintees : fond a faible opacite, texte de la meme famille chromatique
 * mais assez fonce pour rester lisible. C'est le porteur principal du verdict
 * dans les listes et les tableaux — assez colore pour se reperer au balayage,
 * assez sobre pour qu'une page en supporte cinquante.
 */
export const CONFIGURATOR_TONE_CHIP: Record<ConfiguratorTone, string> = {
  satisfied: 'bg-success/12 text-success',
  reservation: 'bg-warning/20 text-warning-strong',
  indeterminate: 'bg-surface-3 text-muted-foreground',
  blocked: 'bg-destructive/12 text-destructive'
};

/**
 * Aplats de la mosaique de verdict.
 *
 * `indeterminate` n'est volontairement pas un aplat mais une trame hachuree,
 * appliquee par le composant : une absence ne doit pas ressembler a une couleur
 * de plus dans la palette.
 */
export const CONFIGURATOR_TONE_CELL: Record<ConfiguratorTone, string> = {
  satisfied: 'bg-success',
  reservation: 'bg-warning',
  indeterminate: 'bg-surface-3 tech-hatch',
  blocked: 'bg-destructive'
};

export const CONFIGURATOR_TONE_DOT: Record<ConfiguratorTone, string> = {
  satisfied: 'bg-success',
  reservation: 'bg-warning',
  indeterminate: 'bg-muted-foreground/50',
  blocked: 'bg-destructive'
};

/**
 * Compare deux statuts par severite decroissante, pour l'affichage seulement.
 * Retour negatif : `left` se presente avant `right`.
 */
export const compareVerdictSeverity = (
  left: CriterionStatus,
  right: CriterionStatus
): number => VERDICT_SEVERITY_ORDER.indexOf(left) - VERDICT_SEVERITY_ORDER.indexOf(right);

export const ORIGIN_LABELS: Record<ConstraintOrigin, string> = {
  nameplate: 'Plaque',
  user_measurement: 'Mesure terrain',
  catalog: 'Catalogue constructeur',
  statistical_suggestion: 'Suggestion statistique',
  calculation: 'Calcul'
};

export const ORIGIN_SHORT_LABELS: Record<ConstraintOrigin, string> = {
  nameplate: 'Plaque',
  user_measurement: 'Mesure',
  catalog: 'Catalogue',
  statistical_suggestion: 'Suggestion',
  calculation: 'Calcul'
};

export const ORIGIN_DESCRIPTIONS: Record<ConstraintOrigin, string> = {
  nameplate: 'Valeur relevée sur la plaque signalétique du moteur en place.',
  user_measurement:
    'Valeur mesurée sur le terrain. Une mesure terrain n’est pas une valeur vérifiée : elle peut être fausse.',
  catalog: 'Valeur publiée par le catalogue technique du constructeur.',
  statistical_suggestion:
    'Valeur suggérée depuis les moteurs déjà présents en base. Elle doit être confirmée avant d’être décisive.',
  calculation: 'Valeur calculée à partir de faits sourcés, par une règle versionnée.'
};

export const CONFIRMATION_LABELS: Record<ConstraintConfirmation, string> = {
  confirmed: 'Confirmée',
  unconfirmed: 'Non confirmée'
};

/**
 * Le grade qualifie la qualite documentaire de la donnee du catalogue
 * constructeur. Il ne qualifie jamais une saisie utilisateur.
 */
export const DATA_GRADE_LABELS: Record<DataGrade, string> = {
  A: 'Grade A',
  B: 'Grade B',
  C: 'Grade C',
  D: 'Grade D'
};

export const DATA_GRADE_DESCRIPTIONS: Record<DataGrade, string> = {
  A: 'Provenance complète et relecture par un référent CIR.',
  B: 'Extraction sourcée du catalogue constructeur, non relue.',
  C: 'Calcul versionné à partir d’entrées sourcées.',
  D: 'Donnée incomplète ou non vérifiée.'
};

export const MOUNTING_LABELS: Record<MotorMounting, string> = {
  B3: 'B3 — pattes',
  B5: 'B5 — bride à trous lisses',
  B14: 'B14 — bride taraudée',
  B34: 'B34 — pattes et bride taraudée',
  B35: 'B35 — pattes et bride à trous lisses'
};

/**
 * Cotes reellement decisives par montage, telles que verrouillees par le plan
 * directeur (§4.4). Sert a expliquer a l'utilisateur ce qui sera controle avant
 * meme qu'il ne saisisse quoi que ce soit.
 */
export const MOUNTING_CRITERIA: Record<MotorMounting, { frame: string[]; shaft: string[] }> = {
  B3: { frame: ['A', 'B', 'C', 'H'], shaft: ['D', 'E', 'F'] },
  B5: { frame: ['M', 'N', 'P', 'S', 'T', 'Z'], shaft: ['D', 'E', 'F'] },
  B14: { frame: ['M', 'N', 'P', 'S', 'T', 'Z'], shaft: ['D', 'E', 'F'] },
  B34: { frame: ['A', 'B', 'C', 'H', 'M', 'N', 'P', 'S', 'T', 'Z'], shaft: ['D', 'E', 'F'] },
  B35: { frame: ['A', 'B', 'C', 'H', 'M', 'N', 'P', 'S', 'T', 'Z'], shaft: ['D', 'E', 'F'] }
};

export const ISSUE_SEVERITY_LABELS = {
  error: 'Anomalie',
  warning: 'Avertissement',
  info: 'Information'
} as const;

export const ISSUE_SEVERITY_TONES: Record<'error' | 'warning' | 'info', ConfiguratorTone> = {
  error: 'blocked',
  warning: 'reservation',
  info: 'indeterminate'
};

export const ADVICE_CATEGORY_LABELS = {
  mechanical: 'Mécanique',
  electrical: 'Électrique',
  application: 'Application',
  quality: 'Qualité de donnée',
  energy: 'Énergie'
} as const;

export const EVIDENCE_KIND_LABELS = {
  source_page: 'Page de catalogue',
  measurement: 'Mesure terrain',
  sample: 'Échantillon de base',
  rule: 'Règle de calcul'
} as const;

export const SUPPLY_MODE_LABELS = {
  mains: 'Réseau',
  vfd: 'Variateur'
} as const;

export const LIFECYCLE_LABELS = {
  current: 'Au catalogue',
  legacy: 'Historique'
} as const;
