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

const DashboardKanban = ({ columns, onSelectInteraction, getStatusMeta }: DashboardKanbanProps) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full p-6 overflow-hidden">
    <KanbanColumn
      title="A Traiter / Urgent"
      dotClassName="bg-red-500"
      interactions={columns.urgencies}
      emptyLabel="Tout est a jour."
      onSelectInteraction={onSelectInteraction}
      getStatusMeta={getStatusMeta}
    />
    <KanbanColumn
      title="En Cours / Attente"
      dotClassName="bg-orange-400"
      interactions={columns.inProgress}
      emptyLabel="Aucun dossier en attente."
      onSelectInteraction={onSelectInteraction}
      getStatusMeta={getStatusMeta}
    />
    <KanbanColumn
      title="Termines (Periode)"
      dotClassName="bg-emerald-500"
      interactions={columns.completed}
      emptyLabel="Rien termine sur cette periode."
      onSelectInteraction={onSelectInteraction}
      getStatusMeta={getStatusMeta}
    />
  </div>
);

export default DashboardKanban;
