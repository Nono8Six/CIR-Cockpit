import { Plus } from 'lucide-react';
import type { StatusCategory } from '@/types';
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

type KanbanAddBarProps = {
  newStatus: string;
  newStatusCategory: StatusCategory;
  readOnly: boolean;
  onStatusChange: (value: string) => void;
  onCategoryChange: (value: StatusCategory) => void;
  onAdd: () => void;
};

/**
 * Renders an input bar with an integrated category dropdown to append new Kanban statuses.
 *
 * @param {KanbanAddBarProps} props - The component props.
 * @param {string} props.newStatus - The new status name string.
 * @param {StatusCategory} props.newStatusCategory - The selected category type.
 * @param {boolean} props.readOnly - Read-only permissions state.
 * @param {function} props.onStatusChange - Callback to edit status label input.
 * @param {function} props.onCategoryChange - Callback to change status category dropdown.
 * @param {function} props.onAdd - Callback to trigger creation.
 * @returns {JSX.Element} The rendered add bar.
 */
const KanbanAddBar = ({
  newStatus,
  newStatusCategory,
  readOnly,
  onStatusChange,
  onCategoryChange,
  onAdd,
}: KanbanAddBarProps) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!readOnly) {
        onAdd();
      }
    }
  };

  if (readOnly) return null;

  return (
    <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2 lg:grid-cols-[minmax(0,1fr)_11rem_auto] lg:items-center">
      <Input
        type="text"
        value={newStatus}
        onChange={(event) => onStatusChange(event.target.value)}
        onKeyDown={handleKeyDown}
        className="col-span-2 h-8 border-border/80 bg-background text-xs focus-visible:ring-1 focus-visible:ring-primary/20 placeholder:text-muted-foreground/50 lg:col-span-1"
        placeholder="Ex: En attente validation…"
        name="status-new-label"
        aria-label="Nouveau statut"
        autoComplete="off"
        data-testid="settings-status-add-input"
      />

      <div className="min-w-0">
        <Select
          value={newStatusCategory}
          onValueChange={(value) => onCategoryChange(value as StatusCategory)}
        >
          <SelectTrigger density="dense" aria-label="Catégorie par défaut">
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

      <Button
        type="button"
        onClick={onAdd}
        size="sm"
        className="h-8 shrink-0 gap-1 bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/95"
        disabled={readOnly || !newStatus.trim()}
        aria-disabled={readOnly || !newStatus.trim()}
        aria-label="Ajouter le statut"
        data-testid="settings-status-add-button"
      >
        <Plus className="size-3.5" />
        Ajouter
      </Button>
    </div>
  );
};

export default KanbanAddBar;
