import type { z } from 'zod/v4';
import type { motorCriterionSchema } from 'shared/schemas/configurator/motor.schema';

import { cn } from '@/lib/utils';
import {
  CONFIGURATOR_TONE_CELL,
  VERDICT_LABELS,
  VERDICT_TONES,
  compareVerdictSeverity
} from './configuratorVocabulary';
import { EvidenceDialog } from './EvidenceDialog';
import { FactValue } from './FactValue';

export type MotorCriterion = z.infer<typeof motorCriterionSchema>;

type CriteriaTableProps = {
  criteria: readonly MotorCriterion[];
  /** Titre accessible de la table, obligatoire pour distinguer plusieurs blocs. */
  caption: string;
  className?: string;
};

const formatDelta = (criterion: MotorCriterion): string | null => {
  if (criterion.calculated_clearance != null) {
    const formatted = new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: 2,
      signDisplay: 'exceptZero'
    }).format(criterion.calculated_clearance);
    return `jeu ${formatted}${criterion.unit ? ` ${criterion.unit}` : ''}`;
  }

  if (criterion.delta != null) {
    const formatted = new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: 2,
      signDisplay: 'exceptZero'
    }).format(criterion.delta);
    return `${formatted}${criterion.unit ? ` ${criterion.unit}` : ''}`;
  }

  return null;
};

const HEADER_CELL =
  'px-3 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground';

/**
 * Detail auditable, critere par critere.
 *
 * Troisieme et derniere couche de lecture d'un verdict : elle n'est jamais la
 * premiere chose montree, mais elle doit toujours etre atteignable. Chaque ligne
 * s'ouvre sur un filet plein qui reprend la couleur de la mosaique — la meme
 * matiere, du releve d'ensemble jusqu'au detail.
 *
 * Les criteres sont ranges par severite decroissante, puis les decisifs avant
 * les informatifs, pour que le premier ecran porte ce qui contraint la decision.
 */
export const CriteriaTable = ({ criteria, caption, className }: CriteriaTableProps) => {
  if (criteria.length === 0) {
    return (
      <p className={cn('text-[12px] text-muted-foreground', className)}>
        Aucun critère n’a été évalué.
      </p>
    );
  }

  const orderedCriteria = [...criteria].sort((left, right) => {
    const bySeverity = compareVerdictSeverity(left.status, right.status);
    if (bySeverity !== 0) return bySeverity;
    if (left.blocking !== right.blocking) return left.blocking ? -1 : 1;
    return left.label.localeCompare(right.label, 'fr');
  });

  return (
    <div className={cn('overflow-x-auto border border-border bg-card', className)}>
      <table className="w-full min-w-[46rem] border-collapse text-[12px]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border bg-surface-1 text-left">
            <th scope="col" className={cn(HEADER_CELL, 'pl-4')}>
              Critère
            </th>
            <th scope="col" className={cn(HEADER_CELL, 'text-right')}>
              Attendu
            </th>
            <th scope="col" className={cn(HEADER_CELL, 'text-right')}>
              Observé
            </th>
            <th scope="col" className={cn(HEADER_CELL, 'text-right')}>
              Écart
            </th>
            <th scope="col" className={cn(HEADER_CELL, 'pr-4 text-right')}>
              Preuves
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {orderedCriteria.map((criterion) => {
            const delta = formatDelta(criterion);
            const tone = VERDICT_TONES[criterion.status];
            return (
              <tr
                key={criterion.code}
                className="align-top transition-colors duration-100 hover:bg-surface-1 motion-reduce:transition-none"
                data-verdict={criterion.status}
              >
                <th scope="row" className="py-2.5 pl-4 pr-3 text-left font-normal">
                  <div className="flex gap-2.5">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mt-0.5 w-1 shrink-0',
                        criterion.blocking ? 'h-4' : 'h-2',
                        CONFIGURATOR_TONE_CELL[tone]
                      )}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-[13px] font-medium text-foreground">
                          {criterion.label}
                        </span>
                        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                          {VERDICT_LABELS[criterion.status]}
                          {criterion.blocking ? ' · décisif' : ''}
                        </span>
                      </div>
                      <p className="mt-0.5 max-w-prose text-[12px] leading-snug text-muted-foreground">
                        {criterion.explanation}
                      </p>
                      {criterion.affected_by_issue_codes.length > 0 ? (
                        <p className="mt-1 font-mono text-[11px] text-warning-strong">
                          {criterion.affected_by_issue_codes.join(' · ')}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </th>
                <td className="px-3 py-2.5 text-right">
                  <FactValue
                    value={criterion.expected}
                    unit={criterion.unit}
                    absenceReason="not_applicable"
                  />
                  {criterion.tolerance != null ? (
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      ± {criterion.tolerance}
                      {criterion.unit ? ` ${criterion.unit}` : ''}
                    </p>
                  ) : null}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <FactValue
                    value={criterion.observed}
                    unit={criterion.unit}
                    absenceReason="not_published"
                  />
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-[12px] tabular-nums text-foreground">
                  {delta ?? <span className="text-muted-foreground">—</span>}
                </td>
                <td className="py-2.5 pl-3 pr-4 text-right">
                  <EvidenceDialog
                    title={criterion.label}
                    evidence={criterion.evidence}
                    className="justify-end"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
