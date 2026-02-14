import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type StatusAddBarProps = {
  newStatus: string;
  readOnly: boolean;
  onStatusChange: (value: string) => void;
  onAdd: () => void;
};

const StatusAddBar = ({ newStatus, readOnly, onStatusChange, onAdd }: StatusAddBarProps) => {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Input
        type="text"
        value={newStatus}
        onChange={(event) => onStatusChange(event.target.value)}
        onKeyDown={(event) => event.key === 'Enter' && !readOnly && onAdd()}
        className={`h-9 flex-1 border-slate-200 bg-white text-sm ${readOnly ? 'text-slate-400' : ''}`}
        disabled={readOnly}
        placeholder="Nouveau statut"
        name="status-new-label"
        aria-label="Nouveau statut"
        autoComplete="off"
        data-testid="settings-status-add-input"
      />
      <Button
        type="button"
        onClick={onAdd}
        className="h-9 px-3 sm:px-4"
        disabled={readOnly}
        aria-disabled={readOnly}
        aria-label="Ajouter un statut"
        data-testid="settings-status-add-button"
      >
        <Plus size={16} className="mr-1" /> Ajouter
      </Button>
    </div>
  );
};

export default StatusAddBar;
