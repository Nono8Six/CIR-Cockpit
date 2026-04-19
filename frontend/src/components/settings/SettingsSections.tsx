import type { ReactNode } from 'react';
import { Layers3, Settings2, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import SettingsConfigColumns from './SettingsConfigColumns';
import SettingsStatusColumn from './SettingsStatusColumn';
import type { SettingsSectionsProps } from './SettingsSections.types';

type SettingsCardProps = {
  title: string;
  description: string;
  icon: typeof Settings2;
  badge: string;
  readOnly: boolean;
  children: ReactNode;
};

const SettingsCard = ({
  title,
  description,
  icon: Icon,
  badge,
  readOnly,
  children
}: SettingsCardProps) => (
  <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <Badge variant="outline" className="border-border bg-surface-1 text-[10px] font-bold uppercase tracking-[0.12em]">
        {readOnly ? `${badge} lecture seule` : badge}
      </Badge>
    </div>
    <div className="space-y-4">{children}</div>
  </section>
);

type SettingsSelectFieldProps = {
  label: string;
  description: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled: boolean;
  items: Array<{ value: string; label: string }>;
};

const SettingsSelectField = ({
  label,
  description,
  value,
  onValueChange,
  disabled,
  items
}: SettingsSelectFieldProps) => (
  <div className="space-y-2">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </div>
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger density="dense" className="w-full bg-background">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

const SettingsSections = ({
  readOnly,
  canEditAgencySettings,
  canEditProductSettings,
  allowManualEntryOverride,
  defaultCompanyAccountTypeOverride,
  productAllowManualEntry,
  productDefaultCompanyAccountType,
  productUiShellV2,
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
  setAllowManualEntryOverride,
  setDefaultCompanyAccountTypeOverride,
  setProductAllowManualEntry,
  setProductDefaultCompanyAccountType,
  setProductUiShellV2,
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
  const agencyReadOnly = !canEditAgencySettings;
  const productReadOnly = !canEditProductSettings;

  return (
    <div className="space-y-6" data-read-only={readOnly} data-testid="settings-sections">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SettingsCard
          title="Parametres onboarding agence"
          description="Ces overrides s appliquent seulement a l agence active et completent les defaults produit."
          icon={Layers3}
          badge="Agence"
          readOnly={agencyReadOnly}
        >
          <SettingsSelectField
            label="Saisie manuelle"
            description="Choisit si l agence herite du comportement global ou force l activation/la desactivation de la saisie manuelle."
            value={allowManualEntryOverride}
            onValueChange={(value) => setAllowManualEntryOverride(value as 'inherit' | 'enabled' | 'disabled')}
            disabled={agencyReadOnly}
            items={[
              { value: 'inherit', label: 'Heriter du produit' },
              { value: 'enabled', label: 'Toujours autoriser' },
              { value: 'disabled', label: 'Toujours bloquer' }
            ]}
          />

          <SettingsSelectField
            label="Compte entreprise par defaut"
            description="Fixe le type de compte applique par defaut lors de la creation d un client societe."
            value={defaultCompanyAccountTypeOverride}
            onValueChange={(value) => setDefaultCompanyAccountTypeOverride(value as 'inherit' | 'term' | 'cash')}
            disabled={agencyReadOnly}
            items={[
              { value: 'inherit', label: 'Heriter du produit' },
              { value: 'term', label: 'A terme' },
              { value: 'cash', label: 'Comptant' }
            ]}
          />

          <div className="rounded-md border border-border-subtle bg-surface-1/40 px-3 py-2 text-xs text-muted-foreground">
            Les particuliers restent forces en <strong>comptant</strong>. Ce point est volontairement hors parametrage.
          </div>
        </SettingsCard>

        <SettingsCard
          title="Parametres produit"
          description="Flags et defaults globaux partages par toutes les agences. Cette zone reste reservee aux super_admin."
          icon={Sparkles}
          badge="Produit"
          readOnly={productReadOnly}
        >
          <div className="flex items-start justify-between gap-4 rounded-md border border-border-subtle bg-surface-1/40 px-3 py-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">UI shell v2</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Active le shell v2 comme mode par defaut. Les overrides utilisateur `?ui=` et stockage local restent prioritaires.
              </p>
            </div>
            <Switch
              checked={productUiShellV2}
              onCheckedChange={setProductUiShellV2}
              disabled={productReadOnly}
              aria-label="Activer le shell UI v2"
            />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-md border border-border-subtle bg-surface-1/40 px-3 py-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Saisie manuelle</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Controle le comportement par defaut du parcours onboarding tant qu une agence ne le surcharge pas.
              </p>
            </div>
            <Switch
              checked={productAllowManualEntry}
              onCheckedChange={setProductAllowManualEntry}
              disabled={productReadOnly}
              aria-label="Autoriser la saisie manuelle par defaut"
            />
          </div>

          <SettingsSelectField
            label="Compte entreprise par defaut"
            description="Valeur globale appliquee a la creation d un client entreprise en l absence de surcharge agence."
            value={productDefaultCompanyAccountType}
            onValueChange={(value) => setProductDefaultCompanyAccountType(value as 'term' | 'cash')}
            disabled={productReadOnly}
            items={[
              { value: 'term', label: 'A terme' },
              { value: 'cash', label: 'Comptant' }
            ]}
          />
        </SettingsCard>
      </div>

      <div className="grid min-h-[500px] grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5 lg:gap-6">
        <SettingsConfigColumns
          readOnly={agencyReadOnly}
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
          readOnly={agencyReadOnly}
        />
      </div>
    </div>
  );
};

export default SettingsSections;
