import type { ReactNode } from 'react';

import { AlertTriangle, CheckCircle2, ContactRound, Database, ListChecks } from 'lucide-react';

import { cn } from '@/lib/utils';

type EntityEditSummaryRailProps = {
  dirtyLabels: string[];
  errorLabels: string[];
  isOfficialLocked: boolean;
  primaryContactLabel: string | null;
  className?: string;
};

const SummaryBlock = ({
  children,
  icon,
  title
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) => (
  <section className="border-t border-border py-4 first:border-t-0 first:pt-0">
    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {icon}
      <span>{title}</span>
    </div>
    {children}
  </section>
);

const EntityEditSummaryRail = ({
  dirtyLabels,
  errorLabels,
  isOfficialLocked,
  primaryContactLabel,
  className
}: EntityEditSummaryRailProps) => (
  <aside className={cn('text-sm', className)} aria-label="Résumé des changements">
    <SummaryBlock title="Changements" icon={<ListChecks aria-hidden="true" />}>
      {dirtyLabels.length > 0 ? (
        <ul className="grid gap-2">
          {dirtyLabels.map((label) => (
            <li
              key={label}
              className="flex items-center justify-between gap-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground"
            >
              <span className="truncate">{label}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs leading-5 text-muted-foreground">Aucune modification en cours.</p>
      )}
    </SummaryBlock>

    <SummaryBlock title="Erreurs" icon={<AlertTriangle aria-hidden="true" />}>
      {errorLabels.length > 0 ? (
        <ul className="grid gap-2">
          {errorLabels.map((label) => (
            <li key={label} className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {label}
            </li>
          ))}
        </ul>
      ) : (
        <p className="flex items-center gap-2 text-xs leading-5 text-muted-foreground">
          <CheckCircle2 aria-hidden="true" />
          Aucun blocage détecté.
        </p>
      )}
    </SummaryBlock>

    <SummaryBlock title="Données officielles" icon={<Database aria-hidden="true" />}>
      <p className="text-xs leading-5 text-muted-foreground">
        {isOfficialLocked
          ? 'SIRET, SIREN, NAF et nom officiel verrouillés car synchronisés.'
          : 'Fiche manuelle : données officielles éditables.'}
      </p>
    </SummaryBlock>

    <SummaryBlock title="Contact principal" icon={<ContactRound aria-hidden="true" />}>
      <p className="text-xs leading-5 text-muted-foreground">
        {primaryContactLabel ?? 'Aucun contact principal explicite.'}
      </p>
    </SummaryBlock>
  </aside>
);

export default EntityEditSummaryRail;
