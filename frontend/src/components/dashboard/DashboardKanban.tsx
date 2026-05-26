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
  onDeleteInteraction: (interaction: Interaction) => void;
  getStatusMeta: (interaction: Interaction) => AgencyStatus | undefined;
  activeInteractionId?: string | null;
};

const DashboardKanban = ({
  columns,
  onSelectInteraction,
  onDeleteInteraction,
  getStatusMeta,
  activeInteractionId
}: DashboardKanbanProps) => (
  <div
    className="grid h-full min-h-0 grid-cols-1 gap-4 overflow-y-auto pt-3 pb-3 px-0 lg:grid-cols-2 xl:grid-cols-3 xl:gap-5"
    data-testid="dashboard-kanban"
  >
    <KanbanColumn
      columnId="urgencies"
      title="À traiter / urgent"
      dotClassName="bg-destructive"
      toneClassName="border-destructive/18 bg-destructive/7"
      interactions={columns.urgencies}
      emptyLabel="Tout est à jour."
      onSelectInteraction={onSelectInteraction}
      onDeleteInteraction={onDeleteInteraction}
      getStatusMeta={getStatusMeta}
      activeInteractionId={activeInteractionId}
    />
    <KanbanColumn
      columnId="in-progress"
      title="En cours / attente"
      dotClassName="bg-warning"
      toneClassName="border-warning/22 bg-warning/9"
      interactions={columns.inProgress}
      emptyLabel="Aucun dossier en attente."
      onSelectInteraction={onSelectInteraction}
      onDeleteInteraction={onDeleteInteraction}
      getStatusMeta={getStatusMeta}
      activeInteractionId={activeInteractionId}
    />
    <KanbanColumn
      columnId="completed"
      title="Terminés (période)"
      dotClassName="bg-success"
      toneClassName="border-success/20 bg-success/8"
      interactions={columns.completed}
      emptyLabel="Rien terminé sur cette période."
      onSelectInteraction={onSelectInteraction}
      onDeleteInteraction={onDeleteInteraction}
      getStatusMeta={getStatusMeta}
      activeInteractionId={activeInteractionId}
    />
  </div>
);

export default DashboardKanban;
