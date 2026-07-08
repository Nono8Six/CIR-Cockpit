import type {
  PricingReferenceAnomalySeverity,
  PricingReferenceDiffObjectType,
  PricingReferenceDiffRow,
  PricingReferenceDiffType,
  PricingReferenceDiffsSummaryResponse,
  PricingReferenceFileKind,
  PricingReferenceImportsListResponse
} from '../../../../../../shared/schemas/pricing/references.schema';
import { anomalySeverityRank } from '../anomalies/anomaly-utils';
import { formatDateTime, sortEffectiveImportFiles } from '../../utils/pricing-references-formatters';

export type PricingReferenceImportSummaryRow =
  PricingReferenceImportsListResponse['imports'][number];

export const DIFF_OBJECT_TYPE_ORDER: readonly PricingReferenceDiffObjectType[] = [
  'classification',
  'segment',
  'liaison',
  'grille',
  'anomalie'
];

export const DIFF_TYPE_ORDER: readonly PricingReferenceDiffType[] = [
  'modifie',
  'supprime',
  'ajoute',
  'anomalie_apparue',
  'anomalie_disparue'
];

/**
 * Fichier source d'un changement. Le référentiel est alimenté par DEUX fichiers
 * importés distincts : la classification produit CIR et les segments & grilles
 * fabricant. Les changements ne doivent jamais être mélangés entre les deux ;
 * les anomalies sont transverses aux deux fichiers, isolées à part.
 */
export type PricingReferenceDiffFileGroup = 'classification' | 'segments_grids' | 'anomalie';

export const DIFF_FILE_GROUP_ORDER: readonly PricingReferenceDiffFileGroup[] = [
  'classification',
  'segments_grids',
  'anomalie'
];

/** Type d'objet du diff → fichier source qui le porte. */
export const diffObjectTypeFileGroup: Record<
  PricingReferenceDiffObjectType,
  PricingReferenceDiffFileGroup
> = {
  classification: 'classification',
  segment: 'segments_grids',
  liaison: 'segments_grids',
  grille: 'segments_grids',
  anomalie: 'anomalie'
};

/** Intitulé de section = nom du fichier importé (ou catégorie transverse). */
export const diffFileGroupLabels: Record<PricingReferenceDiffFileGroup, string> = {
  classification: 'Classification produit CIR',
  segments_grids: 'Segments & grilles fabricant',
  anomalie: 'Anomalies'
};

/**
 * Périmètre de comparaison de l'onglet Changements : UN fichier importé à la
 * fois. On compare classification↔classification ou segments↔segments, jamais
 * les deux mélangés. Les anomalies (transverses) ne sont pas un périmètre.
 */
export type PricingReferenceDiffFileScope = PricingReferenceFileKind;

export const DIFF_FILE_SCOPE_ORDER: readonly PricingReferenceDiffFileScope[] = [
  'classification',
  'segments_grids'
];

/** Types d'objet du diff appartenant au fichier de ce périmètre. */
export const getFileScopeObjectTypes = (
  fileScope: PricingReferenceDiffFileScope
): PricingReferenceDiffObjectType[] =>
  DIFF_OBJECT_TYPE_ORDER.filter((objectType) => diffObjectTypeFileGroup[objectType] === fileScope);

/**
 * Colonnes de diff propres au fichier de classification (le reste des colonnes
 * appartient aux segments & grilles). Sert à ne montrer, dans le résumé, que les
 * colonnes du fichier en cours de comparaison.
 */
const CLASSIFICATION_DIFF_COLUMNS = new Set<string>([
  'mega',
  'fam',
  'sfa',
  'mega_lib',
  'fam_lib',
  'sfa_lib'
]);

export const columnBelongsToFileScope = (
  column: string,
  fileScope: PricingReferenceDiffFileScope
): boolean =>
  fileScope === 'classification'
    ? CLASSIFICATION_DIFF_COLUMNS.has(column)
    : !CLASSIFICATION_DIFF_COLUMNS.has(column);

export interface PricingReferenceFileVersion {
  importId: string;
  filename: string;
  sha256: string;
  date: string;
}

/**
 * Versions DISTINCTES d'un fichier importé (dédupliquées par SHA-256), la plus
 * récente d'abord. Deux imports qui réutilisent le même fichier ne produisent
 * qu'une entrée : on compare des versions de fichier, pas des imports.
 */
export const listDistinctFileVersions = (
  imports: readonly PricingReferenceImportSummaryRow[],
  fileKind: PricingReferenceFileKind
): PricingReferenceFileVersion[] => {
  const seen = new Set<string>();
  const versions: PricingReferenceFileVersion[] = [];
  for (const row of imports) {
    const file = row.files.find((entry) => entry.file_kind === fileKind);
    if (!file || seen.has(file.sha256)) continue;
    seen.add(file.sha256);
    versions.push({
      importId: row.id,
      filename: file.original_filename,
      sha256: file.sha256,
      date: row.analysis_completed_at ?? row.created_at
    });
  }
  return versions;
};

