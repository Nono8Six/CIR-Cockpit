import { ArrowDown, ArrowUp, Car, Check, ChevronRight, Mail, Phone, Store, type LucideIcon } from 'lucide-react';

import { getInteractionChannelIcon } from '@/components/interaction-card/InteractionChannelIcon';
import { cn } from '@/lib/utils';
import { Channel, type Interaction } from '@/types';
import {
  DOSSIER_CHANNEL_FILTERS,
  DOSSIER_SCOPE_FILTERS,
  shortenBadgeLabel,
  type DossierChannelFilter,
  type DossierRow,
  type DossierScopeFilter,
  type DossierSort,
  type DossierSortKey,
  type DossierUrgency
} from '@/utils/dashboard/dashboardOverview';
import { formatPipelineAmount, getPipelineStageLabel } from '@/utils/dashboard/dashboardPipeline';
import { formatTime } from '@/utils/date/formatTime';

const CHANNEL_FILTER_ICONS: Partial<Record<DossierChannelFilter, LucideIcon>> = {
  [Channel.PHONE]: Phone,
  [Channel.EMAIL]: Mail,
  [Channel.VISIT]: Car,
  [Channel.COUNTER]: Store
};

// Les etapes neutres du pipeline restent neutres : seules la victoire et la perte,
// qui sont des etats et non des passages, prennent une couleur semantique.
const STAGE_DOT_CLASSES: Record<string, string> = {
  unqualified: 'bg-muted-foreground/35',
  qualification: 'bg-muted-foreground/60',
  quote_sent: 'bg-foreground/70',
  negotiation: 'bg-primary',
  won: 'bg-success',
  lost: 'bg-destructive'
};

const shortDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short'
});

const URGENCY_TEXT_CLASSES: Record<DossierUrgency, string> = {
  overdue: 'font-semibold text-destructive',
  today: 'font-semibold text-warning-foreground',
  upcoming: 'text-foreground/80',
  unplanned: 'text-muted-foreground/70',
  closed: 'text-muted-foreground'
};

const buildDueLabel = (row: DossierRow): string => {
  if (row.urgency === 'closed') {
    const stage = row.interaction.stage;
    if (stage === 'won') {
      return 'Commande signée';
    }
    if (stage === 'lost') {
      return row.interaction.lost_reason
        ? `Perdu · ${row.interaction.lost_reason}`
        : 'Perdu';
    }
    return 'Clôturé';
  }

  if (row.urgency === 'unplanned' || row.dueTime === null) {
    return 'Aucun rappel';
  }

  if (row.urgency === 'overdue') {
    return row.lateDays && row.lateDays >= 1 ? `Retard ${row.lateDays} j` : 'En retard';
  }

  if (row.urgency === 'today') {
    return `Aujourd'hui ${formatTime(new Date(row.dueTime))}`;
  }

  return shortDateFormatter.format(new Date(row.dueTime));
};

const GRID_TEMPLATE =
  'grid-cols-[32px_minmax(0,2.2fr)_148px_156px_172px_100px_78px_16px]';

type SortableHeaderProps = {
  label: string;
  sortKey: DossierSortKey;
  sort: DossierSort;
  onToggleSort: (key: DossierSortKey) => void;
  className?: string;
};

const SortableHeader = ({ label, sortKey, sort, onToggleSort, className }: SortableHeaderProps) => {
  const active = sort.key === sortKey;
  const Icon = sort.direction === 'asc' ? ArrowUp : ArrowDown;

  return (
    <button
      type="button"
      onClick={() => onToggleSort(sortKey)}
      // La table est une grille CSS sans role table : l'etat du tri est porte par le
      // libelle accessible du bouton plutot que par aria-sort, invalide sur ce role.
      aria-label={
        active
          ? `${label} · tri ${sort.direction === 'asc' ? 'croissant' : 'décroissant'} actif, inverser`
          : `Trier par ${label.toLowerCase()}`
      }
      className={cn(
        'inline-flex items-center gap-1 rounded-sm transition-colors duration-100 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
        active && 'text-foreground',
        className
      )}
    >
      <span className="truncate">{label}</span>
      <Icon
        size={11}
        aria-hidden="true"
        className={cn('shrink-0', active ? 'opacity-100' : 'opacity-0')}
      />
    </button>
  );
};

