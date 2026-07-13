import { Check } from 'lucide-react';

import { getInteractionChannelIcon } from '@/components/interaction-card/InteractionChannelIcon';
import type { Interaction } from '@/types';
import { formatTime } from '@/utils/date/formatTime';
import { toDate } from '@/utils/date/toDate';
import { getInteractionDisplayName } from '@/utils/interactions/getInteractionDisplayName';
import type { MyDayGroupKey } from './myDayGroupsConfig';

type MyDayRowProps = {
  interaction: Interaction;
  groupKey: MyDayGroupKey;
  isActive: boolean;
  isUpdatePending: boolean;
  onSelect: (interaction: Interaction) => void;
  onComplete: (interaction: Interaction) => void;
  onPostpone: (interaction: Interaction, daysAhead: number) => void;
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Ex : "mar. 15 juil." — echeance courte et lisible pour les rappels futurs.
const shortDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short'
});

const buildDueBadge = (interaction: Interaction, groupKey: MyDayGroupKey) => {
  if (groupKey === 'toPlan' || !interaction.reminder_at) {
    return (
      <span className="text-[11px] font-medium text-muted-foreground/60">Aucun rappel</span>
    );
  }

  if (groupKey === 'overdue') {
    const lateDays = Math.floor((Date.now() - toDate(interaction.reminder_at).getTime()) / DAY_MS);
    return (
      <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
        {lateDays >= 1 ? `${lateDays} j de retard` : 'En retard'}
      </span>
    );
  }

  if (groupKey === 'dueToday') {
    return (
      <span className="inline-flex items-center rounded-full bg-warning/15 px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums text-warning-foreground">
        {formatTime(interaction.reminder_at)}
      </span>
    );
  }

  return (
    <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
      {shortDateFormatter.format(toDate(interaction.reminder_at))}
    </span>
  );
};

const postponeButtonClass =
  'inline-flex h-6 items-center rounded-md border border-border bg-card px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/35 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';

const MyDayRow = ({
  interaction,
  groupKey,
  isActive,
  isUpdatePending,
  onSelect,
  onComplete,
  onPostpone
}: MyDayRowProps) => {
  const displayName = getInteractionDisplayName(interaction);
  const showComplete = groupKey !== 'toPlan';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(interaction)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) {
          return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(interaction);
        }
      }}
      aria-label={`Ouvrir ${displayName}`}
      data-testid={`dashboard-myday-row-${interaction.id}`}
      className={`group/row relative grid cursor-pointer grid-cols-[auto_minmax(0,1.1fr)_auto] items-center gap-x-3 gap-y-1 px-3 py-2.5 text-left transition-colors duration-100 focus-visible:outline-none focus-visible:bg-primary/[0.05] sm:grid-cols-[auto_minmax(11rem,1.15fr)_minmax(0,1.6fr)_6.5rem_auto] sm:px-4 ${
        isActive
          ? 'border-l-2 border-l-primary bg-primary/[0.04] pl-[10px] sm:pl-[14px]'
          : 'hover:bg-surface-1'
      }`}
    >
      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-surface-1 text-muted-foreground">
        {getInteractionChannelIcon(interaction.channel)}
      </span>

      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold leading-tight text-foreground">
          {displayName}
        </p>
        {interaction.contact_name?.trim() ? (
          <p className="mt-px truncate text-[11px] leading-tight text-muted-foreground">
            {interaction.contact_name}
          </p>
        ) : null}
      </div>

      <p className="order-last col-span-3 min-w-0 truncate text-xs text-muted-foreground sm:order-none sm:col-span-1">
        {interaction.subject}
        {interaction.order_ref ? (
          <span className="ml-1.5 font-mono text-[10px] tabular-nums text-muted-foreground/70">
            #{interaction.order_ref}
          </span>
        ) : null}
      </p>

      <span className="justify-self-end sm:justify-self-end">
        {buildDueBadge(interaction, groupKey)}
      </span>

      <span className="flex items-center gap-1 justify-self-end transition-opacity duration-100 sm:opacity-0 sm:group-hover/row:opacity-100 sm:group-focus-within/row:opacity-100 sm:has-[:focus-visible]:opacity-100">
        {showComplete ? (
          <button
            type="button"
            disabled={isUpdatePending}
            aria-label={`Marquer la relance de ${displayName} comme faite`}
            title="Relance faite : efface le rappel et journalise l'action"
            onClick={(event) => {
              event.stopPropagation();
              onComplete(interaction);
            }}
            className="inline-flex h-6 items-center gap-1 rounded-md border border-success/30 bg-success/10 px-2 text-[11px] font-semibold text-success transition-colors hover:bg-success/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            <Check size={11} strokeWidth={3} aria-hidden="true" />
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
            onPostpone(interaction, 2);
          }}
          className={postponeButtonClass}
        >
          +2 j
        </button>
        <button
          type="button"
          disabled={isUpdatePending}
          aria-label={`${showComplete ? 'Reporter' : 'Planifier'} la relance de ${displayName} à dans 1 semaine`}
          title="Rappel dans 1 semaine à 09:00"
          onClick={(event) => {
            event.stopPropagation();
            onPostpone(interaction, 7);
          }}
          className={postponeButtonClass}
        >
          +1 sem
        </button>
      </span>
    </div>
  );
};

export default MyDayRow;
