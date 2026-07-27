import { Car, ChevronRight, Mail, Phone, Store, type LucideIcon } from 'lucide-react';

import { getInteractionChannelIcon } from '@/components/interaction-card/InteractionChannelIcon';
import { cn } from '@/lib/utils';
import { Channel, type Interaction } from '@/types';
import {
  DOSSIER_CHANNEL_FILTERS,
  type DossierChannelFilter
} from '@/utils/dashboard/dashboardOverview';
import { formatPipelineAmount, getPipelineStageLabel } from '@/utils/dashboard/dashboardPipeline';
import { formatTime } from '@/utils/date/formatTime';
import { isBeforeNow } from '@/utils/date/isBeforeNow';
import { toDate } from '@/utils/date/toDate';
import { getInteractionDisplayName } from '@/utils/interactions/getInteractionDisplayName';

const DAY_MS = 24 * 60 * 60 * 1000;

const CHANNEL_FILTER_ICONS: Partial<Record<DossierChannelFilter, LucideIcon>> = {
  [Channel.PHONE]: Phone,
  [Channel.EMAIL]: Mail,
  [Channel.VISIT]: Car,
  [Channel.COUNTER]: Store
};

const STAGE_DOT_CLASSES: Record<string, string> = {
  unqualified: 'bg-muted-foreground/50',
  qualification: 'bg-warning/70',
  quote_sent: 'bg-warning',
  negotiation: 'bg-primary',
  won: 'bg-success',
  lost: 'bg-destructive'
};

const shortDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short'
});

const isSameDay = (first: Date, second: Date): boolean =>
  first.getFullYear() === second.getFullYear()
  && first.getMonth() === second.getMonth()
  && first.getDate() === second.getDate();

const buildNextAction = (interaction: Interaction): { label: string; className: string } => {
  if (interaction.stage === 'won') {
    return { label: 'Commande signée', className: 'text-success' };
  }

  if (interaction.stage === 'lost') {
    return {
      label: interaction.lost_reason ? `Perdu · ${interaction.lost_reason}` : 'Clôturé',
      className: 'text-muted-foreground'
    };
  }

  if (!interaction.reminder_at) {
    return { label: 'Aucun rappel', className: 'text-muted-foreground/70' };
  }

  const reminderDate = toDate(interaction.reminder_at);

  if (isBeforeNow(interaction.reminder_at)) {
    const lateDays = Math.floor((Date.now() - reminderDate.getTime()) / DAY_MS);
    return {
      label: lateDays >= 1 ? `Retard ${lateDays} j` : 'En retard',
      className: 'font-semibold text-primary'
    };
  }

  if (isSameDay(reminderDate, new Date())) {
    return { label: `Aujourd'hui ${formatTime(interaction.reminder_at)}`, className: 'text-foreground' };
  }

  return { label: shortDateFormatter.format(reminderDate), className: 'text-foreground/80' };
};

const GRID_TEMPLATE =
  'grid-cols-[38px_minmax(0,1.5fr)_140px_110px_minmax(0,1fr)_90px_18px]';

type DashboardDossiersTableProps = {
  rows: Interaction[];
  totalCount: number;
  channel: DossierChannelFilter;
  onChannelChange: (channel: DossierChannelFilter) => void;
  getStatusBadgeClass: (interaction: Interaction) => string;
  onSelectInteraction: (interaction: Interaction) => void;
  activeInteractionId?: string | null;
};

