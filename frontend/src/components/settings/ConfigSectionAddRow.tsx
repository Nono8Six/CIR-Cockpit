import { Plus } from 'lucide-react';

type ConfigSectionAddRowProps = {
  newItem: string;
  setNewItem: (value: string) => void;
  onAdd: () => void;
  placeholder: string;
  namePrefix: string;
  uppercase: boolean;
  readOnly: boolean;
};

const ConfigSectionAddRow = ({
  newItem,
  setNewItem,
  onAdd,
  placeholder,
  namePrefix,
  uppercase,
  readOnly
}: ConfigSectionAddRowProps) => (
  <div className="flex gap-2 mb-4">
    <input
      type="text"
      value={newItem}
      onChange={(event) => setNewItem(event.target.value)}
      onKeyDown={(event) => event.key === 'Enter' && !readOnly && onAdd()}
      className={`flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-slate-300 focus:outline-none ${uppercase ? 'uppercase' : ''} ${readOnly ? 'bg-slate-50 text-slate-400' : ''}`}
      placeholder={placeholder}
      disabled={readOnly}
      name={`${namePrefix}-new`}
      aria-label={placeholder}
      autoComplete="off"
    />
    <button
      type="button"
      onClick={onAdd}
      className={`bg-cir-red text-white p-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cir-red/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${readOnly ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700'}`}
      disabled={readOnly}
      aria-disabled={readOnly}
      aria-label="Ajouter un élément"
    >
      <Plus size={18} />
    </button>
  </div>
);

export default ConfigSectionAddRow;
