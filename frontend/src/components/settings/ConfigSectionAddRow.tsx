import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
  <div className="mb-4 flex flex-col gap-2 sm:flex-row">
    <Input
      type="text"
      value={newItem}
      onChange={(event) => setNewItem(event.target.value)}
      onKeyDown={(event) => event.key === 'Enter' && !readOnly && onAdd()}
      className={`h-9 flex-1 border-slate-200 bg-white text-sm ${uppercase ? 'uppercase' : ''} ${readOnly ? 'text-slate-400' : ''}`}
      placeholder={placeholder}
      disabled={readOnly}
      name={`${namePrefix}-new`}
      aria-label={placeholder}
      autoComplete="off"
      data-testid={`${namePrefix}-add-input`}
    />
    <Button
      type="button"
      onClick={onAdd}
      className="h-9 px-3 sm:px-4"
      disabled={readOnly}
      aria-disabled={readOnly}
      aria-label="Ajouter un élément"
      data-testid={`${namePrefix}-add-button`}
    >
      <Plus size={16} className="mr-1" /> Ajouter
    </Button>
  </div>
);

export default ConfigSectionAddRow;
