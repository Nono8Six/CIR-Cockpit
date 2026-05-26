import { GripVertical } from 'lucide-react';
import { Button } from '../../ui/inputs/basic/Button';
import { Input } from '../../ui/inputs/basic/Input';

type ReferentialItemProps = {
  item: string;
  index: number;
  readOnly: boolean;
  namePrefix: string;
  uppercase: boolean;
  usageCount: number | null;
  onUpdate: (index: number, value: string) => void;
  onRename: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
};

/**
 * Renders an individual draggable referential item.
 * Supports HTML5 Drag-and-Drop and inline modification.
 *
 * @param {ReferentialItemProps} props - The component props.
 * @param {string} props.item - The current item value.
 * @param {number} props.index - The index of the item.
 * @param {boolean} props.readOnly - Whether the list is read-only.
 * @param {string} props.namePrefix - The form input name prefix.
 * @param {boolean} props.uppercase - Whether to force uppercase text.
 * @param {function} props.onUpdate - Callback when item is edited.
 * @param {function} props.onRemove - Callback when item is deleted.
 * @param {function} props.onDragStart - Drag start event handler.
 * @param {function} props.onDragOver - Drag over event handler.
 * @param {function} props.onDrop - Drop event handler.
 * @returns {JSX.Element} The rendered referential item.
 */
const ReferentialItem = ({
  item,
  index,
  readOnly,
  namePrefix,
  uppercase,
  usageCount,
  onUpdate,
  onRename,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
}: ReferentialItemProps) => {
  const usageKnown = usageCount !== null;
  const handleRename = () => {
    const nextLabel = prompt(`Renommer "${item}"`, item);
    if (!nextLabel?.trim() || nextLabel.trim() === item.trim()) return;
    if (
      usageKnown
      && usageCount > 0
      && !confirm(`${usageCount} interaction(s) utilisent "${item}". Renommer et mettre a jour l'historique ?`)
    ) {
      return;
    }
    onRename(index, nextLabel);
  };

  return (
    <div
      draggable={!readOnly}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
      className={`group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border border-border/50 bg-background px-2 py-1.5 transition-[background-color,border-color] duration-200 hover:border-border hover:bg-card sm:grid-cols-[auto_minmax(0,1fr)_4.5rem_auto_auto] ${
        readOnly ? '' : 'cursor-grab active:cursor-grabbing'
      }`}
      data-testid={`${namePrefix}-row-${index}`}
    >
      {!readOnly && (
        <div className="flex shrink-0 text-muted-foreground/45 transition-colors group-hover:text-muted-foreground/80" aria-hidden="true">
          <GripVertical className="size-4" />
        </div>
      )}
      <Input
        type="text"
        value={item}
        onChange={(event) => onUpdate(index, event.target.value)}
        className={`h-8 min-w-0 flex-1 border-transparent bg-transparent py-0 text-xs shadow-none focus-visible:ring-1 focus-visible:ring-primary/20 ${
          uppercase ? 'font-bold uppercase tracking-wider' : ''
        } ${readOnly ? 'text-muted-foreground/80' : 'text-foreground'}`}
        readOnly
        disabled={readOnly}
        name={`${namePrefix}-${index}`}
        aria-label={`${namePrefix} ${index + 1}`}
        autoComplete="off"
      />
      {usageKnown ? (
        <span className="hidden text-right font-mono text-[10px] text-muted-foreground tabular-nums sm:block">
          {usageCount} usage
        </span>
      ) : null}
      {!readOnly && (
        <Button
          type="button"
          onClick={handleRename}
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-2 text-[11px] text-muted-foreground transition-[background-color,color] hover:bg-accent hover:text-foreground"
          aria-label={`Renommer ${item}`}
        >
          Renommer
        </Button>
      )}
      {!readOnly && usageKnown && usageCount === 0 && (
        <Button
          type="button"
          onClick={() => onRemove(index)}
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-2 text-[11px] text-muted-foreground transition-[background-color,color] hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
          disabled={false}
          aria-disabled={false}
          aria-label={`Supprimer ${item}`}
        >
          Supprimer
        </Button>
      )}
    </div>
  );
};

export default ReferentialItem;