// Journal des dossiers sur la periode active : canal, client, etape pipeline,
// statut agence, prochaine action et montant.
const DashboardDossiersTable = ({
  rows,
  totalCount,
  channel,
  onChannelChange,
  getStatusBadgeClass,
  onSelectInteraction,
  activeInteractionId
}: DashboardDossiersTableProps) => (
  <section
    className="flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-soft"
    data-testid="dashboard-dossiers-table"
    aria-label="Dossiers en cours"
  >
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 border-b border-border-subtle px-4 pb-3 pt-3.5">
      <h3 className="text-[13.5px] font-bold text-foreground">Dossiers en cours</h3>
      <span className="text-[11px] text-muted-foreground tabular-nums">
        {totalCount} suivi{totalCount > 1 ? 's' : ''}
      </span>
      <div className="ml-auto flex flex-wrap gap-1.5" role="group" aria-label="Filtrer par canal">
        {DOSSIER_CHANNEL_FILTERS.map(({ key, label }) => {
          const Icon = CHANNEL_FILTER_ICONS[key];
          const active = channel === key;

          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => onChannelChange(key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                active
                  ? 'border-primary/60 bg-accent font-semibold text-accent-foreground'
                  : 'border-border bg-card font-medium text-muted-foreground hover:border-primary/35 hover:text-foreground'
              )}
            >
              {Icon ? <Icon size={12} aria-hidden="true" /> : null}
              {label}
            </button>
          );
        })}
      </div>
    </div>

    <div className="overflow-x-auto">
      <div className="min-w-[820px]">
        <div
          className={cn(
            'grid items-center gap-x-2 border-b border-border-subtle bg-surface-1 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground',
            GRID_TEMPLATE
          )}
        >
          <span>Canal</span>
          <span>Client · sujet</span>
          <span>Étape</span>
          <span>Statut</span>
          <span>Prochaine action</span>
          <span className="text-right">Montant</span>
          <span aria-hidden="true" />
        </div>

        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-xs text-muted-foreground">
            Aucun dossier sur la période avec ces filtres.
          </div>
        ) : (
          rows.map((interaction) => {
            const displayName = getInteractionDisplayName(interaction);
            const stageDot = interaction.stage
              ? {
                label: getPipelineStageLabel(interaction.stage),
                className: STAGE_DOT_CLASSES[interaction.stage] ?? STAGE_DOT_CLASSES.unqualified
              }
              : null;
            const nextAction = buildNextAction(interaction);
            const isActive = activeInteractionId === interaction.id;

            return (
              <div
                key={interaction.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectInteraction(interaction)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectInteraction(interaction);
                  }
                }}
                aria-label={`Ouvrir ${displayName}`}
                data-testid={`dashboard-dossier-row-${interaction.id}`}
                className={cn(
                  'grid cursor-pointer items-center gap-x-2 border-b border-border-subtle px-4 py-2 transition-colors duration-100 focus-visible:bg-primary/[0.05] focus-visible:outline-none',
                  GRID_TEMPLATE,
                  isActive
                    ? 'border-l-2 border-l-primary bg-primary/[0.04] pl-[14px]'
                    : 'hover:bg-surface-1'
                )}
              >
                <span className="inline-flex size-7 items-center justify-center rounded-md border border-border-subtle bg-surface-1 text-muted-foreground">
                  {getInteractionChannelIcon(interaction.channel)}
                </span>
                <div className="min-w-0 pr-2">
                  <p className="truncate text-[12.5px] font-semibold leading-tight text-foreground">
                    {displayName}
                  </p>
                  <p className="mt-px truncate text-[11px] leading-tight text-muted-foreground">
                    {interaction.subject}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11.5px] text-foreground/80">
                  {stageDot ? (
                    <>
                      <span
                        className={cn('size-[7px] shrink-0 rounded-full', stageDot.className)}
                        aria-hidden="true"
                      />
                      <span className="truncate">{stageDot.label}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground/60">—</span>
                  )}
                </span>
                <span className="min-w-0">
                  <span
                    title={interaction.status}
                    className={cn(
                      'inline-flex max-w-full items-center rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
                      getStatusBadgeClass(interaction)
                    )}
                  >
                    <span className="truncate">{interaction.status}</span>
                  </span>
                </span>
                <span className={cn('truncate text-[11.5px]', nextAction.className)}>
                  {nextAction.label}
                </span>
                <span className="text-right font-mono text-xs font-semibold tabular-nums text-foreground">
                  {interaction.amount !== null && interaction.amount !== undefined
                    ? formatPipelineAmount(interaction.amount)
                    : '—'}
                </span>
                <ChevronRight
                  size={14}
                  className="justify-self-end text-muted-foreground/50"
                  aria-hidden="true"
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  </section>
);

export default DashboardDossiersTable;
