import { AgencyConfig } from '@/services/config';
import { useSettingsState } from '@/hooks/useSettingsState';
import SettingsHeader from './settings/SettingsHeader';
import SettingsReadOnlyBanner from './settings/SettingsReadOnlyBanner';
import SettingsSections from './settings/SettingsSections';

interface SettingsProps {
  config: AgencyConfig;
  canEdit: boolean;
  agencyId: string | null;
}

const Settings = ({ config, canEdit, agencyId }: SettingsProps) => {
  const {
    readOnly,
    isSaving,
    families,
    services,
    entities,
    interactionTypes,
    statuses,
    newFamily,
    newService,
    newEntity,
    newInteractionType,
    newStatus,
    newStatusCategory,
    setNewFamily,
    setNewService,
    setNewEntity,
    setNewInteractionType,
    setNewStatus,
    setNewStatusCategory,
    handleSave,
    handleReset,
    addItem,
    removeItem,
    updateItem,
    setFamilies,
    setServices,
    setEntities,
    setInteractionTypes,
    addStatus,
    removeStatus,
    updateStatusLabel,
    updateStatusCategory
  } = useSettingsState({ config, canEdit, agencyId });

  return (
    <div className="h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      <SettingsHeader readOnly={readOnly} isSaving={isSaving} onReset={handleReset} onSave={handleSave} />

      {readOnly && <SettingsReadOnlyBanner />}

      <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
        <SettingsSections
          readOnly={readOnly}
          families={families}
          services={services}
          entities={entities}
          interactionTypes={interactionTypes}
          statuses={statuses}
          newFamily={newFamily}
          newService={newService}
          newEntity={newEntity}
          newInteractionType={newInteractionType}
          newStatus={newStatus}
          newStatusCategory={newStatusCategory}
          setNewFamily={setNewFamily}
          setNewService={setNewService}
          setNewEntity={setNewEntity}
          setNewInteractionType={setNewInteractionType}
          setNewStatus={setNewStatus}
          setNewStatusCategory={setNewStatusCategory}
          addItem={addItem}
          removeItem={removeItem}
          updateItem={updateItem}
          setFamilies={setFamilies}
          setServices={setServices}
          setEntities={setEntities}
          setInteractionTypes={setInteractionTypes}
          addStatus={addStatus}
          removeStatus={removeStatus}
          updateStatusLabel={updateStatusLabel}
          updateStatusCategory={updateStatusCategory}
        />
      </div>
    </div>
  );
};

export default Settings;


