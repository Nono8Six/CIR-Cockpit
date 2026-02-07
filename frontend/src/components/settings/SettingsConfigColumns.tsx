import ConfigSection from './ConfigSection';
import type { SettingsConfigColumnsProps } from './SettingsConfigColumns.types';

const SettingsConfigColumns = ({
  readOnly,
  families,
  services,
  entities,
  interactionTypes,
  newFamily,
  newService,
  newEntity,
  newInteractionType,
  setNewFamily,
  setNewService,
  setNewEntity,
  setNewInteractionType,
  addItem,
  removeItem,
  updateItem,
  setFamilies,
  setServices,
  setEntities,
  setInteractionTypes
}: SettingsConfigColumnsProps) => (
  <>
    <ConfigSection
      title="📦 Familles Produits"
      namePrefix="families"
      count={families.length}
      list={families}
      newItem={newFamily}
      setNewItem={setNewFamily}
      onAdd={() => addItem(newFamily, families, setFamilies, () => setNewFamily(''), true)}
      onRemove={(index) => removeItem(index, families, setFamilies)}
      onUpdate={(index, value) => updateItem(index, value, families, setFamilies, true)}
      placeholder="NOUVELLE FAMILLE..."
      uppercase
      readOnly={readOnly}
    />

    <ConfigSection
      title="👥 Services"
      namePrefix="services"
      count={services.length}
      list={services}
      newItem={newService}
      setNewItem={setNewService}
      onAdd={() => addItem(newService, services, setServices, () => setNewService(''))}
      onRemove={(index) => removeItem(index, services, setServices)}
      onUpdate={(index, value) => updateItem(index, value, services, setServices)}
      placeholder="Nouveau service..."
      readOnly={readOnly}
    />

    <ConfigSection
      title="🏷️ Types de Tiers"
      namePrefix="entities"
      count={entities.length}
      list={entities}
      newItem={newEntity}
      setNewItem={setNewEntity}
      onAdd={() => addItem(newEntity, entities, setEntities, () => setNewEntity(''))}
      onRemove={(index) => removeItem(index, entities, setEntities)}
      onUpdate={(index, value) => updateItem(index, value, entities, setEntities)}
      placeholder="Ex: Client Export..."
      readOnly={readOnly}
    />

    <ConfigSection
      title="☎️ Types d'interaction"
      namePrefix="interaction-types"
      count={interactionTypes.length}
      list={interactionTypes}
      newItem={newInteractionType}
      setNewItem={setNewInteractionType}
      onAdd={() =>
        addItem(
          newInteractionType,
          interactionTypes,
          setInteractionTypes,
          () => setNewInteractionType('')
        )
      }
      onRemove={(index) => removeItem(index, interactionTypes, setInteractionTypes)}
      onUpdate={(index, value) =>
        updateItem(index, value, interactionTypes, setInteractionTypes)
      }
      placeholder="Ex: Devis, SAV..."
      readOnly={readOnly}
    />
  </>
);

export default SettingsConfigColumns;
