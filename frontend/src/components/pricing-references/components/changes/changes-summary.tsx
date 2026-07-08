import type {
  PricingReferenceDiffObjectType,
  PricingReferenceDiffType,
  PricingReferenceDiffsSummaryResponse
} from '../../../../../../shared/schemas/pricing/references.schema';
import { cn } from '@/lib/utils';
import { diffObjectTypeLabels, formatCount } from '../../utils/pricing-references-formatters';
import {
  DIFF_TYPE_ORDER,
  FINANCIAL_DIFF_COLUMNS,
  columnBelongsToFileScope,
  diffTypeDotClassName,
  getDiffMatrixCount,
  getFileScopeObjectTypes,
  hasGrilleIdentitySwapPattern,
  isFinancialDiffColumn,
  sortDiffChangedColumnSummaries,
  type PricingReferenceDiffFileScope
} from './changes-utils';

interface ChangesSummaryProps {
  summary: PricingReferenceDiffsSummaryResponse;
  fileScope: PricingReferenceDiffFileScope;
  activeColumns: readonly string[];
  onSelectMatrixCell: (
    objectType: PricingReferenceDiffObjectType,
    diffType: PricingReferenceDiffType
  ) => void;
  onToggleColumn: (column: string) => void;
}

const MAX_OTHER_COLUMN_SHORTCUTS = 6;

const matrixCellLabels: Record<PricingReferenceDiffType, [string, string]> = {
  ajoute: ['ajouté', 'ajoutés'],
  supprime: ['supprimé', 'supprimés'],
  modifie: ['modifié', 'modifiés'],
  anomalie_apparue: ['apparue', 'apparues'],
  anomalie_disparue: ['disparue', 'disparues']
};

const formatMatrixCellLabel = (diffType: PricingReferenceDiffType, count: number): string =>
  matrixCellLabels[diffType][count > 1 ? 1 : 0];

/**
 * Bandeau résumé des impacts, cadré sur le fichier du périmètre courant :
 * compteurs object_type × diff_type cliquables (dot + texte, décision D7),
 * raccourcis colonnes financières (segments uniquement) puis top colonnes
 * modifiées du fichier, alertes de déviation D2 non bloquantes et aide D3 pour
 * les grilles. Les colonnes et types de l'autre fichier ne sont jamais montrés.
 */
export const ChangesSummary = ({
  summary,
  fileScope,
  activeColumns,
  onSelectMatrixCell,
  onToggleColumn
}: ChangesSummaryProps) => {
  const scopeObjectTypes = getFileScopeObjectTypes(fileScope);
  const matrixRows = scopeObjectTypes
    .map((objectType) => ({
      objectType,
      cells: DIFF_TYPE_ORDER.map((diffType) => ({
        diffType,
        count: getDiffMatrixCount(summary, objectType, diffType)
      })).filter((cell) => cell.count > 0)
    }))
    .filter((row) => row.cells.length > 0);

  const scopedColumns = sortDiffChangedColumnSummaries(summary.changed_columns).filter((entry) =>
    columnBelongsToFileScope(entry.column, fileScope)
  );
  const showFinancial = fileScope === 'segments_grids';
  const financialColumns = showFinancial
    ? FINANCIAL_DIFF_COLUMNS.map((column) => ({
        column,
        count: scopedColumns.find((entry) => entry.column === column)?.count ?? 0
      }))
    : [];
  const otherColumns = scopedColumns
    .filter((entry) => !isFinancialDiffColumn(entry.column))
    .slice(0, MAX_OTHER_COLUMN_SHORTCUTS);

  const deviationAlerts = summary.deviation_alerts.filter((alert) =>
    scopeObjectTypes.includes(alert.object_type)
  );
  const showGrilleSwapHelp = showFinancial && hasGrilleIdentitySwapPattern(summary);

  const columnChip = (column: string, count: number) => {
    const isActive = activeColumns.includes(column);
    const isEmpty = count === 0;
    return (
      <button
        key={column}
        type="button"
        disabled={isEmpty}
        aria-pressed={isActive}
        aria-label={`Filtrer la liste sur la colonne ${column} (${formatCount(count)} changements)`}
        onClick={() => onToggleColumn(column)}
        className={cn(
          'inline-flex h-6 items-center gap-1.5 rounded-md border px-2 font-mono text-[11px] tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/45',
          isActive
            ? 'border-stone-400 bg-surface-1 text-stone-950'
            : 'border-stone-200 text-stone-600 hover:border-stone-300 hover:text-stone-900',
          isEmpty && 'cursor-default border-stone-100 text-stone-300 hover:border-stone-100 hover:text-stone-300'
        )}
      >
        {column}
        <span className={cn('tabular-nums', isEmpty ? 'text-stone-300' : 'text-stone-400')}>
          {formatCount(count)}
        </span>
      </button>
    );
  };

  return (
    <div className="shrink-0 border-b border-stone-200/60 px-4 py-3">
      <div className="flex flex-col gap-x-8 gap-y-3 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-stone-400">
            Impacts
          </p>
          <div className="mt-1.5 space-y-1">
            {matrixRows.map((row) => (
              <div
                key={row.objectType}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5"
              >
                <span className="w-28 shrink-0 text-xs font-medium text-stone-950">
                  {diffObjectTypeLabels[row.objectType]}
                </span>
                {row.cells.map((cell) => (
                  <button
                    key={cell.diffType}
                    type="button"
                    onClick={() => onSelectMatrixCell(row.objectType, cell.diffType)}
                    aria-label={`Voir les changements : ${diffObjectTypeLabels[row.objectType]}, ${formatCount(cell.count)} ${formatMatrixCellLabel(cell.diffType, cell.count)}`}
                    className="inline-flex items-center gap-1.5 rounded-sm text-xs transition-colors hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
                  >
                    <span
                      className={cn('size-1.5 rounded-full', diffTypeDotClassName[cell.diffType])}
                      aria-hidden="true"
                    />
                    <span className="font-mono text-xs tabular-nums text-stone-900">
                      {formatCount(cell.count)}
                    </span>
                    <span className="text-stone-500">
                      {formatMatrixCellLabel(cell.diffType, cell.count)}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {scopedColumns.length > 0 || showFinancial ? (
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-stone-500">
              Colonnes modifiées
              {showFinancial ? (
                <>
                  <span className="ml-2 font-mono text-[11px] tabular-nums text-stone-400">
                    {formatCount(summary.financial_changes_count)}
                  </span>{' '}
                  <span className="text-stone-400">changements financiers</span>
                </>
              ) : null}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {financialColumns.map((entry) => columnChip(entry.column, entry.count))}
              {financialColumns.length > 0 && otherColumns.length > 0 ? (
                <span className="mx-0.5 h-4 w-px bg-stone-200" aria-hidden="true" />
              ) : null}
              {otherColumns.map((entry) => columnChip(entry.column, entry.count))}
            </div>
          </div>
        ) : null}
      </div>

      {deviationAlerts.map((alert) => (
        <p
          key={alert.object_type}
          className="mt-2.5 flex items-start gap-1.5 text-xs leading-relaxed text-amber-800"
        >
          <span className="mt-1 size-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
          {alert.message}
        </p>
      ))}

      {showGrilleSwapHelp ? (
        <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
          Grilles achat : un changement de priorité ou de dates modifie l&apos;identité de la
          ligne. Il apparaît donc en suppression + ajout, pas en modification.
        </p>
      ) : null}
    </div>
  );
};
