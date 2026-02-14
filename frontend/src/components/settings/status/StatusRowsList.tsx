import type { AgencyStatus, StatusCategory } from '@/types';
import StatusRow from './StatusRow';

type StatusRowsListProps = {
  statuses: AgencyStatus[];
  readOnly: boolean;
  onRemove: (index: number) => void;
  onLabelUpdate: (index: number, value: string) => void;
  onCategoryUpdate: (index: number, value: StatusCategory) => void;
};

const StatusRowsList = ({
  statuses,
  readOnly,
  onRemove,
  onLabelUpdate,
  onCategoryUpdate
}: StatusRowsListProps) => {
  return (
    <div className="max-h-[300px] flex-1 space-y-2 overflow-auto pr-2" data-testid="settings-status-rows">
      {statuses.map((status, index) => (
        <StatusRow
          key={status.id ?? `new-${index}`}
          status={status}
          index={index}
          readOnly={readOnly}
          onRemove={onRemove}
          onLabelUpdate={onLabelUpdate}
          onCategoryUpdate={onCategoryUpdate}
        />
      ))}
    </div>
  );
};

export default StatusRowsList;
