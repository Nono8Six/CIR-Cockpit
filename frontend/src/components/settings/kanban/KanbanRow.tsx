import { GripVertical } from 'lucide-react';
import type { AgencyStatus, StatusCategory } from '@/types';
import { STATUS_CATEGORY_LABELS } from '@/constants/statusCategories';
import { Button } from '../../ui/inputs/basic/Button';
import { Input } from '../../ui/inputs/basic/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/inputs/selects/Select';

type KanbanRowProps = {
  status: AgencyStatus;
  index: number;
  readOnly: boolean;
  usageCount: number | null;
  onRemove: (index: number) => void;
  onLabelUpdate: (index: number, value: string) => void;
  onCategoryUpdate: (index: number, value: StatusCategory) => void;
  onRename: (index: number, value: string) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
};

/**
 * Renders an individual draggable status config row.
 * Supports updating the label, shifting category, and HTML5 drag-and-drop reordering.
 *
 * @param {KanbanRowProps} props - The component props.
 * @param {AgencyStatus} props.status - The current agency status object.
 * @param {number} props.index - The index of the status in the list.
 * @param {boolean} props.readOnly - Read-only permissions state.
 * @param {function} props.onRemove - Callback to remove a status.
 * @param {function} props.onLabelUpdate - Callback to update status label.
 * @param {function} props.onCategoryUpdate - Callback to update status category.
 * @param {function} props.onDragStart - HTML5 drag start handler.
 * @param {function} props.onDragOver - HTML5 drag over handler.
 * @param {function} props.onDrop - HTML5 drop handler.
 * @returns {JSX.Element} The rendered status row.
 */
const KanbanRow = ({
  status,
  index,
  readOnly,
  usageCount,
  onRemove,
  onLabelUpdate,
  onCategoryUpdate,
  onRename,
  onDragStart,
  onDragOver,
  onDrop,
}: KanbanRowProps) => {
  const usageKnown = usageCount !== null;
  const handleRename = () => {
    const nextLabel = prompt(`Renommer "${status.label}"`, status.label);
    if (!nextLabel?.trim() || nextLabel.trim() === status.label.trim()) return;
    if (
      usageKnown
      && usageCount > 0
      && !confirm(`${usageCount} interaction(s) utilisent ce statut. Renommer et mettre a jour l'historique ?`)
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
      className={`group grid grid-cols-[auto_minmax(0,1fr)] gap-2 border border-border/50 bg-background px-2 py-2 transition-[background-color,border-color] duration-200 hover:border-border hover:bg-card sm:grid-cols-[auto_minmax(0,1fr)_10rem_auto_auto_auto_auto] sm:items-center ${
        readOnly ? '' : 'cursor-grab active:cursor-grabbing'
      }`}
      data-testid={`settings-status-row-${index}`}
    >
      <div
        className="flex shrink-0 text-muted-foreground/45 transition-colors group-hover:text-muted-foreground/80"
        aria-hidden="true"
      >
        {!readOnly && <GripVertical className="size-4" />}
      </div>

      {/* Status Label Input */}
      <Input
        type="text"
        value={status.label}
        onChange={(event) => onLabelUpdate(index, event.target.value)}
        className={`h-8 min-w-0 border-transparent bg-transparent py-0 text-xs shadow-none focus-visible:ring-1 focus-visible:ring-primary/20 ${
          readOnly ? 'text-muted-foreground/80' : 'text-foreground'
        }`}
        readOnly
        disabled={readOnly}
        name={`status-label-${index}`}
        aria-label={`Statut ${index + 1}`}
        autoComplete="off"
      />

      <div className="col-span-2 sm:col-span-1">
        <Select
          value={status.category}
          disabled={readOnly}
          onValueChange={(value) => onCategoryUpdate(index, value as StatusCategory)}
        >
          <SelectTrigger
            density="dense"
            aria-label={`Catégorie du statut ${index + 1}`}
            data-testid={`settings-status-row-category-${index}`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value} className="text-xs">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {index === 0 && (
        <span className="col-span-1 w-fit shrink-0 border border-primary/25 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary sm:col-span-1">
          Par défaut
        </span>
      )}

      {usageKnown ? (
        <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
          {usageCount} usage
        </span>
      ) : null}

      {!readOnly && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRename}
          className="ml-auto h-7 shrink-0 px-2 text-[11px] text-muted-foreground transition-[background-color,color] hover:bg-accent hover:text-foreground"
          aria-label={`Renommer le statut ${status.label}`}
        >
          Renommer
        </Button>
      )}

      {!readOnly && usageKnown && usageCount === 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          className="ml-auto h-7 shrink-0 px-2 text-[11px] text-muted-foreground transition-[background-color,color] hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
          disabled={false}
          aria-disabled={false}
          aria-label={`Supprimer le statut ${status.label}`}
        >
          Supprimer
        </Button>
      )}
    </div>
  );
};

export default KanbanRow;