export const formatFileVersionLabel = (version: PricingReferenceFileVersion): string =>
  `${version.filename} · ${formatDateTime(version.date)}`;

/**
 * Version cible par défaut d'un périmètre : celle portée par l'import
 * sélectionné dans la page si elle existe, sinon la version la plus récente.
 */
export const resolveDefaultScopedTargetImportId = (
  fileVersions: readonly PricingReferenceFileVersion[],
  imports: readonly PricingReferenceImportSummaryRow[],
  fileKind: PricingReferenceFileKind,
  selectedImportId: string | null | undefined
): string | null => {
  if (selectedImportId) {
    const selected = imports.find((row) => row.id === selectedImportId);
    const sha = selected?.files.find((entry) => entry.file_kind === fileKind)?.sha256;
    const match = sha ? fileVersions.find((version) => version.sha256 === sha) : undefined;
    if (match) return match.importId;
  }
  return fileVersions[0]?.importId ?? null;
};

/**
 * Compteurs de changements par fichier source × type de changement, dérivés du
 * résumé. Sert au mini-résumé du flux d'import pour ventiler les changements
 * fichier par fichier plutôt que de tout agréger.
 */
export const aggregateDiffTypeCountsByFileGroup = (
  summary: PricingReferenceDiffsSummaryResponse
): Array<{
  fileGroup: PricingReferenceDiffFileGroup;
  total: number;
  cells: Array<{ diff_type: PricingReferenceDiffType; count: number }>;
}> =>
  DIFF_FILE_GROUP_ORDER.map((fileGroup) => {
    const cells = DIFF_TYPE_ORDER.map((diffType) => ({
      diff_type: diffType,
      count: summary.counts_by_type
        .filter(
          (cell) =>
            cell.diff_type === diffType &&
            diffObjectTypeFileGroup[cell.object_type] === fileGroup
        )
        .reduce((total, cell) => total + cell.count, 0)
    })).filter((entry) => entry.count > 0);
    return { fileGroup, total: cells.reduce((sum, entry) => sum + entry.count, 0), cells };
  }).filter((group) => group.total > 0);

/** Décision D7 : ajouté = émeraude, supprimé = rouge, modifié = ambre — dot 6 px + texte, jamais d'aplat. */
export const diffTypeDotClassName: Record<PricingReferenceDiffType, string> = {
  ajoute: 'bg-emerald-500',
  supprime: 'bg-red-500',
  modifie: 'bg-amber-500',
  anomalie_apparue: 'bg-amber-500',
  anomalie_disparue: 'bg-emerald-500'
};

/** Libellé singulier pour le dialog de détail (« Grille achat · Supprimé »). */
export const diffObjectTypeSingularLabels: Record<PricingReferenceDiffObjectType, string> = {
  classification: 'Classification',
  segment: 'Segment',
  liaison: 'Liaison',
  grille: 'Grille achat',
  anomalie: 'Anomalie'
};

/** Libellé court de ligne : dans un groupe Anomalies, « Apparue » suffit. */
export const diffTypeShortLabels: Record<PricingReferenceDiffType, string> = {
  ajoute: 'Ajouté',
  supprime: 'Supprimé',
  modifie: 'Modifié',
  anomalie_apparue: 'Apparue',
  anomalie_disparue: 'Disparue'
};

export const FINANCIAL_DIFF_COLUMNS = [
  'remise_ha',
  'coef_retro',
  'coef_ha',
  'coef_majvte'
] as const;

const financialColumnRank = new Map<string, number>(
  FINANCIAL_DIFF_COLUMNS.map((column, index) => [column, index])
);

export const isFinancialDiffColumn = (column: string): boolean =>
  financialColumnRank.has(column);

/**
 * Ordonne les colonnes impactées : colonnes financières d'abord (ordre métier fixe),
 * puis les autres par occurrences décroissantes — réduit le bruit des libellés.
 */
export const sortDiffChangedColumnSummaries = <T extends { column: string; count: number }>(
  entries: readonly T[]
): T[] =>
  [...entries].sort((a, b) => {
    const aRank = financialColumnRank.get(a.column);
    const bRank = financialColumnRank.get(b.column);
    if (aRank !== undefined || bRank !== undefined) {
      return (
        (aRank ?? Number.MAX_SAFE_INTEGER) - (bRank ?? Number.MAX_SAFE_INTEGER) ||
        b.count - a.count
      );
    }
    return b.count - a.count || a.column.localeCompare(b.column);
  });

/**
 * Convertit une valeur normalisée du payload de diff en texte affichable.
 *
 * @param value Valeur JSON issue de payload.before / payload.after / payload.labels.
 */
export const toDiffDisplayValue = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
};

export const getDiffLabel = (row: PricingReferenceDiffRow, key: string): string | null =>
  toDiffDisplayValue(row.payload.labels[key]);

export interface DiffRowContext {
  marque: string | null;
  description: string | null;
}

