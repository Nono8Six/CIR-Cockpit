import type {
  PricingReferenceAnomalyType,
  PricingReferenceFileKind,
  PricingReferenceAnomalySeverity,
  PricingReferenceImportStatus,
  PricingReferenceLinkStatus
} from '../../../../../shared/schemas/pricing/references.schema';

export const importStatusLabels: Record<PricingReferenceImportStatus, string> = {
  brouillon: 'Brouillon',
  analyse_en_cours: 'Analyse en cours',
  analyse_ok: 'Analyse OK',
  analyse_erreur: 'Analyse erreur',
  pret_activation: 'Prêt activation',
  rejete: 'Rejeté',
  archive: 'Archivé'
};

export const severityLabels: Record<PricingReferenceAnomalySeverity, string> = {
  bloquante: 'Bloquante',
  haute: 'Haute',
  moyenne: 'Moyenne',
  faible: 'Faible'
};

export const fileKindLabels: Record<PricingReferenceFileKind, string> = {
  classification: 'Classification CIR',
  segments_grids: 'Segments / grilles fabricant'
};

export const anomalyTypeLabels: Record<PricingReferenceAnomalyType, string> = {
  missing_column: 'Colonne obligatoire absente',
  empty_file: 'Fichier vide',
  classification_duplicate_key: 'Clé CIR dupliquée',
  classification_required_empty: 'Champ classification vide',
  segment_identity_incomplete: 'Identité segment incomplète',
  segment_classification_incomplete: 'Classification segment incomplète',
  segment_classification_unknown: 'Clé CIR inconnue',
  segment_ambiguous_link: 'Liaison ambiguë',
  purchase_grid_missing: 'Grille achat incomplète',
  invalid_file: 'Fichier invalide',
  parse_failed: 'Valeur illisible'
};

export const anomalyTypeActionLabels: Record<PricingReferenceAnomalyType, string> = {
  missing_column: 'Ajouter ou mapper la colonne obligatoire dans le fichier source.',
  empty_file: 'Vérifier que l’onglet Excel contient les lignes attendues.',
  classification_duplicate_key: 'Corriger la clé CIR dupliquée dans la classification source.',
  classification_required_empty: 'Compléter les champs classification obligatoires dans Excel.',
  segment_identity_incomplete: 'Compléter SEGMENT, IDNUMERIQUE, MARQUE ou CAT_FAB dans le fichier source.',
  segment_classification_incomplete: 'Compléter la classification CIR du segment dans le fichier source.',
  segment_classification_unknown: 'Corriger la clé CIR ou importer la classification correspondante.',
  segment_ambiguous_link: 'Départager la liaison segment vers une seule clé CIR exploitable.',
  purchase_grid_missing: 'Compléter les champs de grille achat structurels dans le fichier source.',
  invalid_file: 'Remplacer le fichier par un export Excel valide.',
  parse_failed: 'Corriger la valeur brute dans la colonne indiquée.'
};

export const linkStatusLabels: Record<PricingReferenceLinkStatus, string> = {
  complete_valid: 'Complète valide',
  missing: 'Absente',
  partial: 'Partielle',
  unknown_key: 'Clé inconnue',
  ambiguous: 'Ambiguë'
};

const numberFormatter = new Intl.NumberFormat('fr-FR');
const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short'
});

/**
 * Format a number to French standard format.
 *
 * @param value The value to format.
 */
export const formatCount = (value: number | null | undefined): string =>
  typeof value === 'number' ? numberFormatter.format(value) : '-';

/**
 * Format a UTC ISO date string to French standard locale string.
 *
 * @param value The ISO string.
 */
export const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
};

/**
 * Get the styling variant for pricing import status badges.
 *
 * @param status The import status.
 */
export const getStatusVariant = (
  status: PricingReferenceImportStatus
): 'default' | 'secondary' | 'warning' | 'success' | 'destructive' | 'outline' => {
  if (status === 'analyse_ok' || status === 'pret_activation') return 'success';
  if (status === 'analyse_erreur' || status === 'rejete') return 'destructive';
  if (status === 'analyse_en_cours') return 'warning';
  return 'secondary';
};

/**
 * Get the styling variant for anomaly severity badges.
 *
 * @param severity The anomaly severity.
 */
export const getSeverityVariant = (
  severity: PricingReferenceAnomalySeverity
): 'default' | 'secondary' | 'warning' | 'success' | 'destructive' | 'outline' => {
  if (severity === 'bloquante' || severity === 'haute') return 'destructive';
  if (severity === 'moyenne') return 'warning';
  return 'secondary';
};
