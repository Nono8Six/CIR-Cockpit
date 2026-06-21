import { AlertTriangle, Boxes, PhoneCall, Users2 } from 'lucide-react';
import type {
  AgencyInteractionTypeConfig,
  ConfigUsageSnapshot,
  EditableConfigReferenceDimension
} from '../../../../../shared/schemas/system/config.schema';
import SettingsSectionShell from '../ui/SettingsSectionShell';
import { Button } from '@/components/ui/inputs/basic/Button';
import { normalizeInteractionTypeConfig, type AgencyInteractionTypeLike } from '@/services/config';
import ReferentialColumn from './ReferentialColumn';

type ReferentialsSectionProps = {
  readOnly: boolean;
  onExamineIntegrity?: () => void;
  usage: ConfigUsageSnapshot | null;
  families: string[];
  services: string[];
  interactionTypes: AgencyInteractionTypeLike[];
  newFamily: string;
  newService: string;
  newInteractionType: string;
  setNewFamily: (value: string) => void;
  setNewService: (value: string) => void;
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
  setInteractionTypes: (next: AgencyInteractionTypeConfig[]) => void;
};

const toInteractionTypeLabels = (items: AgencyInteractionTypeLike[]): string[] =>
  items.map((item) => typeof item === 'string' ? item : item.label);

const buildInteractionTypeList = (
  labels: string[],
  previous: AgencyInteractionTypeConfig[]
): AgencyInteractionTypeConfig[] =>
  labels.map((label, index) => {
    const current = previous.find((item) => item.label === label);
    return {
      ...(current?.id ? { id: current.id } : {}),
      ...(current?.agency_id ? { agency_id: current.agency_id } : {}),
      label,
      requires_product_families: current?.requires_product_families ?? false,
      sort_order: index + 1
    };
  });

const ReferentialsSection = ({
  readOnly,
  onExamineIntegrity = () => undefined,
  usage,
  families,
  services,
  interactionTypes,
  newFamily,
  newService,
  newInteractionType,
  setNewFamily,
  setNewService,
  setNewInteractionType,
  addItem,
  removeItem,
  updateItem,
  renameItem,
  setFamilies,
  setServices,
  setInteractionTypes,
}: ReferentialsSectionProps) => {
  const dimensions = usage?.dimensions;
  const orphanRows = [
    ...(dimensions?.services ?? []),
    ...(dimensions?.families ?? []),
    ...(dimensions?.interaction_types ?? [])
  ].filter((row) => row.state === 'unresolved');
  const normalizedInteractionTypes = normalizeInteractionTypeConfig(interactionTypes);
  const interactionTypeLabels = toInteractionTypeLabels(normalizedInteractionTypes);
  const setInteractionTypeLabels = (labels: string[]) => {
    setInteractionTypes(buildInteractionTypeList(labels, normalizedInteractionTypes));
  };
  return (
    <SettingsSectionShell
      id="settings-section-referentials"
      title="Listes de saisie des interactions"
      description={"Ces valeurs alimentent directement la saisie : service appelé, familles produits et type d'interaction."}
      icon={Boxes}
      badge={readOnly ? 'Lecture seule' : 'Édition'}
      badgeTone={readOnly ? 'warning' : 'default'}
    >
      {orphanRows.length > 0 && (
        <div className="mb-3 border border-amber-300 bg-amber-50 p-3">
          <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold text-amber-950">
            <AlertTriangle className="size-4" aria-hidden="true" />
            {orphanRows.length} anomalie(s) historique(s) nécessite(nt) une vérification
          </h4>
          <p className="mb-2 max-w-[72ch] text-xs leading-relaxed text-amber-950/80">
            Examinez ces valeurs dans Historique &amp; intégrité pour les rattacher ou créer une valeur active.
          </p>
          <Button size="dense" variant="outline" onClick={onExamineIntegrity}>Examiner</Button>
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,22rem),1fr))] items-start gap-3">
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
          count={normalizedInteractionTypes.length}
          list={interactionTypeLabels}
          usageRows={dimensions ? dimensions.interaction_types : null}
          setList={setInteractionTypeLabels}
          newItem={newInteractionType}
          setNewItem={setNewInteractionType}
          onAdd={() =>
            addItem(
              'interaction_types',
              newInteractionType,
              interactionTypeLabels,
              setInteractionTypeLabels,
              () => setNewInteractionType(''),
            )
          }
          onRemove={(index) => removeItem('interaction_types', index, interactionTypeLabels, setInteractionTypeLabels)}
          onUpdate={(index, value) =>
            updateItem(index, value, interactionTypeLabels, setInteractionTypeLabels)
          }
          onRename={(index, value) =>
            renameItem('interaction_types', index, value, interactionTypeLabels, setInteractionTypeLabels)
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
