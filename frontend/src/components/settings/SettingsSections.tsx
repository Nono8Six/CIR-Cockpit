import ReferentialsSection from './referentials/ReferentialsSection';
import KanbanSection from './kanban/KanbanSection';
import IntegritySection from './integrity/IntegritySection';
import type { SettingsSectionsProps } from './settings-sections.types';

/**
 * Renders settings as focused internal subpages for workflow and form lists.
 *
 * @param {SettingsSectionsProps} props - The component properties.
 * @returns {JSX.Element} The rendered settings sections view.
 */
const SettingsSections = ({
  readOnly,
  activeSection,
  canEditAgencySettings,
  usage,
  agencyId = null,
  onExamineIntegrity = () => undefined,
  canRunImmediateAction,
  families,
  services,
  interactionTypes,
  statuses,
  newFamily,
  newService,
  newInteractionType,
  newStatus,
  newStatusCategory,
  setNewFamily,
  setNewService,
  setNewInteractionType,
  setNewStatus,
  setNewStatusCategory,
  addItem,
  removeItem,
  updateItem,
  renameItem,
  setFamilies,
  setServices,
  setInteractionTypes,
  setStatuses,
  addStatus,
  removeStatus,
  updateStatusLabel,
  updateStatusCategory,
  renameStatus,
}: SettingsSectionsProps) => {
  const agencyReadOnly = !canEditAgencySettings;

  return (
    <div className="min-h-full" data-read-only={readOnly} data-testid="settings-sections">
      {activeSection === 'lists' && (
        <ReferentialsSection
          readOnly={agencyReadOnly}
          usage={usage}
          onExamineIntegrity={onExamineIntegrity}
          families={families}
          services={services}
          interactionTypes={interactionTypes}
          newFamily={newFamily}
          newService={newService}
          newInteractionType={newInteractionType}
          setNewFamily={setNewFamily}
          setNewService={setNewService}
          setNewInteractionType={setNewInteractionType}
          addItem={addItem}
          removeItem={removeItem}
          updateItem={updateItem}
          renameItem={renameItem}
          setFamilies={setFamilies}
          setServices={setServices}
          setInteractionTypes={setInteractionTypes}
        />
      )}

      {activeSection === 'workflow' && (
        <KanbanSection
          readOnly={agencyReadOnly}
          usage={usage}
          onExamineIntegrity={onExamineIntegrity}
          statuses={statuses}
          newStatus={newStatus}
          newStatusCategory={newStatusCategory}
          setNewStatus={setNewStatus}
          setNewStatusCategory={setNewStatusCategory}
          addStatus={addStatus}
          removeStatus={removeStatus}
          updateStatusLabel={updateStatusLabel}
          updateStatusCategory={updateStatusCategory}
          renameStatus={renameStatus}
          setStatuses={setStatuses}
        />
      )}
      {activeSection === 'integrity' ? <IntegritySection agencyId={agencyId} readOnly={agencyReadOnly} usage={usage} canRunImmediateAction={canRunImmediateAction} /> : null}
    </div>
  );
};

export default SettingsSections;
