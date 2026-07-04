import type {
  PricingReferenceAnomaliesListResponse,
  PricingReferenceAnomalySeverity
} from '../../../../../../shared/schemas/pricing/references.schema';
import { fileKindLabels } from '../../utils/pricing-references-formatters';

type AnomalyRow = PricingReferenceAnomaliesListResponse['rows'][number];

export const EMPTY_VALUE = '-';

export const anomalySeverityToneClassName: Record<PricingReferenceAnomalySeverity, string> = {
  bloquante: 'border-rose-200/80 bg-rose-50 text-rose-700',
  haute: 'border-red-200/80 bg-red-50 text-red-700',
  moyenne: 'border-stone-200 bg-stone-100 text-stone-700',
  faible: 'border-slate-200 bg-slate-100 text-slate-600'
};

/**
 * Checks if a value is a record.
 * 
 * @param value The value to check.
 */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Converts a value to displayable string.
 * 
 * @param value The value to convert.
 */
export const toDisplayValue = (value: unknown): string | null => {
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
};

/**
 * Gets the raw_values from details object.
 * 
 * @param details Details record.
 */
export const getRawValues = (details: Record<string, unknown>): Record<string, unknown> => {
  const rawValues = details.raw_values;
  return isRecord(rawValues) ? rawValues : {};
};

export const excelFieldLabels: Record<string, string> = {
  NUM_FOUR: 'N° fournisseur',
  REMISE_HA: 'Remise achat',
  COL_HA: 'Colonne achat',
  PRIORITE: 'Priorité',
  TYPE_GRILL: 'Type de grille',
  DATE_DEBUT: 'Date début',
  DATE_FIN: 'Date fin',
  BORNE_ACHA: 'Borne achat',
  COEF_RETRO: 'Coefficient rétro',
  COEF_HA: 'Coefficient achat',
  COEF_MAJVTE: 'Coefficient majoration vente',
  MEGA: 'Mega',
  FAM: 'Famille',
  SFA: 'Sous-famille',
  MEGA_LIB: 'Libellé mega',
  FAM_LIB: 'Libellé famille',
  SFA_LIB: 'Libellé sous-famille',
  SEGMENT: 'Segment',
  IDNUMERIQUE: 'ID numérique',
  MARQUE: 'Marque',
  CAT_FAB: 'Catégorie fabricant',
  CAT_FAB_L: 'Libellé catégorie fabricant'
};

/**
 * Gets the label for an Excel field column.
 * 
 * @param column Column code.
 */
export const getExcelFieldLabel = (column: string): string => excelFieldLabels[column] ?? column;

/**
 * Parses segment key.
 * 
 * @param value Segment key string.
 */
export const parseSegmentKey = (value: unknown): Partial<{
  segment: string;
  idnumerique: string;
  marque: string;
  catFab: string;
}> => {
  const rawValue = toDisplayValue(value);
  if (!rawValue) return {};
  const [segment, idnumerique, marque, catFab] = rawValue.split('|');
  return {
    ...(segment ? { segment } : {}),
    ...(idnumerique ? { idnumerique } : {}),
    ...(marque ? { marque } : {}),
    ...(catFab ? { catFab } : {})
  };
};

/**
 * Gets the line context information for an anomaly.
 * 
 * @param row Anomaly row.
 */
export const getAnomalyLineContext = (row: AnomalyRow) => {
  const rawValues = getRawValues(row.details);
  const parsedKey = parseSegmentKey(row.details.segment_key ?? row.object_id);
  return {
    segment: toDisplayValue(rawValues.SEGMENT) ?? parsedKey.segment ?? null,
    idnumerique: toDisplayValue(rawValues.IDNUMERIQUE) ?? parsedKey.idnumerique ?? null,
    marque: toDisplayValue(rawValues.MARQUE) ?? parsedKey.marque ?? null,
    catFab: toDisplayValue(rawValues.CAT_FAB) ?? parsedKey.catFab ?? null,
    cirKey: toDisplayValue(row.details.cir_key) ?? toDisplayValue(row.details.classification_key)
      ?? toDisplayValue(rawValues.cir_key)
  };
};

/**
 * Gets source label for an anomaly.
 * 
 * @param row Anomaly row.
 */
export const getAnomalySourceLabel = (row: AnomalyRow): string => {
  if (!row.source_file) return EMPTY_VALUE;
  return `${fileKindLabels[row.source_file.file_kind]} - ${row.source_file.original_filename}`;
};

/**
 * Formats a detail value.
 * 
 * @param value Value to format.
 */
export const formatDetailValue = (value: unknown): string => {
  const displayValue = toDisplayValue(value);
  if (displayValue) return displayValue;
  if (Array.isArray(value)) return value.map(formatDetailValue).join(', ');
  if (isRecord(value)) return JSON.stringify(value);
  return EMPTY_VALUE;
};
