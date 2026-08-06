import type { CriterionStatus } from 'shared/schemas/configurator/common.schema';

import { cn } from '@/lib/utils';
import { VERDICT_TONES } from './configuratorVocabulary';

const RING_STROKE_CLASS: Record<CriterionStatus, string> = {
  satisfied: 'stroke-success',
  under_reservation: 'stroke-warning',
  indeterminate: 'stroke-muted-foreground/45',
  not_satisfied: 'stroke-destructive'
};

type CoverageMeterProps = {
  /** Nombre de critères déjà établis. */
  established: number;
  /** Nombre total de critères applicables. */
  total: number;
  /**
   * Statut porté par l'anneau. Le frontend ne le déduit pas du ratio : il
   * reprend le verdict déjà rendu par le backend.
   */
  status: CriterionStatus;
  label: string;
  className?: string;
};

const RADIUS = 7;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Couverture d'un candidat : un anneau compact et la fraction exacte.
 *
 * L'anneau ne dit jamais « 78 % de compatibilite » — ce chiffre n'existe pas.
 * Il dit combien de criteres applicables sont etablis sur combien, ce qui est
 * un fait. La couleur reprend le verdict deja rendu par le backend et n'est
 * jamais deduite du ratio.
 */
export const CoverageMeter = ({
  established,
  total,
  status,
  label,
  className
}: CoverageMeterProps) => {
  const safeTotal = Math.max(0, total);
  const safeEstablished = Math.min(Math.max(0, established), safeTotal);
  const ratio = safeTotal === 0 ? 0 : safeEstablished / safeTotal;

  return (
    <span
      className={cn('inline-flex items-center gap-1.5', className)}
      title={`${label} : ${safeEstablished} sur ${safeTotal}`}
      data-verdict={status}
      data-tone={VERDICT_TONES[status]}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 18 18"
        className="size-[18px] shrink-0 -rotate-90"
      >
        <circle
          cx="9"
          cy="9"
          r={RADIUS}
          fill="none"
          strokeWidth="2.5"
          className="stroke-surface-3"
        />
        <circle
          cx="9"
          cy="9"
          r={RADIUS}
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${String(CIRCUMFERENCE * ratio)} ${String(CIRCUMFERENCE)}`}
          className={cn(
            RING_STROKE_CLASS[status],
            'transition-[stroke-dasharray] duration-300 motion-reduce:transition-none'
          )}
        />
      </svg>
      <span className="font-mono text-[11px] tabular-nums text-foreground">
        {safeEstablished}
        <span className="text-muted-foreground">/{safeTotal}</span>
      </span>
      <span className="sr-only">
        {`${label} : ${safeEstablished} critères établis sur ${safeTotal}`}
      </span>
    </span>
  );
};
