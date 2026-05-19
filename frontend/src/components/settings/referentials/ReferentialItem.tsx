import { Trash2, GripVertical } from 'lucide-react';
import { Button } from '../../ui/inputs/basic/Button';
import { Input } from '../../ui/inputs/basic/Input';

type ReferentialItemProps = {
  item: string;
  index: number;
  readOnly: boolean;
  namePrefix: string;
  uppercase: boolean;
  onUpdate: (index: number, value: string) => void;
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
  onUpdate,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
}: ReferentialItemProps) => {
  return (
    <div
      draggable={!readOnly}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
      className={`group flex items-center gap-2 rounded-lg border border-border/40 bg-surface-1/40 px-2 py-1.5 transition-all duration-200 hover:border-border hover:bg-surface-1/80 ${
        readOnly ? '' : 'cursor-grab active:cursor-grabbing'
      }`}
      data-testid={`${namePrefix}-row-${index}`}
    >
      {!readOnly && (
        <div className="flex shrink-0 text-muted-foreground/45 transition-colors group-hover:text-muted-foreground/80">
          <GripVertical className="size-4" />
        </div>
      )}
      <Input
        type="text"
        value={item}
        onChange={(event) => onUpdate(index, event.target.value)}
        className={`h-8 flex-1 border-transparent bg-transparent py-0 text-xs shadow-none focus-visible:ring-1 focus-visible:ring-primary/20 ${
          uppercase ? 'font-bold uppercase tracking-wider' : ''
        } ${readOnly ? 'text-muted-foreground/80' : 'text-foreground'}`}
        readOnly={readOnly}
        disabled={readOnly}
        name={`${namePrefix}-${index}`}
        aria-label={`${namePrefix} ${index + 1}`}
        autoComplete="off"
      />
      <Button
        type="button"
        onClick={() => onRemove(index)}
        variant="ghost"
        size="icon"
        className={`size-7 shrink-0 text-muted-foreground/50 hover:bg-primary/15 hover:text-primary transition-all ${
          readOnly ? 'hidden' : 'opacity-0 group-hover:opacity-100'
        }`}
        disabled={readOnly}
        aria-disabled={readOnly}
        aria-label="Supprimer l'élément"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
};

export default ReferentialItem;
