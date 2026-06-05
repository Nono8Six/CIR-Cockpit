import { useState } from 'react';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
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
import RenameDialog from '../ui/RenameDialog';
import ConfirmDialog from '../../ConfirmDialog';

type KanbanRowProps = {
  status: AgencyStatus;
  index: number;
  canRemoveStatus: boolean;
  readOnly: boolean;
  usageCount: number | null;
  onRemove: (index: number, usageCount?: number | null) => void;
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
  canRemoveStatus,
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
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const usageKnown = usageCount !== null;
  const canRemove = !readOnly && Boolean(status.id);

  const handleRenameConfirm = (newValue: string) => {
    onRename(index, newValue);
  };

  const handleDeleteConfirm = () => {
    onRemove(index, usageCount);
  };

  const isUsed = typeof usageCount === 'number' && usageCount > 0;
  const deleteTitle = isUsed ? 'Archiver le statut' : 'Supprimer le statut';
  const deleteDescription = isUsed
    ? `Archiver "${status.label}" ? Il disparaîtra des futures saisies. ${usageCount} interaction(s) existante(s) le conserveront dans l'historique et l'action sera réversible.`
    : `Supprimer "${status.label}" ? Ce statut inutilisé sera définitivement supprimé.`;
  const deleteLabel = isUsed ? 'Archiver' : 'Supprimer';

  return (
    <div
      draggable={!readOnly}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
      className={`group grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-2 border border-border/50 bg-background px-2.5 py-2 transition-[background-color,border-color] duration-200 hover:border-border hover:bg-card sm:grid-cols-[auto_minmax(0,1fr)_10rem_auto_auto_auto_auto] sm:px-2 ${
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
        className={`h-8 min-w-0 border-transparent bg-transparent py-0 text-xs font-medium shadow-none focus-visible:ring-1 focus-visible:ring-primary/20 sm:font-normal ${
          readOnly ? 'text-muted-foreground/80' : 'text-foreground'
        }`}
        readOnly
        disabled={readOnly}
        name={`status-label-${index}`}
        aria-label={`Statut ${index + 1}`}
        autoComplete="off"
      />

      <div className="col-span-2 min-w-0 sm:col-span-1">
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

      <div className="col-span-2 flex min-w-0 items-center justify-between gap-2 border-t border-border/60 pt-1.5 sm:contents sm:border-0 sm:pt-0">
        {index === 0 ? (
          <span className="w-fit shrink-0 border border-primary/25 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary">
            Par défaut
          </span>
        ) : (
          <span className="hidden sm:block" aria-hidden="true" />
        )}

        {usageKnown ? (
          <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
            {usageCount} usage
          </span>
        ) : (
          <span className="hidden sm:block" aria-hidden="true" />
        )}

        <span className="ml-auto flex items-center gap-1 sm:contents">
          {!readOnly && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsRenameOpen(true)}
              className="h-7 w-7 p-0 flex items-center justify-center text-muted-foreground transition-[background-color,color,transform] hover:bg-accent hover:text-accent-foreground active:scale-95"
              aria-label={`Corriger le libellé du statut ${status.label}`}
              title="Corriger le libellé"
            >
              <Pencil className="size-3.5" aria-hidden="true" />
            </Button>
          )}

          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteOpen(true)}
              className="h-7 w-7 p-0 flex items-center justify-center text-muted-foreground transition-[background-color,color,opacity,transform] hover:bg-destructive/10 hover:text-destructive active:scale-95 disabled:opacity-40"
              disabled={!canRemoveStatus}
              aria-label={canRemoveStatus ? `${deleteLabel} le statut ${status.label}` : 'Au moins un statut actif est requis'}
              title={canRemoveStatus ? deleteLabel : 'Au moins un statut actif est requis'}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </Button>
          )}
        </span>
      </div>

      {!readOnly && (
        <RenameDialog
          open={isRenameOpen}
          onOpenChange={setIsRenameOpen}
          title={`Corriger le libellé "${status.label}"`}
          defaultValue={status.label}
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
          confirmLabel={deleteLabel}
          cancelLabel="Annuler"
          variant="destructive"
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
};

export default KanbanRow;
