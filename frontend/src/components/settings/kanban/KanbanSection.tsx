import { Kanban } from 'lucide-react';
import type { AgencyStatus, StatusCategory } from '@/types';
import { Badge } from '../../ui/data-display/Badge';
import KanbanAddBar from './KanbanAddBar';
import KanbanRow from './KanbanRow';
import KanbanSimulator from './KanbanSimulator';

type KanbanSectionProps = {
  readOnly: boolean;
  statuses: AgencyStatus[];
  newStatus: string;
  newStatusCategory: StatusCategory;
  setNewStatus: (value: string) => void;
  setNewStatusCategory: (value: StatusCategory) => void;
  addStatus: () => void;
  removeStatus: (index: number) => void;
  updateStatusLabel: (index: number, label: string) => void;
  updateStatusCategory: (index: number, category: StatusCategory) => void;
  setStatuses: (next: AgencyStatus[]) => void;
};

/**
 * Bento card component for Kanban Statuses configuration.
 * Groups creation forms, status drag-and-drop lists, and live simulator dashboard.
 *
 * @param {KanbanSectionProps} props - The component props.
 * @param {boolean} props.readOnly - Read-only permissions state.
 * @param {AgencyStatus[]} props.statuses - The active list of configured statuses.
 * @param {string} props.newStatus - Label input value for new status.
 * @param {StatusCategory} props.newStatusCategory - Selected category for new status.
 * @param {function} props.setNewStatus - Label input state modifier.
 * @param {function} props.setNewStatusCategory - Category selection state modifier.
 * @param {function} props.addStatus - Trigger status creation callback.
 * @param {function} props.removeStatus - Trigger status deletion callback.
 * @param {function} props.updateStatusLabel - Trigger status label update callback.
 * @param {function} props.updateStatusCategory - Trigger status category update callback.
 * @param {function} props.setStatuses - Callback to reorder statuses list.
 * @returns {JSX.Element} The rendered Kanban configuration section.
 */
const KanbanSection = ({
  readOnly,
  statuses,
  newStatus,
  newStatusCategory,
  setNewStatus,
  setNewStatusCategory,
  addStatus,
  removeStatus,
  updateStatusLabel,
  updateStatusCategory,
  setStatuses,
}: KanbanSectionProps) => {
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

    const newStatuses = [...statuses];
    const [removed] = newStatuses.splice(sourceIndex, 1);
    newStatuses.splice(targetIndex, 0, removed);
    setStatuses(newStatuses);
  };

  return (
    <section
      id="settings-section-kanban"
      className="scroll-mt-6 rounded-xl border border-border/80 bg-card p-6 shadow-sm transition-all hover:shadow-md"
    >
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Kanban className="size-4" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Statuts et étapes du workflow Kanban
            </h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Organisez et gérez les étapes par lesquelles passent vos dossiers clients. Le premier statut est appliqué par défaut.
          </p>
        </div>
        <Badge
          variant="outline"
          className="w-fit border-border bg-surface-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
        >
          {readOnly ? 'Lecture Seule' : 'Édition'}
        </Badge>
      </div>

      {/* Add Bar */}
      <KanbanAddBar
        newStatus={newStatus}
        newStatusCategory={newStatusCategory}
        readOnly={readOnly}
        onStatusChange={setNewStatus}
        onCategoryChange={setNewStatusCategory}
        onAdd={addStatus}
      />

      {/* List Container */}
      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
        {statuses.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-border/60 text-xs text-muted-foreground/60">
            Aucun statut de configuré
          </div>
        ) : (
          statuses.map((status, index) => (
            <KanbanRow
              key={status.id || `${index}-${status.label}`}
              status={status}
              index={index}
              readOnly={readOnly}
              onRemove={removeStatus}
              onLabelUpdate={updateStatusLabel}
              onCategoryUpdate={updateStatusCategory}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          ))
        )}
      </div>

      {/* Live Kanban Preview */}
      <KanbanSimulator statuses={statuses} />
    </section>
  );
};

export default KanbanSection;
