import { Trash2, GripVertical } from 'lucide-react';
import type { AgencyStatus, StatusCategory } from '@/types';
import { STATUS_CATEGORY_LABELS } from '@/constants/statusCategories';
import { isStatusCategory } from '@/utils/typeGuards';
import { Button } from '../../ui/inputs/basic/Button';
import { Input } from '../../ui/inputs/basic/Input';

type KanbanRowProps = {
  status: AgencyStatus;
  index: number;
  readOnly: boolean;
  onRemove: (index: number) => void;
  onLabelUpdate: (index: number, value: string) => void;
  onCategoryUpdate: (index: number, value: StatusCategory) => void;
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
  onRemove,
  onLabelUpdate,
  onCategoryUpdate,
  onDragStart,
  onDragOver,
  onDrop,
}: KanbanRowProps) => {
  return (
    <div
      draggable={!readOnly}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
      className={`group flex items-center gap-3 rounded-lg border border-border/40 bg-surface-1/40 px-3 py-2 transition-all duration-200 hover:border-border hover:bg-surface-1/80 ${
        readOnly ? '' : 'cursor-grab active:cursor-grabbing'
      }`}
      data-testid={`settings-status-row-${index}`}
    >
      {!readOnly && (
        <div className="flex shrink-0 text-muted-foreground/45 transition-colors group-hover:text-muted-foreground/80">
          <GripVertical className="size-4" />
        </div>
      )}

      {/* Status Label Input */}
      <Input
        type="text"
        value={status.label}
        onChange={(event) => onLabelUpdate(index, event.target.value)}
        className={`h-8 flex-1 border-transparent bg-transparent py-0 text-xs shadow-none focus-visible:ring-1 focus-visible:ring-primary/20 ${
          readOnly ? 'text-muted-foreground/80' : 'text-foreground'
        }`}
        readOnly={readOnly}
        disabled={readOnly}
        name={`status-label-${index}`}
        aria-label={`Statut ${index + 1}`}
        autoComplete="off"
      />

      {/* Category Dropdown */}
      <select
        value={status.category}
        disabled={readOnly}
        onChange={(e) => {
          const val = e.target.value;
          if (isStatusCategory(val)) {
            onCategoryUpdate(index, val);
          }
        }}
        className="h-8 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={`Catégorie du statut ${index + 1}`}
        data-testid={`settings-status-row-category-${index}`}
      >
        {Object.entries(STATUS_CATEGORY_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {/* Default Badge for the first status */}
      {index === 0 && (
        <span className="shrink-0 rounded-full border border-primary/25 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary">
          Par défaut
        </span>
      )}

      {/* Remove Button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onRemove(index)}
        className={`size-8 shrink-0 text-muted-foreground/50 hover:bg-primary/15 hover:text-primary transition-all ${
          readOnly ? 'hidden' : 'opacity-0 group-hover:opacity-100'
        }`}
        disabled={readOnly}
        aria-disabled={readOnly}
        aria-label="Supprimer le statut"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
};

export default KanbanRow;
