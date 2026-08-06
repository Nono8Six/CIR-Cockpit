import type { CriterionStatus } from 'shared/schemas/configurator/common.schema';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/feedback/Tooltip';
import { cn } from '@/lib/utils';
import {
  CONFIGURATOR_TONE_CELL,
  VERDICT_LABELS,
  VERDICT_SEVERITY_ORDER,
  VERDICT_TONES
} from './configuratorVocabulary';

export type MosaicCell = {
  /** Identifiant du critère, unique dans la mosaïque. */
  code: string;
  label: string;
  status: CriterionStatus;
  /** Un critère décisif est rendu pleine hauteur, un critère informatif à mi-hauteur. */
  decisive: boolean;
};

type VerdictMosaicProps = {
  cells: readonly MosaicCell[];
  /** `md` sur une fiche candidat, `sm` dans une liste dense. */
  size?: 'sm' | 'md';
  className?: string;
};

const CELL_SIZES = {
  sm: { track: 'h-5', cell: 'w-2', gap: 'gap-px' },
  md: { track: 'h-7', cell: 'w-3', gap: 'gap-[2px]' }
} as const;

/**
 * Mosaique de verdict : une cellule pleine par critere, dans l'ordre de
 * severite decroissante.
 *
 * C'est la lecture la plus rapide d'un candidat : avant tout libelle, la bande
 * dit combien de criteres bloquent, combien manquent, combien passent. Un
 * critere indetermine n'est pas une couleur de plus mais une trame hachuree —
 * une absence ne se peint pas.
 *
 * Les criteres informatifs sont rendus a mi-hauteur : ils comptent, mais ils ne
 * pesent pas sur la decision et la bande doit le montrer sans les cacher.
 */
export const VerdictMosaic = ({ cells, size = 'md', className }: VerdictMosaicProps) => {
  if (cells.length === 0) {
    return null;
  }

  const dimensions = CELL_SIZES[size];
  const orderedCells = [...cells].sort((left, right) => {
    const bySeverity =
      VERDICT_SEVERITY_ORDER.indexOf(left.status) - VERDICT_SEVERITY_ORDER.indexOf(right.status);
    if (bySeverity !== 0) return bySeverity;
    if (left.decisive !== right.decisive) return left.decisive ? -1 : 1;
    return left.code.localeCompare(right.code, 'fr');
  });

  const counts = VERDICT_SEVERITY_ORDER.map((status) => ({
    status,
    count: cells.filter((cell) => cell.status === status).length
  })).filter((entry) => entry.count > 0);

  const summary = counts
    .map((entry) => `${entry.count} ${VERDICT_LABELS[entry.status].toLowerCase()}`)
    .join(', ');

  return (
    <div
      className={cn('flex items-end', dimensions.track, dimensions.gap, className)}
      role="img"
      aria-label={`${cells.length} critères évalués : ${summary}`}
    >
      {orderedCells.map((cell) => (
        <Tooltip key={cell.code}>
          <TooltipTrigger asChild>
            <span
              className={cn(
                dimensions.cell,
                cell.decisive ? 'h-full' : 'h-1/2',
                CONFIGURATOR_TONE_CELL[VERDICT_TONES[cell.status]],
                'shrink-0 rounded-[2px] transition-[filter] duration-150 hover:brightness-90 motion-reduce:transition-none'
              )}
              data-verdict={cell.status}
              data-decisive={cell.decisive}
            />
          </TooltipTrigger>
          <TooltipContent className="text-[11px]">
            <span className="font-medium">{cell.label}</span>
            {' — '}
            {VERDICT_LABELS[cell.status]}
            {cell.decisive ? '' : ' (informatif)'}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
};

type VerdictTallyProps = {
  cells: readonly MosaicCell[];
  className?: string;
};

/**
 * Decompte chiffre accompagnant la mosaique. Aucun total, aucun score : quatre
 * nombres bruts, dans le meme ordre de severite que la bande.
 */
export const VerdictTally = ({ cells, className }: VerdictTallyProps) => {
  const counts = VERDICT_SEVERITY_ORDER.map((status) => ({
    status,
    count: cells.filter((cell) => cell.status === status).length
  })).filter((entry) => entry.count > 0);

  if (counts.length === 0) {
    return null;
  }

  return (
    <ul className={cn('flex flex-wrap items-center gap-x-3 gap-y-1', className)}>
      {counts.map((entry) => (
        <li key={entry.status} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn(
              'size-2 shrink-0 rounded-[2px]',
              CONFIGURATOR_TONE_CELL[VERDICT_TONES[entry.status]]
            )}
          />
          <span className="font-mono text-[11px] tabular-nums text-foreground">
            {entry.count}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {VERDICT_LABELS[entry.status].toLowerCase()}
          </span>
        </li>
      ))}
    </ul>
  );
};
