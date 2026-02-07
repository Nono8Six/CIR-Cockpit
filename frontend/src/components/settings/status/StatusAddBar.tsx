import { Plus } from 'lucide-react';

type StatusAddBarProps = {
  newStatus: string;
  readOnly: boolean;
  onStatusChange: (value: string) => void;
  onAdd: () => void;
};

const StatusAddBar = ({ newStatus, readOnly, onStatusChange, onAdd }: StatusAddBarProps) => {
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={newStatus}
        onChange={(event) => onStatusChange(event.target.value)}
        onKeyDown={(event) => event.key === 'Enter' && !readOnly && onAdd()}
        className={`flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-slate-300 focus:outline-none ${readOnly ? 'bg-slate-50 text-slate-400' : ''}`}
        disabled={readOnly}
        name="status-new-label"
        aria-label="Nouveau statut"
        autoComplete="off"
      />
      <button
        type="button"
        onClick={onAdd}
        className={`bg-cir-red text-white p-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cir-red/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${readOnly ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700'}`}
        disabled={readOnly}
        aria-disabled={readOnly}
        aria-label="Ajouter un statut"
      >
        <Plus size={18} />
      </button>
    </div>
  );
};

export default StatusAddBar;
