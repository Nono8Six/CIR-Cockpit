import type { LucideIcon } from 'lucide-react';
import ReferentialAddRow from './ReferentialAddRow';
import ReferentialItem from './ReferentialItem';

type ReferentialColumnProps = {
  title: string;
  icon: LucideIcon;
  namePrefix: string;
  count: number;
  list: string[];
  setList: (next: string[]) => void;
  newItem: string;
  setNewItem: (value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, value: string) => void;
  placeholder: string;
  uppercase?: boolean;
  readOnly?: boolean;
};

/**
 * A layout column containing a referential item list.
 * Integrates HTML5 Drag-and-Drop to reorder items dynamically without external plugins.
 *
 * @param {ReferentialColumnProps} props - The component props.
 * @param {string} props.title - Title of the referential column.
 * @param {LucideIcon} props.icon - Lucide icon class for the header.
 * @param {string} props.namePrefix - HTML input name prefix.
 * @param {number} props.count - Total count of elements.
 * @param {string[]} props.list - Array of list elements.
 * @param {function} props.setList - State updater to reorder list items.
 * @param {string} props.newItem - The input state value.
 * @param {function} props.setNewItem - The input state setter.
 * @param {function} props.onAdd - Callback to add elements.
 * @param {function} props.onRemove - Callback to remove elements.
 * @param {function} props.onUpdate - Callback to update item content.
 * @param {string} props.placeholder - Input placeholder text.
 * @param {boolean} [props.uppercase=false] - Force uppercase text.
 * @param {boolean} [props.readOnly=false] - Read-only permissions state.
 * @returns {JSX.Element} The rendered column.
 */
const ReferentialColumn = ({
  title,
  icon: Icon,
  namePrefix,
  count,
  list,
  setList,
  newItem,
  setNewItem,
  onAdd,
  onRemove,
  onUpdate,
  placeholder,
  uppercase = false,
  readOnly = false,
}: ReferentialColumnProps) => {
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndexStr = e.dataTransfer.getData('text/plain');
    if (sourceIndexStr === '') return;
    const sourceIndex = parseInt(sourceIndexStr, 10);
    if (isNaN(sourceIndex) || sourceIndex === targetIndex) return;

    const newList = [...list];
    const [removed] = newList.splice(sourceIndex, 1);
    newList.splice(targetIndex, 0, removed);
    setList(newList);
  };

  return (
    <div className="flex h-[380px] flex-col rounded-xl border border-border bg-card/65 p-4 shadow-sm backdrop-blur-[2px] transition-all hover:shadow-md">
      <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold text-foreground">
        <Icon size={14} className="text-muted-foreground" aria-hidden="true" />
        <span className="flex-1 truncate">{title}</span>
        <span className="rounded-full bg-surface-1 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {count}
        </span>
      </h4>

      <ReferentialAddRow
        newItem={newItem}
        setNewItem={setNewItem}
        onAdd={onAdd}
        placeholder={placeholder}
        namePrefix={namePrefix}
        uppercase={uppercase}
        readOnly={readOnly}
      />

      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {list.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border/60 text-[11px] text-muted-foreground/60">
            Aucun élément
          </div>
        ) : (
          list.map((item, index) => (
            <ReferentialItem
              key={`${namePrefix}-${index}-${item}`}
              item={item}
              index={index}
              readOnly={readOnly || false}
              namePrefix={namePrefix}
              uppercase={uppercase}
              onUpdate={onUpdate}
              onRemove={onRemove}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ReferentialColumn;
