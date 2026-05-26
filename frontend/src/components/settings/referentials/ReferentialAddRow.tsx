import { Plus } from 'lucide-react';
import { Button } from '../../ui/inputs/basic/Button';
import { Input } from '../../ui/inputs/basic/Input';

type ReferentialAddRowProps = {
  newItem: string;
  setNewItem: (value: string) => void;
  onAdd: () => void;
  placeholder: string;
  namePrefix: string;
  addLabel: string;
  uppercase?: boolean;
  readOnly?: boolean;
};

/**
 * Renders an input bar to add new items into a referential list.
 *
 * @param {ReferentialAddRowProps} props - The component props.
 * @param {string} props.newItem - The active value of the input.
 * @param {function} props.setNewItem - State setter for the input.
 * @param {function} props.onAdd - Callback to add the item.
 * @param {string} props.placeholder - Input placeholder text.
 * @param {string} props.namePrefix - HTML input name prefix.
 * @param {boolean} [props.uppercase=false] - Whether to transform typed characters to uppercase.
 * @param {boolean} [props.readOnly=false] - Whether adding is disabled.
 * @returns {JSX.Element} The rendered add row.
 */
const ReferentialAddRow = ({
  newItem,
  setNewItem,
  onAdd,
  placeholder,
  namePrefix,
  addLabel,
  uppercase = false,
  readOnly = false,
}: ReferentialAddRowProps) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onAdd();
    }
  };

  if (readOnly) return null;

  return (
    <div className="border-b border-border/70 p-2">
      <div className="flex items-center gap-2">
        <Input
          type="text"
          placeholder={placeholder}
          value={newItem}
          onChange={(event) =>
            setNewItem(uppercase ? event.target.value.toUpperCase() : event.target.value)
          }
          onKeyDown={handleKeyDown}
          className="h-8 flex-1 border-border/80 bg-background text-xs focus-visible:ring-1 focus-visible:ring-primary/20 placeholder:text-muted-foreground/50"
          name={`new-${namePrefix}`}
          aria-label={addLabel}
          autoComplete="off"
        />
        <Button
          type="button"
          onClick={onAdd}
          size="icon"
          className="size-8 shrink-0 bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/95"
          aria-label={addLabel}
          disabled={!newItem.trim()}
          aria-disabled={!newItem.trim()}
        >
          <Plus className="size-3.5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
};

export default ReferentialAddRow;
