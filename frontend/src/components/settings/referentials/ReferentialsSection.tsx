import { Boxes, Users2, Tags, PhoneCall, LayoutGrid } from 'lucide-react';
import { Badge } from '../../ui/data-display/Badge';
import ReferentialColumn from './ReferentialColumn';

type ReferentialsSectionProps = {
  readOnly: boolean;
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
    item: string,
    list: string[],
    setList: (list: string[]) => void,
    clearInput: () => void,
    uppercase?: boolean,
  ) => void;
  removeItem: (index: number, list: string[], setList: (list: string[]) => void) => void;
  updateItem: (
    index: number,
    value: string,
    list: string[],
    setList: (list: string[]) => void,
    uppercase?: boolean,
  ) => void;
  setFamilies: (next: string[]) => void;
  setServices: (next: string[]) => void;
  setEntities: (next: string[]) => void;
  setInteractionTypes: (next: string[]) => void;
};

/**
 * Section grouping all referentials in a beautiful, interactive responsive grid.
 *
 * @param {ReferentialsSectionProps} props - The component props.
 * @param {boolean} props.readOnly - Read-only permissions state.
 * @param {string[]} props.families - List of families.
 * @param {string[]} props.services - List of services.
 * @param {string[]} props.entities - List of entities.
 * @param {string[]} props.interactionTypes - List of interactions.
 * @param {string} props.newFamily - Input for new family.
 * @param {string} props.newService - Input for new service.
 * @param {string} props.newEntity - Input for new entity.
 * @param {string} props.newInteractionType - Input for new interaction.
 * @param {function} props.setNewFamily - State modifier for family input.
 * @param {function} props.setNewService - State modifier for service input.
 * @param {function} props.setNewEntity - State modifier for entity input.
 * @param {function} props.setNewInteractionType - State modifier for interaction input.
 * @param {function} props.addItem - Helper function to add elements.
 * @param {function} props.removeItem - Helper function to remove elements.
 * @param {function} props.updateItem - Helper function to update elements.
 * @param {function} props.setFamilies - Callback to update families list.
 * @param {function} props.setServices - Callback to update services list.
 * @param {function} props.setEntities - Callback to update entities list.
 * @param {function} props.setInteractionTypes - Callback to update interactions list.
 * @returns {JSX.Element} The rendered referentials grid section.
 */
const ReferentialsSection = ({
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
  setInteractionTypes,
}: ReferentialsSectionProps) => {
  return (
    <section
      id="settings-section-referentials"
      className="scroll-mt-6 rounded-xl border border-border/80 bg-card p-6 shadow-sm transition-all hover:shadow-md"
    >
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <LayoutGrid className="size-4" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Référentiels et listes de valeurs
            </h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Gérez les valeurs globales utilisées dans les différents modules et formulaires de l&apos;application. Glissez-déposez pour réordonner.
          </p>
        </div>
        <Badge
          variant="outline"
          className="w-fit border-border bg-surface-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
        >
          {readOnly ? 'Lecture Seule' : 'Édition'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Familles */}
        <ReferentialColumn
          title="Familles produits"
          icon={Boxes}
          namePrefix="families"
          count={families.length}
          list={families}
          setList={setFamilies}
          newItem={newFamily}
          setNewItem={setNewFamily}
          onAdd={() => addItem(newFamily, families, setFamilies, () => setNewFamily(''), true)}
          onRemove={(index) => removeItem(index, families, setFamilies)}
          onUpdate={(index, value) => updateItem(index, value, families, setFamilies, true)}
          placeholder="NOUVELLE FAMILLE..."
          uppercase
          readOnly={readOnly}
        />

        {/* Services */}
        <ReferentialColumn
          title="Services"
          icon={Users2}
          namePrefix="services"
          count={services.length}
          list={services}
          setList={setServices}
          newItem={newService}
          setNewItem={setNewService}
          onAdd={() => addItem(newService, services, setServices, () => setNewService(''))}
          onRemove={(index) => removeItem(index, services, setServices)}
          onUpdate={(index, value) => updateItem(index, value, services, setServices)}
          placeholder="Nouveau service..."
          readOnly={readOnly}
        />

        {/* Types de tiers */}
        <ReferentialColumn
          title="Types de tiers"
          icon={Tags}
          namePrefix="entities"
          count={entities.length}
          list={entities}
          setList={setEntities}
          newItem={newEntity}
          setNewItem={setNewEntity}
          onAdd={() => addItem(newEntity, entities, setEntities, () => setNewEntity(''))}
          onRemove={(index) => removeItem(index, entities, setEntities)}
          onUpdate={(index, value) => updateItem(index, value, entities, setEntities)}
          placeholder="Ex: Client Export..."
          readOnly={readOnly}
        />

        {/* Types d'interactions */}
        <ReferentialColumn
          title="Types d'interaction"
          icon={PhoneCall}
          namePrefix="interaction-types"
          count={interactionTypes.length}
          list={interactionTypes}
          setList={setInteractionTypes}
          newItem={newInteractionType}
          setNewItem={setNewInteractionType}
          onAdd={() =>
            addItem(
              newInteractionType,
              interactionTypes,
              setInteractionTypes,
              () => setNewInteractionType(''),
            )
          }
          onRemove={(index) => removeItem(index, interactionTypes, setInteractionTypes)}
          onUpdate={(index, value) =>
            updateItem(index, value, interactionTypes, setInteractionTypes)
          }
          placeholder="Ex: Devis, SAV..."
          readOnly={readOnly}
        />
      </div>
    </section>
  );
};

export default ReferentialsSection;
