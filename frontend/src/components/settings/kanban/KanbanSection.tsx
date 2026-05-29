import { Kanban } from 'lucide-react';
import type { ConfigUsageSnapshot } from '../../../../../shared/schemas/system/config.schema';
import type { AgencyStatus, StatusCategory } from '@/types';
import { STATUS_CATEGORY_LABELS } from '@/constants/statusCategories';
import SettingsSectionShell from '../ui/SettingsSectionShell';
import KanbanAddBar from './KanbanAddBar';
import KanbanRow from './KanbanRow';
import KanbanSimulator from './KanbanSimulator';

type KanbanSectionProps = {
  readOnly: boolean;
  usage: ConfigUsageSnapshot | null;
  statuses: AgencyStatus[];
  newStatus: string;
  newStatusCategory: StatusCategory;
  setNewStatus: (value: string) => void;
  setNewStatusCategory: (value: StatusCategory) => void;
  addStatus: () => void;
  removeStatus: (index: number, usageCount?: number | null) => void;
  updateStatusLabel: (index: number, label: string) => void;
  updateStatusCategory: (index: number, category: StatusCategory) => void;
  renameStatus: (index: number, nextLabel: string) => void;
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
  usage,
  statuses,
  newStatus,
  newStatusCategory,
  setNewStatus,
  setNewStatusCategory,
  addStatus,
  removeStatus,
  updateStatusLabel,
  updateStatusCategory,
  renameStatus,
  setStatuses,
}: KanbanSectionProps) => {
  const statusUsageById = new Map(
    (usage?.dimensions.statuses ?? [])
      .filter((row) => row.reference_id)
      .map((row) => [row.reference_id as string, row.usage_count])
  );
  const historicalStatuses = (usage?.dimensions.statuses ?? []).filter(
    (row) => row.state === 'historical_used'
  );
  const orphanStatuses = (usage?.dimensions.statuses ?? []).filter(
    (row) => row.state === 'used_not_in_reference'
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

    const newStatuses = [...statuses];
    const [removed] = newStatuses.splice(sourceIndex, 1);
    newStatuses.splice(targetIndex, 0, removed);
    setStatuses(newStatuses);
  };

  return (
    <SettingsSectionShell
      id="settings-section-kanban"
      title="Statuts des interactions"
      description="Ordre et catégorie des statuts visibles dans le pilotage. Le premier statut reste la valeur appliquée par défaut."
      icon={Kanban}
      badge={readOnly ? 'Lecture seule' : 'Édition'}
      badgeTone={readOnly ? 'warning' : 'default'}
    >
      {usage && orphanStatuses.length > 0 && (
        <div className="mb-3 border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
          <div className="font-semibold">Statuts orphelins sans référentiel</div>
          <div className="mt-1 max-w-[72ch] leading-relaxed">
            Ces valeurs existent dans des interactions, mais ne pointent plus vers un statut connu.
            Elles doivent être auditées séparément.
          </div>
        </div>
      )}

      {usage && historicalStatuses.length > 0 && (
        <div className="mb-3 border border-border bg-surface-1 p-3 text-xs">
          <div className="font-semibold text-foreground">Statuts historiques</div>
          <div className="mt-1 max-w-[72ch] leading-relaxed text-muted-foreground">
            Retirés du workflow actif. Les interactions existantes conservent leur statut, mais les
            nouvelles saisies doivent utiliser un statut actif.
          </div>
          <div className="mt-3 divide-y divide-border/70 border border-border bg-background">
            {historicalStatuses.map((row) => (
              <div
                key={row.reference_id ?? row.label}
                className="grid grid-cols-[minmax(0,1fr)_7rem_5rem] items-center gap-3 px-3 py-2"
              >
                <span className="truncate font-medium text-foreground">{row.label}</span>
                <span className="text-muted-foreground">
                  {row.category ? STATUS_CATEGORY_LABELS[row.category] : 'Non classé'}
                </span>
                <span className="text-right font-mono text-muted-foreground tabular-nums">
                  {row.usage_count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {usage && (
        <div className="mb-3 border border-border bg-background p-3 text-xs">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Statuts configurés
          </div>
          <div className="mt-1 font-mono text-lg font-semibold tabular-nums">{statuses.length}</div>
        </div>
      )}

      <KanbanAddBar
        newStatus={newStatus}
        newStatusCategory={newStatusCategory}
        readOnly={readOnly}
        onStatusChange={setNewStatus}
        onCategoryChange={setNewStatusCategory}
        onAdd={addStatus}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-foreground">Statuts configurés</span>
            <span className="font-mono text-muted-foreground tabular-nums">
              {statuses.length}
            </span>
          </div>
          <div className="max-h-[360px] space-y-1.5 overflow-y-auto pr-1">
        {statuses.length === 0 ? (
          <div className="flex h-28 items-center justify-center border border-dashed border-border/70 bg-surface-1/45 px-3 text-center text-xs text-muted-foreground">
            Aucun statut configuré
          </div>
        ) : (
          statuses.map((status, index) => (
            <KanbanRow
              key={status.id || `${index}-${status.label}`}
              status={status}
              index={index}
              readOnly={readOnly}
              usageCount={usage && status.id ? statusUsageById.get(status.id) ?? 0 : null}
              onRemove={removeStatus}
              onLabelUpdate={updateStatusLabel}
              onCategoryUpdate={updateStatusCategory}
              onRename={renameStatus}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          ))
        )}
          </div>
        </div>

        <KanbanSimulator statuses={statuses} />
      </div>
    </SettingsSectionShell>
  );
};

export default KanbanSection;
