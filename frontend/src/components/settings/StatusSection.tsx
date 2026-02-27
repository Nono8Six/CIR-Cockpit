import { ListTodo } from 'lucide-react';

import type { AgencyStatus, StatusCategory } from '@/types';
import StatusAddBar from './status/StatusAddBar';
import StatusCategoryTabs from './status/StatusCategoryTabs';
import StatusRowsList from './status/StatusRowsList';

type StatusSectionProps = {
  statuses: AgencyStatus[];
  newStatus: string;
  newStatusCategory: StatusCategory;
  setNewStatus: (value: string) => void;
  setNewStatusCategory: (value: StatusCategory) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onLabelUpdate: (index: number, value: string) => void;
  onCategoryUpdate: (index: number, value: StatusCategory) => void;
  readOnly?: boolean;
};

const StatusSection = ({
  statuses,
  newStatus,
  newStatusCategory,
  setNewStatus,
  setNewStatusCategory,
  onAdd,
  onRemove,
  onLabelUpdate,
  onCategoryUpdate,
  readOnly = false
}: StatusSectionProps) => (
  <div className="bg-card p-6 rounded-lg border border-border shadow-sm flex flex-col h-full">
    <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
      <ListTodo size={15} className="text-muted-foreground" aria-hidden="true" />
      Statuts Dossier
      <span className="text-xs font-normal text-muted-foreground/80 bg-muted px-2 py-0.5 rounded-full">({statuses.length})</span>
    </h3>
    <p className="text-xs text-muted-foreground mb-4">
      La categorie classe le Kanban (A traiter / En cours / Termine).
    </p>

    <div className="space-y-3 mb-4">
      <StatusAddBar
        newStatus={newStatus}
        readOnly={readOnly}
        onStatusChange={setNewStatus}
        onAdd={onAdd}
      />
      <StatusCategoryTabs
        category={newStatusCategory}
        readOnly={readOnly}
        onCategoryChange={setNewStatusCategory}
      />
    </div>

    <StatusRowsList
      statuses={statuses}
      readOnly={readOnly}
      onRemove={onRemove}
      onLabelUpdate={onLabelUpdate}
      onCategoryUpdate={onCategoryUpdate}
    />
  </div>
);

export default StatusSection;
