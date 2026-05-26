import { AlertTriangle, Boxes, PhoneCall, Tags, Users2 } from 'lucide-react';
import type {
  ConfigUsageSnapshot,
  EditableConfigReferenceDimension
} from '../../../../../shared/schemas/system/config.schema';
import SettingsSectionShell from '../ui/SettingsSectionShell';
import ReferentialColumn from './ReferentialColumn';

type ReferentialsSectionProps = {
  readOnly: boolean;
  usage: ConfigUsageSnapshot | null;
  families: string[];
  services: string[];
  entities: string[];
  interactionTypes: string[];
  newFamily: string;
  newService: string;
  newEntity: string;
  newInteractionType: string;
  setNewFamily: (value: string) => void;
  setNewService: (value: string) => void;
  setNewEntity: (value: string) => void;
  setNewInteractionType: (value: string) => void;
  addItem: (
    dimension: EditableConfigReferenceDimension,
    item: string,
    list: string[],
    setList: (list: string[]) => void,
    clearInput: () => void,
    uppercase?: boolean,
  ) => void;
  removeItem: (
    dimension: EditableConfigReferenceDimension,
    index: number,
    list: string[],
    setList: (list: string[]) => void
  ) => void;
  updateItem: (
    index: number,
    value: string,
    list: string[],
    setList: (list: string[]) => void,
    uppercase?: boolean,
  ) => void;
  renameItem: (
    dimension: EditableConfigReferenceDimension,
    index: number,
    nextLabel: string,
    list: string[],
    setList: (list: string[]) => void,
    uppercase?: boolean,
  ) => void;
  setFamilies: (next: string[]) => void;
  setServices: (next: string[]) => void;
  setEntities: (next: string[]) => void;
  setInteractionTypes: (next: string[]) => void;
};

const ReferentialsSection = ({
  readOnly,
  usage,
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
  renameItem,
  setFamilies,
  setServices,
  setEntities,
  setInteractionTypes,
}: ReferentialsSectionProps) => {
  const dimensions = usage?.dimensions;
  const orphanRows = [
    ...(dimensions?.services ?? []),
    ...(dimensions?.families ?? []),
    ...(dimensions?.entities ?? []),
    ...(dimensions?.interaction_types ?? [])
  ].filter((row) => row.state === 'used_not_in_reference');

  return (
    <SettingsSectionShell
      id="settings-section-referentials"
      title="Listes de saisie des interactions"
      description={"Ces valeurs alimentent directement la saisie : types de tiers, service appelé, familles produits et type d'interaction."}
      icon={Boxes}
      badge={readOnly ? 'Lecture seule' : 'Édition'}
      badgeTone={readOnly ? 'warning' : 'default'}
    >
      {orphanRows.length > 0 && (
        <div className="mb-3 border border-amber-300 bg-amber-50 p-3">
          <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold text-amber-950">
            <AlertTriangle className="size-4" aria-hidden="true" />
            Valeurs déjà utilisées mais absentes des listes
          </h4>
          <p className="mb-2 max-w-[72ch] text-xs leading-relaxed text-amber-950/80">
            Ces libellés existent dans des interactions historiques. Ils sont affichés ici pour éviter
            de croire qu&apos;une suppression de liste efface l&apos;historique.
          </p>
          <div className="flex flex-wrap gap-2">
            {orphanRows.map((row) => (
              <span
                key={`${row.label}-${row.usage_count}`}
                className="border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] text-amber-950"
              >
                {row.label} · {row.usage_count}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,22rem),1fr))] items-start gap-3">
        <ReferentialColumn
          title="Types de tiers"
          description="Libellés métier proposés pour qualifier le tiers rattaché à une interaction."
          icon={Tags}
          namePrefix="entities"
          count={entities.length}
          list={entities}
          usageRows={dimensions ? dimensions.entities : null}
          setList={setEntities}
          newItem={newEntity}
          setNewItem={setNewEntity}
          onAdd={() => addItem('entities', newEntity, entities, setEntities, () => setNewEntity(''))}
          onRemove={(index) => removeItem('entities', index, entities, setEntities)}
          onUpdate={(index, value) => updateItem(index, value, entities, setEntities)}
          onRename={(index, value) => renameItem('entities', index, value, entities, setEntities)}
          placeholder="Ex: Client, Prospect…"
          addLabel="Ajouter un type de tiers"
          readOnly={readOnly}
        />

        <ReferentialColumn
          title="Familles produits"
          description="Tags techniques ajoutés sur une interaction. Ils servent au pilotage et au filtrage métier."
          icon={Boxes}
          namePrefix="families"
          count={families.length}
          list={families}
          usageRows={dimensions ? dimensions.families : null}
          setList={setFamilies}
          newItem={newFamily}
          setNewItem={setNewFamily}
          onAdd={() => addItem('families', newFamily, families, setFamilies, () => setNewFamily(''), true)}
          onRemove={(index) => removeItem('families', index, families, setFamilies)}
          onUpdate={(index, value) => updateItem(index, value, families, setFamilies, true)}
          onRename={(index, value) => renameItem('families', index, value, families, setFamilies, true)}
          placeholder="NOUVELLE FAMILLE…"
          addLabel="Ajouter une famille produit"
          uppercase
          readOnly={readOnly}
        />

        <ReferentialColumn
          title="Services"
          description="Service CIR ou interlocuteur interne rattaché à la demande dans le formulaire de saisie."
          icon={Users2}
          namePrefix="services"
          count={services.length}
          list={services}
          usageRows={dimensions ? dimensions.services : null}
          setList={setServices}
          newItem={newService}
          setNewItem={setNewService}
          onAdd={() => addItem('services', newService, services, setServices, () => setNewService(''))}
          onRemove={(index) => removeItem('services', index, services, setServices)}
          onUpdate={(index, value) => updateItem(index, value, services, setServices)}
          onRename={(index, value) => renameItem('services', index, value, services, setServices)}
          placeholder="Nouveau service…"
          addLabel="Ajouter un service"
          readOnly={readOnly}
        />

        <ReferentialColumn
          title="Types d'interaction"
          description={"Classification obligatoire de l'échange : devis, SAV, relance ou autre catégorie suivie."}
          icon={PhoneCall}
          namePrefix="interaction-types"
          count={interactionTypes.length}
          list={interactionTypes}
          usageRows={dimensions ? dimensions.interaction_types : null}
          setList={setInteractionTypes}
          newItem={newInteractionType}
          setNewItem={setNewInteractionType}
          onAdd={() =>
            addItem(
              'interaction_types',
              newInteractionType,
              interactionTypes,
              setInteractionTypes,
              () => setNewInteractionType(''),
            )
          }
          onRemove={(index) => removeItem('interaction_types', index, interactionTypes, setInteractionTypes)}
          onUpdate={(index, value) =>
            updateItem(index, value, interactionTypes, setInteractionTypes)
          }
          onRename={(index, value) =>
            renameItem('interaction_types', index, value, interactionTypes, setInteractionTypes)
          }
          placeholder="Ex: Devis, SAV…"
          addLabel="Ajouter un type d'interaction"
          readOnly={readOnly}
        />
      </div>
    </SettingsSectionShell>
  );
};

export default ReferentialsSection;
