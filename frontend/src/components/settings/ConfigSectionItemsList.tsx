import { Trash2 } from 'lucide-react';

type ConfigSectionItemsListProps = {
  list: string[];
  onUpdate: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  title: string;
  namePrefix: string;
  uppercase: boolean;
  readOnly: boolean;
};

const ConfigSectionItemsList = ({
  list,
  onUpdate,
  onRemove,
  title,
  namePrefix,
  uppercase,
  readOnly
}: ConfigSectionItemsListProps) => (
  <div className="flex-1 overflow-auto space-y-2 max-h-[300px] pr-2">
    {list.map((item, index) => (
      <div
        key={index}
        className="flex justify-between items-center group bg-white border border-transparent hover:border-slate-100 rounded-md px-1 py-1 transition-colors"
      >
        <input
          type="text"
          value={item}
          onChange={(event) => onUpdate(index, event.target.value)}
          className={`flex-1 bg-transparent border-b border-transparent focus:border-slate-300 focus:outline-none text-sm text-slate-700 px-2 py-1 ${uppercase ? 'uppercase font-bold text-xs' : ''} ${readOnly ? 'text-slate-400' : ''}`}
          readOnly={readOnly}
          disabled={readOnly}
          name={`${namePrefix}-${index}`}
          aria-label={`${title} ${index + 1}`}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => onRemove(index)}
          className={`transition-colors p-2 ${readOnly ? 'opacity-0' : 'text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100'}`}
          disabled={readOnly}
          aria-disabled={readOnly}
          aria-label="Supprimer l'élément"
        >
          <Trash2 size={14} />
        </button>
      </div>
    ))}
  </div>
);

export default ConfigSectionItemsList;
