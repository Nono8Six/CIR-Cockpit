import { useState } from 'react';
import { Check, Inbox } from 'lucide-react';

import { getInteractionChannelIcon } from '@/components/interaction-card/InteractionChannelIcon';
import { cn } from '@/lib/utils';
import type { Interaction } from '@/types';
import type { MyDayGroups, MyDayView } from '@/utils/dashboard/dashboardAggregates';
import { formatTime } from '@/utils/date/formatTime';
import { toDate } from '@/utils/date/toDate';
import { getInteractionDisplayName } from '@/utils/interactions/getInteractionDisplayName';

type MyDayGroupKey = keyof MyDayGroups;

const DAY_MS = 24 * 60 * 60 * 1000;
const COLLAPSED_ROW_COUNT = 6;

const shortDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short'
});

const buildDueBadge = (interaction: Interaction, groupKey: MyDayGroupKey) => {
  if (groupKey === 'toPlan' || !interaction.reminder_at) {
    return (
      <span className="inline-flex items-center rounded-md bg-surface-2 px-2 py-0.5 text-[10.5px] font-semibold text-muted-foreground">
        Aucun rappel
      </span>
    );
  }

  if (groupKey === 'overdue') {
    const lateDays = Math.floor((Date.now() - toDate(interaction.reminder_at).getTime()) / DAY_MS);
    return (
      <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[10.5px] font-bold text-primary">
        {lateDays >= 1 ? `${lateDays} j retard` : 'En retard'}
      </span>
    );
  }

  if (groupKey === 'dueToday') {
    return (
      <span className="inline-flex items-center rounded-md bg-warning/15 px-2 py-0.5 font-mono text-[10.5px] font-bold tabular-nums text-warning-foreground">
        {formatTime(interaction.reminder_at)}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-md bg-surface-2 px-2 py-0.5 text-[10.5px] font-semibold tabular-nums text-muted-foreground">
      {shortDateFormatter.format(toDate(interaction.reminder_at))}
    </span>
  );
};

type QueueEntry = {
  interaction: Interaction;
  groupKey: MyDayGroupKey;
};

type DashboardPriorityQueueProps = {
  view: MyDayView;
  toPlanCount: number;
  isUpdatePending: boolean;
  onSelectInteraction: (interaction: Interaction) => void;
  onCompleteReminder: (interaction: Interaction) => void;
  onPostponeReminder: (interaction: Interaction, daysAhead: number) => void;
};

const summaryChipClass = (alert: boolean): string =>
  cn(
    'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px]',
    alert ? 'bg-primary/10 font-semibold text-primary' : 'bg-surface-2 font-medium text-muted-foreground'
  );

// File de priorite : les relances en retard d'abord, puis celles du jour,
// les prochaines echeances et enfin les dossiers a traiter sans rappel.
const DashboardPriorityQueue = ({
  view,
  toPlanCount,
  isUpdatePending,
  onSelectInteraction,
  onCompleteReminder,
  onPostponeReminder
}: DashboardPriorityQueueProps) => {
  const [expanded, setExpanded] = useState(false);

  const entries: QueueEntry[] = [
    ...view.groups.overdue.map((interaction) => ({ interaction, groupKey: 'overdue' as const })),
    ...view.groups.dueToday.map((interaction) => ({ interaction, groupKey: 'dueToday' as const })),
    ...view.groups.upcoming.map((interaction) => ({ interaction, groupKey: 'upcoming' as const })),
    ...view.groups.toPlan.map((interaction) => ({ interaction, groupKey: 'toPlan' as const }))
  ];

  const visibleEntries = expanded ? entries : entries.slice(0, COLLAPSED_ROW_COUNT);
  const hiddenCount = entries.length - visibleEntries.length;

  return (
    <section
      className="flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-soft"
      data-testid="dashboard-priority-queue"
      aria-label="File de priorité"
    >
      <div className="flex flex-col gap-2.5 border-b border-border-subtle px-4 pb-3 pt-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-[13.5px] font-bold text-foreground">File de priorité</h3>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {entries.length} dossier{entries.length > 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className={summaryChipClass(view.kpis.overdueCount > 0)}>
            En retard · {view.kpis.overdueCount}
          </span>
          <span className={summaryChipClass(false)}>
            {"Aujourd'hui"} · {view.kpis.dueTodayCount}
          </span>
          <span className={summaryChipClass(false)}>
            À venir · {view.groups.upcoming.length}
          </span>
          <span className={summaryChipClass(false)}>
            Sans rappel · {toPlanCount}
          </span>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
          <span className="mb-2.5 inline-flex size-9 items-center justify-center rounded-full bg-success/10">
            <Inbox size={16} className="text-success" aria-hidden="true" />
          </span>
          <p className="text-[13px] font-semibold text-foreground">Tout est à jour</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Aucune relance en attente ni dossier à planifier.
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border-subtle">
          {visibleEntries.map(({ interaction, groupKey }) => {
            const displayName = getInteractionDisplayName(interaction);
            const showComplete = groupKey !== 'toPlan';

            return (
              <div
                key={interaction.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectInteraction(interaction)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) {
                    return;
                  }
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectInteraction(interaction);
                  }
                }}
                aria-label={`Ouvrir ${displayName}`}
                data-testid={`dashboard-queue-row-${interaction.id}`}
                className="group/row flex cursor-pointer items-center gap-2.5 px-4 py-2.5 transition-colors duration-100 hover:bg-surface-1 focus-visible:bg-primary/[0.05] focus-visible:outline-none"
              >
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-surface-1 text-muted-foreground">
                  {getInteractionChannelIcon(interaction.channel)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-semibold leading-tight text-foreground">
                    {displayName}
                  </p>
                  <p className="mt-px truncate text-[11px] leading-tight text-muted-foreground">
                    {interaction.subject}
                  </p>
                </div>
                <span className="hidden shrink-0 items-center gap-1 group-hover/row:flex group-focus-within/row:flex">
                  {showComplete ? (
                    <button
                      type="button"
                      disabled={isUpdatePending}
                      aria-label={`Marquer la relance de ${displayName} comme faite`}
                      title="Relance faite : efface le rappel et journalise l'action"
                      onClick={(event) => {
                        event.stopPropagation();
                        onCompleteReminder(interaction);
                      }}
                      className="inline-flex h-6 items-center gap-1 rounded-md border border-success/30 bg-success/10 px-1.5 text-[10.5px] font-semibold text-success transition-colors hover:bg-success/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                    >
                      <Check size={10} strokeWidth={3} aria-hidden="true" />
                      Fait
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={isUpdatePending}
                    aria-label={`${showComplete ? 'Reporter' : 'Planifier'} la relance de ${displayName} à dans 2 jours`}
                    title="Rappel dans 2 jours à 09:00"
                    onClick={(event) => {
                      event.stopPropagation();
                      onPostponeReminder(interaction, 2);
                    }}
                    className="inline-flex h-6 items-center rounded-md border border-border bg-card px-1.5 text-[10.5px] font-medium text-muted-foreground transition-colors hover:border-primary/35 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                  >
                    +2 j
                  </button>
                </span>
                <span className="shrink-0 group-hover/row:hidden group-focus-within/row:hidden">
                  {buildDueBadge(interaction, groupKey)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {hiddenCount > 0 || expanded ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="border-t border-border-subtle px-4 py-2.5 text-center text-xs font-semibold text-primary transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          {expanded ? 'Réduire la file' : `Voir toute la file (${entries.length}) →`}
        </button>
      ) : null}
    </section>
  );
};

export default DashboardPriorityQueue;
