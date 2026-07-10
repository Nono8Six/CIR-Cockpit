import { ArrowDown, ArrowUp, Check, Columns3, PanelLeft, PanelRight, RotateCcw, Rows3 } from 'lucide-react';
import type { ColumnPinningState, VisibilityState } from '@tanstack/react-table';

import { Button } from '@/components/ui/inputs/basic/Button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/navigation/Popover';
import { cn } from '@/lib/utils';
import {
  DEFAULT_SEGMENT_COLUMN_PINNING,
  DEFAULT_SEGMENT_COLUMN_SIZING,
  DEFAULT_SEGMENT_COLUMN_VISIBILITY,
  SEGMENT_COLUMN_GROUPS,
  getSegmentColumnConfig,
  normalizeSegmentColumnOrder,
  normalizeSegmentColumnVisibility,
  type SegmentGridDensity
} from './segment-grid-config';

interface SegmentsViewOptionsProps {
  density: SegmentGridDensity;
  columnVisibility: VisibilityState;
  columnOrder: string[];
  columnPinning: ColumnPinningState;
  onDensityChange: (density: SegmentGridDensity) => void;
  onColumnVisibilityChange: (visibility: VisibilityState) => void;
  onColumnOrderChange: (order: string[]) => void;
  onColumnPinningChange: (pinning: ColumnPinningState) => void;
  onColumnSizingChange: (sizing: Record<string, number>) => void;
}

const pinColumn = (
  pinning: ColumnPinningState,
  columnId: string,
  side: 'left' | 'right' | false
): ColumnPinningState => {
  const left = (pinning.left ?? []).filter((id) => id !== columnId);
  const right = (pinning.right ?? []).filter((id) => id !== columnId);
  if (side === 'left') left.push(columnId);
  if (side === 'right') right.push(columnId);
  return { left, right };
};

export const SegmentsViewOptions = ({
  density,
  columnVisibility,
  columnOrder,
  columnPinning,
  onDensityChange,
  onColumnVisibilityChange,
  onColumnOrderChange,
  onColumnPinningChange,
  onColumnSizingChange
}: SegmentsViewOptionsProps) => {
  const normalizedOrder = normalizeSegmentColumnOrder(columnOrder);

  const moveColumn = (columnId: string, direction: -1 | 1) => {
    const index = normalizedOrder.indexOf(columnId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= normalizedOrder.length) return;
    const nextOrder = [...normalizedOrder];
    [nextOrder[index], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[index]];
    onColumnOrderChange(nextOrder);
  };

  const resetColumns = () => {
    onColumnVisibilityChange(DEFAULT_SEGMENT_COLUMN_VISIBILITY);
    onColumnOrderChange(normalizeSegmentColumnOrder([]));
    onColumnSizingChange(DEFAULT_SEGMENT_COLUMN_SIZING);
    onColumnPinningChange(DEFAULT_SEGMENT_COLUMN_PINNING);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="toolbar" className="gap-1.5 px-3 text-xs shadow-none">
          <Columns3 className="size-3.5" aria-hidden="true" />
          Affichage
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[460px] max-w-[calc(100vw-1rem)] space-y-4 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Affichage segments</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Colonnes, ordre, pinning, largeur et densité de la grille.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={resetColumns}>
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Réinitialiser
          </Button>
        </div>

        <div className="rounded-lg border border-border/70 p-1">
          <div className="grid grid-cols-2 gap-1">
            {(['compact', 'comfortable'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={cn(
                  'inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground',
                  density === mode && 'bg-foreground text-background'
                )}
                onClick={() => onDensityChange(mode)}
              >
                <Rows3 className="size-3.5" aria-hidden="true" />
                {mode === 'compact' ? 'Compact' : 'Confort'}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[56vh] space-y-3 overflow-y-auto pr-1">
          {SEGMENT_COLUMN_GROUPS.map((group) => (
            <section key={group} className="space-y-1.5">
              <p className="px-1 text-[10px] font-semibold uppercase tracking-normal text-muted-foreground">
                {group}
              </p>
              <div className="space-y-1">
                {normalizedOrder
                  .map((columnId) => getSegmentColumnConfig(columnId))
                  .filter((column) => column?.group === group)
                  .map((column) => {
                    if (!column) return null;
                    const isVisible = columnVisibility[column.id] !== false;
                    const pinnedSide = (columnPinning.left ?? []).includes(column.id)
                      ? 'left'
                      : (columnPinning.right ?? []).includes(column.id)
                        ? 'right'
                        : false;
                    const index = normalizedOrder.indexOf(column.id);

                    return (
                      <div
                        key={column.id}
                        className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-1 rounded-lg border border-border/60 bg-background px-2 py-1.5"
                      >
                        <button
                          type="button"
                          className="flex min-w-0 items-center gap-2 text-left"
                          disabled={column.required}
                          onClick={() => {
                            onColumnVisibilityChange(normalizeSegmentColumnVisibility({
                              ...columnVisibility,
                              [column.id]: !isVisible
                            }));
                          }}
                        >
                          <span
                            className={cn(
                              'flex size-4 shrink-0 items-center justify-center rounded border border-border text-background',
                              isVisible && 'border-foreground bg-foreground',
                              column.required && 'opacity-65'
                            )}
                            aria-hidden="true"
                          >
                            {isVisible ? <Check className="size-3" /> : null}
                          </span>
                          <span className="min-w-0 truncate text-xs font-medium text-foreground">
                            {column.label}
                          </span>
                        </button>
                        <div className="flex items-center gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            disabled={index <= 0}
                            aria-label={`Déplacer ${column.label} vers le haut`}
                            onClick={() => moveColumn(column.id, -1)}
                          >
                            <ArrowUp className="size-3.5" aria-hidden="true" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            disabled={index >= normalizedOrder.length - 1}
                            aria-label={`Déplacer ${column.label} vers le bas`}
                            onClick={() => moveColumn(column.id, 1)}
                          >
                            <ArrowDown className="size-3.5" aria-hidden="true" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <Button
                            type="button"
                            variant={pinnedSide === 'left' ? 'secondary' : 'ghost'}
                            size="icon"
                            className="size-7"
                            aria-label={`Épingler ${column.label} à gauche`}
                            onClick={() => onColumnPinningChange(pinColumn(columnPinning, column.id, pinnedSide === 'left' ? false : 'left'))}
                          >
                            <PanelLeft className="size-3.5" aria-hidden="true" />
                          </Button>
                          <Button
                            type="button"
                            variant={pinnedSide === 'right' ? 'secondary' : 'ghost'}
                            size="icon"
                            className="size-7"
                            aria-label={`Épingler ${column.label} à droite`}
                            onClick={() => onColumnPinningChange(pinColumn(columnPinning, column.id, pinnedSide === 'right' ? false : 'right'))}
                          >
                            <PanelRight className="size-3.5" aria-hidden="true" />
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => onColumnSizingChange({ ...DEFAULT_SEGMENT_COLUMN_SIZING, [column.id]: column.size })}
                        >
                          Largeur
                        </Button>
                      </div>
                    );
                  })}
              </div>
            </section>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
