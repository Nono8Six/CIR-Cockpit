import { AgencyConfig } from '@/services/config';
import { DEFAULT_AGENCY_SETTINGS, DEFAULT_APP_SETTINGS } from 'shared/schemas/config.schema';
import { useConfigSnapshot } from '@/hooks/useConfigSnapshot';
import { useSettingsState } from '@/hooks/useSettingsState';
import SettingsHeader from './settings/SettingsHeader';
import SettingsReadOnlyBanner from './settings/SettingsReadOnlyBanner';
import SettingsSections from './settings/SettingsSections';

interface SettingsProps {
  config: AgencyConfig;
  canEditAgencySettings: boolean;
  canEditProductSettings: boolean;
  agencyId: string | null;
}

const Settings = ({
  config,
  canEditAgencySettings,
  canEditProductSettings,
  agencyId
}: SettingsProps) => {
  const snapshotQuery = useConfigSnapshot(agencyId, Boolean(agencyId));
  const snapshot = snapshotQuery.data ?? {
    product: DEFAULT_APP_SETTINGS,
    agency: DEFAULT_AGENCY_SETTINGS,
    references: {
      statuses: config.statuses,
      services: config.services,
      entities: config.entities,
      families: config.families,
      interaction_types: config.interactionTypes,
      departments: []
    }
  };
  const {
    readOnly,
    isSaving,
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
  } = useSettingsState({
    snapshot,
    canEditAgencySettings,
    canEditProductSettings,
    agencyId
  });

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm" data-testid="settings-root">
      <SettingsHeader readOnly={readOnly} isSaving={isSaving} onReset={handleReset} onSave={handleSave} />

      {(readOnly || !canEditProductSettings) && (
        <SettingsReadOnlyBanner
          readOnly={readOnly}
          canEditProductSettings={canEditProductSettings}
        />
      )}

      <div className="flex-1 overflow-auto bg-surface-1/70 p-4 sm:p-6">
        <SettingsSections
          readOnly={readOnly}
          canEditAgencySettings={canEditAgencySettings}
          canEditProductSettings={canEditProductSettings}
          allowManualEntryOverride={allowManualEntryOverride}
          defaultCompanyAccountTypeOverride={defaultCompanyAccountTypeOverride}
          productAllowManualEntry={productAllowManualEntry}
          productDefaultCompanyAccountType={productDefaultCompanyAccountType}
          productUiShellV2={productUiShellV2}
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
          setAllowManualEntryOverride={setAllowManualEntryOverride}
          setDefaultCompanyAccountTypeOverride={setDefaultCompanyAccountTypeOverride}
          setProductAllowManualEntry={setProductAllowManualEntry}
          setProductDefaultCompanyAccountType={setProductDefaultCompanyAccountType}
          setProductUiShellV2={setProductUiShellV2}
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


