import type { AgencyStatus, Interaction } from '@/types';
import KanbanColumn from './kanban/KanbanColumn';

export type KanbanColumns = {
  urgencies: Interaction[];
  inProgress: Interaction[];
  completed: Interaction[];
};

type DashboardKanbanProps = {
  columns: KanbanColumns;
  onSelectInteraction: (interaction: Interaction) => void;
  getStatusMeta: (interaction: Interaction) => AgencyStatus | undefined;
};

const DashboardKanban = ({
  columns,
  onSelectInteraction,
  getStatusMeta
}: DashboardKanbanProps) => (
  <div
    className="grid h-full min-h-0 grid-cols-1 gap-3 overflow-x-hidden p-3 sm:p-4 lg:grid-cols-2 xl:grid-cols-3"
    data-testid="dashboard-kanban"
  >
    <KanbanColumn
      columnId="urgencies"
      title="A traiter / urgent"
      dotClassName="bg-destructive"
      interactions={columns.urgencies}
      emptyLabel="Tout est a jour."
      onSelectInteraction={onSelectInteraction}
      getStatusMeta={getStatusMeta}
    />
    <KanbanColumn
      columnId="in-progress"
      title="En cours / attente"
      dotClassName="bg-warning"
      interactions={columns.inProgress}
      emptyLabel="Aucun dossier en attente."
      onSelectInteraction={onSelectInteraction}
      getStatusMeta={getStatusMeta}
    />
    <KanbanColumn
      columnId="completed"
      title="Termines (periode)"
      dotClassName="bg-success"
      interactions={columns.completed}
      emptyLabel="Rien termine sur cette periode."
      onSelectInteraction={onSelectInteraction}
      getStatusMeta={getStatusMeta}
    />
  </div>
);

export default DashboardKanban;
