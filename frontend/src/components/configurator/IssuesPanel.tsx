import { Info, ShieldAlert, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { z } from 'zod/v4';
import type { motorValidationIssueSchema } from 'shared/schemas/configurator/motor.schema';

import { cn } from '@/lib/utils';
import {
  CONFIGURATOR_TONE_CHIP,
  ISSUE_SEVERITY_LABELS,
  ISSUE_SEVERITY_TONES
} from './configuratorVocabulary';
import { EvidenceDialog } from './EvidenceDialog';
import { TechLabel } from './TechLabel';

export type MotorValidationIssue = z.infer<typeof motorValidationIssueSchema>;

const SEVERITY_ICONS: Record<MotorValidationIssue['severity'], LucideIcon> = {
  error: ShieldAlert,
  warning: TriangleAlert,
  info: Info
};

const SEVERITY_ORDER: Record<MotorValidationIssue['severity'], number> = {
  error: 0,
  warning: 1,
  info: 2
};

type IssuesPanelProps = {
  issues: readonly MotorValidationIssue[];
  className?: string;
};

/**
 * Anomalies du catalogue technique portant sur ce moteur.
 *
 * Une anomalie n'exclut jamais un candidat : elle restreint ce qu'on peut en
 * affirmer. La restriction est donc rendue comme un bloc a filet, au meme rang
 * que le message, et jamais repliee.
 */
export const IssuesPanel = ({ issues, className }: IssuesPanelProps) => {
  if (issues.length === 0) {
    return null;
  }

  const sortedIssues = [...issues].sort(
    (left, right) => SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity]
  );

  return (
    <section
      className={cn('tech-raised overflow-hidden rounded-xl bg-card', className)}
      aria-label="Anomalies du catalogue"
    >
      <div className="border-b border-border-subtle px-4 py-3">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[15px] font-semibold tabular-nums text-foreground">
            {issues.length}
          </span>
          <TechLabel className="flex-1">Anomalies du catalogue</TechLabel>
        </div>
        <p className="mt-1.5 text-[12px] leading-snug text-muted-foreground">
          Une anomalie n’exclut pas ce moteur : elle limite ce qui peut en être affirmé.
        </p>
      </div>
      <ul className="divide-y divide-border-subtle">
        {sortedIssues.map((issue) => {
          const Icon = SEVERITY_ICONS[issue.severity];
          const tone = ISSUE_SEVERITY_TONES[issue.severity];
          return (
            <li key={issue.code} className="px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium',
                      CONFIGURATOR_TONE_CHIP[tone]
                    )}
                  >
                    <Icon aria-hidden="true" className="size-3 shrink-0" />
                    {ISSUE_SEVERITY_LABELS[issue.severity]}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">{issue.code}</span>
                </div>
                <p className="mt-1.5 max-w-prose text-[12px] leading-snug text-foreground">
                  {issue.message}
                </p>
                {issue.restriction ? (
                  <p className="mt-2 rounded-lg bg-warning/[0.09] px-2.5 py-1.5 text-[12px] leading-snug text-warning-strong">
                    <span className="font-semibold">Restriction — </span>
                    {issue.restriction}
                  </p>
                ) : null}
                <EvidenceDialog
                  className="mt-2"
                  title={`Anomalie ${issue.code}`}
                  evidence={issue.evidence}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