type DashboardDossiersTableProps = {
  rows: DossierRow[];
  scope: DossierScopeFilter;
  onScopeChange: (scope: DossierScopeFilter) => void;
  channel: DossierChannelFilter;
  onChannelChange: (channel: DossierChannelFilter) => void;
  sort: DossierSort;
  onToggleSort: (key: DossierSortKey) => void;
  getStatusBadgeClass: (interaction: Interaction) => string;
  onSelectInteraction: (interaction: Interaction) => void;
  onCompleteReminder: (interaction: Interaction) => void;
  onPostponeReminder: (interaction: Interaction, daysAhead: number) => void;
  isUpdatePending: boolean;
  activeInteractionId?: string | null;
};

// Surface unique de la page : chaque dossier y figure une fois et une seule, avec son
// urgence, son etape, son statut et son montant en colonnes plutot qu'en panneaux.
const DashboardDossiersTable = ({
  rows,
  scope,
  onScopeChange,
  channel,
  onChannelChange,
  sort,
  onToggleSort,
  getStatusBadgeClass,
  onSelectInteraction,
  onCompleteReminder,
  onPostponeReminder,
  isUpdatePending,
  activeInteractionId
}: DashboardDossiersTableProps) => (
  <section
    className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-soft"
    data-testid="dashboard-dossiers-table"
    aria-label="Dossiers à traiter"
  >
    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border-subtle px-4 py-2.5">
      <div className="flex rounded-md border border-border bg-surface-2 p-0.5" role="group" aria-label="Périmètre des dossiers">
        {DOSSIER_SCOPE_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            aria-pressed={scope === key}
            onClick={() => onScopeChange(key)}
            className={cn(
              'rounded-[3px] px-2.5 py-1 text-[11px] transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
              scope === key
                ? 'bg-card font-semibold text-foreground shadow-soft'
                : 'font-medium text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
        {rows.length} dossier{rows.length > 1 ? 's' : ''}
      </span>

      <div className="ml-auto flex flex-wrap gap-1" role="group" aria-label="Filtrer par canal">
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
                'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                active
                  ? 'border-primary/60 bg-accent font-semibold text-accent-foreground'
                  : 'border-border bg-card font-medium text-muted-foreground hover:border-primary/35 hover:text-foreground'
              )}
            >
              {Icon ? <Icon size={11} aria-hidden="true" /> : null}
              {label}
            </button>
          );
        })}
      </div>
    </div>

    <div className="min-h-0 flex-1 overflow-auto">
      <div className="min-w-[960px]">
        <div
          className={cn(
            'sticky top-0 z-10 grid items-center gap-x-2 border-b border-border-subtle bg-surface-1 px-4 py-1.5 text-[11px] font-semibold text-muted-foreground',
            GRID_TEMPLATE
          )}
        >
          <span aria-hidden="true" />
          <SortableHeader label="Client · sujet" sortKey="client" sort={sort} onToggleSort={onToggleSort} />
          <SortableHeader label="Échéance" sortKey="priority" sort={sort} onToggleSort={onToggleSort} />
          <SortableHeader label="Étape" sortKey="stage" sort={sort} onToggleSort={onToggleSort} />
          <span className="truncate">Statut</span>
          <SortableHeader
            label="Montant"
            sortKey="amount"
            sort={sort}
            onToggleSort={onToggleSort}
            className="justify-end"
          />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <p className="text-[13px] font-semibold text-foreground">
              {scope === 'open' ? 'Rien à traiter' : 'Aucun dossier sur la période'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {scope === 'open'
                ? 'Aucun dossier ouvert avec ces filtres. Élargissez le périmètre pour revoir les dossiers clos.'
                : 'Élargissez la période ou retirez le filtre de canal.'}
            </p>
          </div>
        ) : (
          rows.map((row) => {
            const { interaction } = row;
            const stageLabel = getPipelineStageLabel(interaction.stage);
            const stageClass =
              STAGE_DOT_CLASSES[interaction.stage ?? 'unqualified'] ?? STAGE_DOT_CLASSES.unqualified;
            const isActive = activeInteractionId === interaction.id;
            const dueLabel = buildDueLabel(row);
            const statusLabel = shortenBadgeLabel(interaction.status);

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
                aria-label={`Ouvrir ${row.displayName}`}
                data-testid={`dashboard-dossier-row-${interaction.id}`}
                className={cn(
                  'group/row grid cursor-pointer items-center gap-x-2 border-b border-border-subtle px-4 py-1.5 transition-colors duration-100 focus-visible:bg-primary/[0.05] focus-visible:outline-none',
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
                    {row.displayName}
                  </p>
                  <p className="mt-px truncate text-[11px] leading-tight text-muted-foreground">
                    {interaction.subject}
                  </p>
                </div>

                <span
                  className={cn('flex min-w-0 items-center gap-1.5 text-[11.5px]', URGENCY_TEXT_CLASSES[row.urgency])}
                  title={dueLabel}
                >
                  {row.urgency === 'overdue' ? (
                    <span className="size-[6px] shrink-0 rounded-full bg-destructive" aria-hidden="true" />
                  ) : null}
                  <span className="truncate">{dueLabel}</span>
                </span>

                <span className="flex min-w-0 items-center gap-1.5 text-[11.5px] text-foreground/80">
                  <span className={cn('size-[7px] shrink-0 rounded-full', stageClass)} aria-hidden="true" />
                  <span className="truncate">{stageLabel}</span>
                </span>

                <span className="min-w-0">
                  <span
                    title={interaction.status}
                    className={cn(
                      'inline-flex max-w-full items-center rounded border px-1.5 py-0.5 text-[11px] font-semibold tracking-wide',
                      getStatusBadgeClass(interaction)
                    )}
                  >
                    <span className="truncate">{statusLabel}</span>
                  </span>
                </span>

                <span className="text-right font-mono text-[11.5px] font-semibold tabular-nums text-foreground">
                  {row.amount === null ? (
                    <span className="text-muted-foreground/50">—</span>
                  ) : (
                    formatPipelineAmount(row.amount)
                  )}
                </span>

                <span className="flex justify-end gap-1 opacity-0 transition-opacity duration-100 group-hover/row:opacity-100 group-focus-within/row:opacity-100">
                  {row.isOpen && row.dueTime !== null ? (
                    <button
                      type="button"
                      disabled={isUpdatePending}
                      aria-label={`Marquer la relance de ${row.displayName} comme faite`}
                      title="Relance faite : efface le rappel et journalise l'action"
                      onClick={(event) => {
                        event.stopPropagation();
                        onCompleteReminder(interaction);
                      }}
                      className="inline-flex size-6 items-center justify-center rounded-md border border-success/30 bg-success/10 text-success transition-colors hover:bg-success/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                    >
                      <Check size={11} strokeWidth={3} aria-hidden="true" />
                    </button>
                  ) : null}
                  {row.isOpen ? (
                    <button
                      type="button"
                      disabled={isUpdatePending}
                      aria-label={`${row.dueTime === null ? 'Planifier' : 'Reporter'} la relance de ${row.displayName} à dans 2 jours`}
                      title="Rappel dans 2 jours à 09:00"
                      onClick={(event) => {
                        event.stopPropagation();
                        onPostponeReminder(interaction, 2);
                      }}
                      className="inline-flex h-6 items-center rounded-md border border-border bg-card px-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/35 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                    >
                      +2 j
                    </button>
                  ) : null}
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

    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-t border-border-subtle bg-surface-1 px-4 py-1.5 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="size-[7px] rounded-full bg-foreground/70" aria-hidden="true" />
        étape en cours
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-[7px] rounded-full bg-success" aria-hidden="true" />
        gagné
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-[7px] rounded-full bg-destructive" aria-hidden="true" />
        perdu ou en retard
      </span>
      <span className="ml-auto flex items-center gap-2">
        <kbd className="rounded border border-border bg-card px-1 font-mono text-[11px]">↑↓</kbd>
        naviguer
        <kbd className="rounded border border-border bg-card px-1 font-mono text-[11px]">Entrée</kbd>
        ouvrir
        <kbd className="rounded border border-border bg-card px-1 font-mono text-[11px]">/</kbd>
        rechercher
      </span>
    </div>
  </section>
);

export default DashboardDossiersTable;
