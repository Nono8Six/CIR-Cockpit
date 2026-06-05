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

/**
 * DashboardKanban component for displaying the Kanban board columns grid.
 * Configures responsive column structures and gap layouts.
 * 
 * @param {DashboardKanbanProps} props - The component props.
 * @returns {React.JSX.Element} The rendered Kanban grid.
 */
const DashboardKanban = ({
  columns,
  onSelectInteraction,
  onDeleteInteraction,
  getStatusMeta,
  activeInteractionId
}: DashboardKanbanProps) => (
  <div
    className="grid h-full min-h-0 grid-cols-1 gap-5 overflow-y-auto pt-3 pb-3 px-0.5 lg:grid-cols-2 xl:grid-cols-3 xl:gap-6"
    data-testid="dashboard-kanban"
  >
    <KanbanColumn
      columnId="urgencies"
      title="À traiter / urgent"
      className="bg-[#fdf8f7] border-destructive/10"
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
      className="bg-[#fbf9f5] border-warning/10"
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
      className="bg-[#f7faf8] border-success/10"
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
