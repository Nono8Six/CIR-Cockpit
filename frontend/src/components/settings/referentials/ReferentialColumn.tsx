import type { LucideIcon } from 'lucide-react';
import type { ConfigUsageRow } from '../../../../../shared/schemas/system/config.schema';
import ReferentialAddRow from './ReferentialAddRow';
import ReferentialItem from './ReferentialItem';

type ReferentialColumnProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  namePrefix: string;
  count: number;
  list: string[];
  usageRows: ConfigUsageRow[] | null;
  setList: (next: string[]) => void;
  newItem: string;
  setNewItem: (value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, value: string) => void;
  onRename: (index: number, value: string) => void;
  placeholder: string;
  addLabel: string;
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
  description,
  icon: Icon,
  namePrefix,
  count,
  list,
  usageRows,
  setList,
  newItem,
  setNewItem,
  onAdd,
  onRemove,
  onUpdate,
  onRename,
  placeholder,
  addLabel,
  uppercase = false,
  readOnly = false,
}: ReferentialColumnProps) => {
  const usageKnown = usageRows !== null;
  const usageByLabel = new Map(
    (usageRows ?? []).map((row) => [row.label.trim().toLowerCase(), row.usage_count])
  );
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
  const handleMove = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const newList = [...list];
    const [removed] = newList.splice(index, 1);
    newList.splice(targetIndex, 0, removed);
    setList(newList);
  };

  return (
    <section className="flex min-w-0 flex-col border border-border/70 bg-surface-1/45">
      <header className="border-b border-border/70 p-3">
        <div className="flex items-start gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center border border-border bg-background text-muted-foreground">
            <Icon size={14} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-xs font-semibold text-foreground">{title}</h4>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              {description}
            </p>
          </div>
          <span className="bg-background px-2 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground tabular-nums">
            {count}
          </span>
        </div>
      </header>

      <ReferentialAddRow
        newItem={newItem}
        setNewItem={setNewItem}
        onAdd={onAdd}
        placeholder={placeholder}
        namePrefix={namePrefix}
        addLabel={addLabel}
        uppercase={uppercase}
        readOnly={readOnly}
      />

      <div className="max-h-[28rem] flex-1 space-y-1.5 overflow-y-auto p-2">
        {list.length === 0 ? (
          <div className="flex h-24 items-center justify-center border border-dashed border-border/70 bg-background/50 px-3 text-center text-[11px] text-muted-foreground">
            Aucun élément configuré
          </div>
        ) : (
          list.map((item, index) => (
            <ReferentialItem
              key={`${namePrefix}-${index}-${item}`}
              item={item}
              index={index}
              isLast={index === list.length - 1}
              readOnly={readOnly || false}
              namePrefix={namePrefix}
              uppercase={uppercase}
              usageCount={usageKnown ? usageByLabel.get(item.trim().toLowerCase()) ?? 0 : null}
              onUpdate={onUpdate}
              onRename={onRename}
              onRemove={onRemove}
              onMove={handleMove}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          ))
        )}
      </div>
    </section>
  );
};

export default ReferentialColumn;
