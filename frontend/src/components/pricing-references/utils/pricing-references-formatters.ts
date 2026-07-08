import type {
  PricingReferenceAnomalyType,
  PricingReferenceDiffObjectType,
  PricingReferenceDiffType,
  PricingReferenceEffectiveImportFile,
  PricingReferenceFileKind,
  PricingReferenceAnomalySeverity,
  PricingReferenceImportMappingStatus,
  PricingReferenceImportStatus,
  PricingReferenceLinkStatus,
  PricingReferenceSnapshotStatus
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

export const fileKindShortLabels: Record<PricingReferenceFileKind, string> = {
  classification: 'Classification',
  segments_grids: 'Segments & grilles'
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

export const importMappingStatusLabels: Record<PricingReferenceImportMappingStatus, string> = {
  non_configure: 'Mapping non configuré',
  auto: 'Mapping automatique',
  a_confirmer: 'Mapping à confirmer',
  confirme: 'Mapping confirmé',
  invalide: 'Mapping invalide'
};

export const diffTypeLabels: Record<PricingReferenceDiffType, string> = {
  ajoute: 'Ajouté',
  supprime: 'Supprimé',
  modifie: 'Modifié',
  anomalie_apparue: 'Anomalie apparue',
  anomalie_disparue: 'Anomalie disparue'
};

export const diffObjectTypeLabels: Record<PricingReferenceDiffObjectType, string> = {
  classification: 'Classification',
  segment: 'Segments',
  liaison: 'Liaisons',
  grille: 'Grilles achat',
  anomalie: 'Anomalies'
};

/**
 * Statut du snapshot de version, distinct du statut métier de l'import
 * (`importStatusLabels`) : un import reste « Analyse OK » quand sa version est
 * archivée par remplacement.
 */
export const snapshotVersionStatusLabels: Record<PricingReferenceSnapshotStatus, string> = {
  cree: 'Jamais activée',
  pret_activation: 'Prête à activer',
  actif: 'Active',
  archive: 'Archivée'
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

const fileSizeFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

/**
 * Format a byte count to a compact French unit (o, Ko, Mo).
 *
 * @param bytes The size in bytes.
 */
export const formatFileSize = (bytes: number | null | undefined): string => {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes)) return '-';
  if (bytes < 1024) return `${numberFormatter.format(bytes)} o`;
  if (bytes < 1024 * 1024) return `${fileSizeFormatter.format(bytes / 1024)} Ko`;
  return `${fileSizeFormatter.format(bytes / (1024 * 1024))} Mo`;
};

const fileKindDisplayOrder: Record<PricingReferenceFileKind, number> = {
  classification: 0,
  segments_grids: 1
};

/**
 * Sort effective import files in canonical display order (classification first).
 *
 * @param files The effective files of an import.
 */
export const sortEffectiveImportFiles = <T extends { file_kind: PricingReferenceFileKind }>(
  files: readonly T[]
): T[] =>
  [...files].sort((a, b) => fileKindDisplayOrder[a.file_kind] - fileKindDisplayOrder[b.file_kind]);

/**
 * Human-readable provenance of an effective import file (fourni vs réutilisé).
 *
 * @param file The effective file with its source metadata.
 */
export const formatEffectiveFileProvenance = (
  file: Pick<PricingReferenceEffectiveImportFile, 'source' | 'source_import_created_at'>
): string => {
  if (file.source === 'fourni') return 'Fourni dans cet import';
  return file.source_import_created_at
    ? `Réutilisé de l'import du ${formatDateTime(file.source_import_created_at)}`
    : "Réutilisé d'un import antérieur";
};

/**
 * Shorten a SHA-256 hash to its first 12 hex chars for inline display.
 *
 * @param value The full hash.
 */
export const formatSha256Short = (value: string): string =>
  value.length > 12 ? `${value.slice(0, 12)}…` : value;

type VersionChainRow = {
  id: string;
  activated_at: string | null;
  deactivated_at: string | null;
};

/**
 * Version qui a remplacé `current` : la bascule d'activation étant
 * transactionnelle, `deactivated_at` de l'ancienne version est strictement égal
 * à `activated_at` de la nouvelle. Sans égalité exacte dans les lignes
 * chargées, on ne devine pas : null.
 */
export const findReplacedByVersion = <T extends VersionChainRow>(
  rows: readonly T[],
  current: Pick<VersionChainRow, 'id' | 'deactivated_at'>
): T | null => {
  if (!current.deactivated_at) return null;
  return (
    rows.find((row) => row.id !== current.id && row.activated_at === current.deactivated_at) ?? null
  );
};

/**
 * Version que `current` a remplacée lors de son activation (même règle
 * d'égalité transactionnelle stricte que `findReplacedByVersion`).
 */
export const findReplacesVersion = <T extends VersionChainRow>(
  rows: readonly T[],
  current: Pick<VersionChainRow, 'id' | 'activated_at'>
): T | null => {
  if (!current.activated_at) return null;
  return (
    rows.find((row) => row.id !== current.id && row.deactivated_at === current.activated_at) ?? null
  );
};
