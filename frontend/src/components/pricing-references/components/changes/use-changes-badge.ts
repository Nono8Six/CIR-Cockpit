import { resolveDefaultTargetImportId } from './changes-utils';
import { useAnalyzedPricingReferenceImports } from './use-analyzed-imports';
import { usePricingReferenceDiffSummary } from './use-diff-summary';
import { usePricingReferenceImportSnapshotId } from './use-import-snapshot-id';

/**
 * Compteur de l'onglet Changements : total du run automatique de la cible par
 * défaut (import sélectionné dans la page, sinon dernier analysé). Null tant
 * qu'aucun run comparable n'existe ou pour un premier import de référence.
 */
export const usePricingReferenceChangesBadge = (
  selectedImportId: string | null
): number | null => {
  const { imports } = useAnalyzedPricingReferenceImports();
  const targetImportId = resolveDefaultTargetImportId(imports, selectedImportId);
  const { snapshotId } = usePricingReferenceImportSnapshotId(targetImportId);
  const summaryQuery = usePricingReferenceDiffSummary(
    snapshotId ? { target_snapshot_id: snapshotId } : null
  );

  const summary = summaryQuery.data;
  if (!summary || summary.initial_import) return null;
  return summary.total;
};
