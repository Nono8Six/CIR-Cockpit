import { Plus } from 'lucide-react';
import type { StatusCategory } from '@/types';
import { STATUS_CATEGORY_LABELS } from '@/constants/statusCategories';
import { Button } from '../../ui/inputs/basic/Button';
import { Input } from '../../ui/inputs/basic/Input';

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
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
      {/* Label Input */}
      <Input
        type="text"
        value={newStatus}
        onChange={(event) => onStatusChange(event.target.value)}
        onKeyDown={handleKeyDown}
        className="h-8 flex-1 border-border/80 bg-surface-1/40 text-xs focus-visible:ring-1 focus-visible:ring-primary/20 placeholder:text-muted-foreground/50"
        placeholder="Nom du nouveau statut (ex: En attente validation)"
        name="status-new-label"
        aria-label="Nouveau statut"
        autoComplete="off"
        data-testid="settings-status-add-input"
      />

      {/* Category Dropdown */}
      <select
        value={newStatusCategory}
        onChange={(e) => onCategoryChange(e.target.value as StatusCategory)}
        className="h-8 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 shrink-0"
        aria-label="Catégorie par défaut"
      >
        {Object.entries(STATUS_CATEGORY_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {/* Add Button */}
      <Button
        type="button"
        onClick={onAdd}
        size="sm"
        className="h-8 bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm transition-colors shrink-0 gap-1"
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
