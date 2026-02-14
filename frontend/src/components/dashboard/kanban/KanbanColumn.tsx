import type { AgencyStatus, Interaction } from '@/types';
import InteractionCard from '@/components/InteractionCard';

type KanbanColumnProps = {
  columnId: string;
  title: string;
  dotClassName: string;
  interactions: Interaction[];
  emptyLabel: string;
  onSelectInteraction: (interaction: Interaction) => void;
  getStatusMeta: (interaction: Interaction) => AgencyStatus | undefined;
};

const KanbanColumn = ({
  columnId,
  title,
  dotClassName,
  interactions,
  emptyLabel,
  onSelectInteraction,
  getStatusMeta
}: KanbanColumnProps) => (
  <section
    className="flex min-h-[17rem] min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white"
    data-testid={`dashboard-kanban-column-${columnId}`}
  >
    <header className="flex items-center justify-between border-b border-slate-200 px-3 py-2.5">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
        <span className={`size-2 rounded-full ${dotClassName}`} aria-hidden="true" />
        {title}
      </h3>
      <span className="inline-flex min-w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
        {interactions.length}
      </span>
    </header>
    <div
      className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3"
      data-testid={`dashboard-kanban-column-body-${columnId}`}
    >
      {interactions.map((interaction) => (
        <button
          key={interaction.id}
          type="button"
          onClick={() => onSelectInteraction(interaction)}
          className="w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cir-red/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          aria-label={`Ouvrir ${interaction.company_name}`}
          data-testid={`dashboard-kanban-card-${interaction.id}`}
        >
          <InteractionCard data={interaction} statusMeta={getStatusMeta(interaction)} />
        </button>
      ))}
      {interactions.length === 0 && (
        <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-8 text-center text-sm text-slate-500">
          {emptyLabel}
        </div>
      )}
    </div>
  </section>
);

export default KanbanColumn;
