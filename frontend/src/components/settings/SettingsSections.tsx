import SettingsConfigColumns from './SettingsConfigColumns';
import SettingsStatusColumn from './SettingsStatusColumn';
import type { SettingsSectionsProps } from './SettingsSections.types';

const SettingsSections = ({
  readOnly,
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
}: SettingsSectionsProps) => {
  return (
    <div className="grid h-full min-h-[500px] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5 lg:gap-6" data-testid="settings-sections">
      <SettingsConfigColumns
        readOnly={readOnly}
        families={families}
        services={services}
        entities={entities}
        interactionTypes={interactionTypes}
        newFamily={newFamily}
        newService={newService}
        newEntity={newEntity}
        newInteractionType={newInteractionType}
        setNewFamily={setNewFamily}
        setNewService={setNewService}
        setNewEntity={setNewEntity}
        setNewInteractionType={setNewInteractionType}
        addItem={addItem}
        removeItem={removeItem}
        updateItem={updateItem}
        setFamilies={setFamilies}
        setServices={setServices}
        setEntities={setEntities}
        setInteractionTypes={setInteractionTypes}
      />
      <SettingsStatusColumn
        statuses={statuses}
        newStatus={newStatus}
        newStatusCategory={newStatusCategory}
        setNewStatus={setNewStatus}
        setNewStatusCategory={setNewStatusCategory}
        addStatus={addStatus}
        removeStatus={removeStatus}
        updateStatusLabel={updateStatusLabel}
        updateStatusCategory={updateStatusCategory}
        readOnly={readOnly}
      />
    </div>
  );
};

export default SettingsSections;
