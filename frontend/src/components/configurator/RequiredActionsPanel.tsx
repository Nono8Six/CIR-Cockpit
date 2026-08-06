import { ClipboardCheck, Wrench } from 'lucide-react';

import type { z } from 'zod/v4';
import type { motorRequiredActionSchema } from 'shared/schemas/configurator/motor.schema';

import { cn } from '@/lib/utils';
import { EvidenceDialog } from './EvidenceDialog';
import { TechLabel } from './TechLabel';

export type MotorRequiredAction = z.infer<typeof motorRequiredActionSchema>;

type RequiredActionsPanelProps = {
  /** `adaptation` : un écart chiffré à corriger. `check` : un contrôle à mener. */
  kind: 'adaptation' | 'check';
  actions: readonly MotorRequiredAction[];
  className?: string;
};

const PANEL_CONFIG = {
  adaptation: {
    icon: Wrench,
    title: 'Adaptations nécessaires',
    rail: 'bg-destructive',
    accent: 'text-destructive'
  },
  check: {
    icon: ClipboardCheck,
    title: 'Contrôles à effectuer',
    rail: 'bg-warning',
    accent: 'text-warning-strong'
  }
} as const;

/**
 * Adaptations et controles renvoyes par le moteur de compatibilite.
 *
 * Ce sont les deux seules listes reellement actionnables d'un verdict : elles
 * remontent donc avant le detail critere par critere. Le filet vertical reprend
 * la couleur de l'etat qu'elles servent, sans repeindre le fond.
 */
export const RequiredActionsPanel = ({ kind, actions, className }: RequiredActionsPanelProps) => {
  if (actions.length === 0) {
    return null;
  }

  const config = PANEL_CONFIG[kind];
  const Icon = config.icon;

  return (
    <section
      className={cn('flex border border-border bg-card', className)}
      aria-label={config.title}
    >
      <span aria-hidden="true" className={cn('w-1 shrink-0', config.rail)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 border-b border-border px-4 py-2.5">
          <span className="font-mono text-[15px] font-semibold tabular-nums text-foreground">
            {actions.length}
          </span>
          <TechLabel className={cn('flex-1 gap-1.5', config.accent)}>
            <Icon aria-hidden="true" className="size-3.5 shrink-0" />
            {config.title}
          </TechLabel>
        </div>
        <ul className="divide-y divide-border">
          {actions.map((action) => (
            <li key={action.code} className="px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[13px] font-semibold text-foreground">{action.label}</p>
                <span className="font-mono text-[11px] text-muted-foreground">{action.code}</span>
              </div>
              <p className="mt-1 max-w-prose text-[12px] leading-snug text-muted-foreground">
                {action.explanation}
              </p>
              <EvidenceDialog className="mt-2" title={action.label} evidence={action.evidence} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