/**
 * Contexte lisible d'une ligne de diff (marque, libellé), dérivé du payload
 * autoportant renvoyé par le backend selon le type d'objet.
 */
export const getDiffRowContext = (row: PricingReferenceDiffRow): DiffRowContext => {
  const record = row.payload.after ?? row.payload.before;
  if (row.object_type === 'anomalie') {
    return {
      marque: null,
      description: record ? toDiffDisplayValue(record.message) : null
    };
  }
  if (row.object_type === 'classification') {
    const description = record
      ? toDiffDisplayValue(record.sfa_lib) ??
        toDiffDisplayValue(record.fam_lib) ??
        toDiffDisplayValue(record.mega_lib)
      : null;
    return { marque: null, description };
  }
  const segment = getDiffLabel(row, 'segment');
  const catFab = getDiffLabel(row, 'cat_fab');
  return {
    marque: getDiffLabel(row, 'marque'),
    description: [segment, catFab].filter(Boolean).join(' · ') || null
  };
};

export interface DiffColumnChange {
  column: string;
  before: string | null;
  after: string | null;
}

/**
 * Avant/après par colonne changée, colonnes financières en tête.
 * Les diffs d'anomalies portent un payload dédié et n'exposent pas de colonnes.
 */
export const getDiffColumnChanges = (row: PricingReferenceDiffRow): DiffColumnChange[] => {
  if (row.object_type === 'anomalie') return [];
  return row.payload.changed_columns
    .map((column) => ({
      column,
      before: row.payload.before ? toDiffDisplayValue(row.payload.before[column]) : null,
      after: row.payload.after ? toDiffDisplayValue(row.payload.after[column]) : null
    }))
    .sort(
      (a, b) =>
        (financialColumnRank.get(a.column) ?? Number.MAX_SAFE_INTEGER) -
        (financialColumnRank.get(b.column) ?? Number.MAX_SAFE_INTEGER)
    );
};

export const formatDiffColumnPreview = (change: DiffColumnChange): string => {
  if (change.before !== null && change.after !== null) {
    return `${change.column} ${change.before}→${change.after}`;
  }
  if (change.after !== null) return `${change.column} ${change.after}`;
  if (change.before !== null) return `${change.column} ${change.before}`;
  return change.column;
};

/**
 * Cible par défaut de la comparaison : l'import sélectionné dans la page s'il est
 * analysé, sinon le dernier import analysé.
 */
export const resolveDefaultTargetImportId = (
  imports: readonly PricingReferenceImportSummaryRow[],
  selectedImportId: string | null | undefined
): string | null => {
  if (selectedImportId && imports.some((row) => row.id === selectedImportId)) {
    return selectedImportId;
  }
  return imports[0]?.id ?? null;
};

export const formatImportVersionLabel = (row: PricingReferenceImportSummaryRow): string => {
  const date = formatDateTime(row.analysis_completed_at ?? row.created_at);
  const files = sortEffectiveImportFiles(row.files)
    .map((file) => file.original_filename)
    .join(' · ');
  return files ? `Import du ${date} · ${files}` : `Import du ${date}`;
};

export const getDiffMatrixCount = (
  summary: PricingReferenceDiffsSummaryResponse,
  objectType: PricingReferenceDiffObjectType,
  diffType: PricingReferenceDiffType
): number =>
  summary.counts_by_type.find(
    (cell) => cell.object_type === objectType && cell.diff_type === diffType
  )?.count ?? 0;

export const aggregateDiffTypeCounts = (
  summary: PricingReferenceDiffsSummaryResponse
): Array<{ diff_type: PricingReferenceDiffType; count: number }> =>
  DIFF_TYPE_ORDER.map((diffType) => ({
    diff_type: diffType,
    count: summary.counts_by_type
      .filter((cell) => cell.diff_type === diffType)
      .reduce((total, cell) => total + cell.count, 0)
  })).filter((entry) => entry.count > 0);

export const aggregateDiffSeverityCounts = (
  summary: PricingReferenceDiffsSummaryResponse
): Array<{ severity: PricingReferenceAnomalySeverity; count: number }> => {
  const totals = new Map<PricingReferenceAnomalySeverity, number>();
  summary.counts_by_object_type.forEach((objectSummary) => {
    objectSummary.by_severity.forEach((entry) => {
      totals.set(entry.severity, (totals.get(entry.severity) ?? 0) + entry.count);
    });
  });
  return [...totals.entries()]
    .map(([severity, count]) => ({ severity, count }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => anomalySeverityRank[b.severity] - anomalySeverityRank[a.severity]);
};

/**
 * Cas D3 : un changement de priorité ou de dates change l'identité d'une grille et
 * apparaît en suppression + ajout. L'aide n'est affichée que quand le motif existe.
 */
export const hasGrilleIdentitySwapPattern = (
  summary: PricingReferenceDiffsSummaryResponse
): boolean =>
  getDiffMatrixCount(summary, 'grille', 'ajoute') > 0 &&
  getDiffMatrixCount(summary, 'grille', 'supprime') > 0;
