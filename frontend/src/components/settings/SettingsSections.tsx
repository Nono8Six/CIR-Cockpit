import GeneralSettingsCard from './general/GeneralSettingsCard';
import ProductSettingsCard from './product/ProductSettingsCard';
import ReferentialsSection from './referentials/ReferentialsSection';
import KanbanSection from './kanban/KanbanSection';
import type { SettingsSectionsProps } from './settings-sections.types';

/**
 * Renders the settings sections by grouping General onboarding, Product-wide settings,
 * Referentials columns, and Kanban workflow stages into a cohesive section stack.
 *
 * @param {SettingsSectionsProps} props - The component properties.
 * @returns {JSX.Element} The rendered settings sections view.
 */
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
  setStatuses,
  addStatus,
  removeStatus,
  updateStatusLabel,
  updateStatusCategory,
}: SettingsSectionsProps) => {
  const agencyReadOnly = !canEditAgencySettings;
  const productReadOnly = !canEditProductSettings;

  return (
    <div className="space-y-8" data-read-only={readOnly} data-testid="settings-sections">
      {/* General Settings Section */}
      <GeneralSettingsCard
        allowManualEntryOverride={allowManualEntryOverride}
        defaultCompanyAccountTypeOverride={defaultCompanyAccountTypeOverride}
        productAllowManualEntry={productAllowManualEntry}
        productDefaultCompanyAccountType={productDefaultCompanyAccountType}
        readOnly={agencyReadOnly}
        setAllowManualEntryOverride={setAllowManualEntryOverride}
        setDefaultCompanyAccountTypeOverride={setDefaultCompanyAccountTypeOverride}
      />

      {/* Product Settings Section */}
      <ProductSettingsCard
        productAllowManualEntry={productAllowManualEntry}
        productDefaultCompanyAccountType={productDefaultCompanyAccountType}
        productUiShellV2={productUiShellV2}
        readOnly={productReadOnly}
        setProductAllowManualEntry={setProductAllowManualEntry}
        setProductDefaultCompanyAccountType={setProductDefaultCompanyAccountType}
        setProductUiShellV2={setProductUiShellV2}
      />

      {/* Referentials Section */}
      <ReferentialsSection
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

      {/* Kanban Stages Section */}
      <KanbanSection
        readOnly={agencyReadOnly}
        statuses={statuses}
        newStatus={newStatus}
        newStatusCategory={newStatusCategory}
        setNewStatus={setNewStatus}
        setNewStatusCategory={setNewStatusCategory}
        addStatus={addStatus}
        removeStatus={removeStatus}
        updateStatusLabel={updateStatusLabel}
        updateStatusCategory={updateStatusCategory}
        setStatuses={setStatuses}
      />
    </div>
  );
};

export default SettingsSections;
