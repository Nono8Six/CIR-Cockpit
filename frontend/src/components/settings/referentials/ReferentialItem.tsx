import { useState } from 'react';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../../ui/inputs/basic/Button';
import { Input } from '../../ui/inputs/basic/Input';
import RenameDialog from '../ui/RenameDialog';
import ConfirmDialog from '../../ConfirmDialog';

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
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const usageKnown = usageCount !== null;
  const canRemove = !readOnly && (!usageKnown || usageCount === 0);

  const handleRenameConfirm = (newValue: string) => {
    onRename(index, newValue);
  };

  const handleDeleteConfirm = () => {
    onRemove(index);
  };

  const deleteTitle = "Supprimer l'élément";
  const deleteDescription = `Êtes-vous sûr de vouloir supprimer définitivement l'élément "${item}" de cette liste ?`;

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
          onClick={() => setIsRenameOpen(true)}
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 flex items-center justify-center text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground active:scale-95"
          aria-label={`Renommer ${item}`}
          title="Renommer"
        >
          <Pencil className="size-3.5" aria-hidden="true" />
        </Button>
      )}
      {canRemove && (
        <Button
          type="button"
          onClick={() => setIsDeleteOpen(true)}
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 flex items-center justify-center text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive active:scale-95 disabled:opacity-40"
          disabled={false}
          aria-disabled={false}
          aria-label={`Supprimer ${item}`}
          title="Supprimer"
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </Button>
      )}

      {!readOnly && (
        <RenameDialog
          open={isRenameOpen}
          onOpenChange={setIsRenameOpen}
          title={`Renommer "${item}"`}
          defaultValue={item}
          usageCount={usageCount}
          onConfirm={handleRenameConfirm}
        />
      )}

      {canRemove && (
        <ConfirmDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          title={deleteTitle}
          description={deleteDescription}
          confirmLabel="Supprimer"
          cancelLabel="Annuler"
          variant="destructive"
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
};

export default ReferentialItem;
