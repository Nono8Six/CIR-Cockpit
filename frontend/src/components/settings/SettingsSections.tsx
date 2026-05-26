import GeneralSettingsCard from './general/GeneralSettingsCard';
import ProductSettingsCard from './product/ProductSettingsCard';
import ReferentialsSection from './referentials/ReferentialsSection';
import KanbanSection from './kanban/KanbanSection';
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
  canEditProductSettings,
  usage,
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
  setAllowManualEntryOverride,
  setDefaultCompanyAccountTypeOverride,
  setProductAllowManualEntry,
  setProductDefaultCompanyAccountType,
  setProductUiShellV2,
  setNewFamily,
  setNewService,
  setNewEntity,
  setNewInteractionType,
  setNewStatus,
  setNewStatusCategory,
  addItem,
  removeItem,
  updateItem,
  renameItem,
  setFamilies,
  setServices,
  setEntities,
  setInteractionTypes,
  setStatuses,
  addStatus,
  removeStatus,
  updateStatusLabel,
  updateStatusCategory,
  renameStatus,
}: SettingsSectionsProps) => {
  const agencyReadOnly = !canEditAgencySettings;
  const productReadOnly = !canEditProductSettings;

  return (
    <div className="min-h-full" data-read-only={readOnly} data-testid="settings-sections">
      {activeSection === 'general' && (
        <GeneralSettingsCard
          allowManualEntryOverride={allowManualEntryOverride}
          defaultCompanyAccountTypeOverride={defaultCompanyAccountTypeOverride}
          productAllowManualEntry={productAllowManualEntry}
          productDefaultCompanyAccountType={productDefaultCompanyAccountType}
          readOnly={agencyReadOnly}
          setAllowManualEntryOverride={setAllowManualEntryOverride}
          setDefaultCompanyAccountTypeOverride={setDefaultCompanyAccountTypeOverride}
        />
      )}

      {activeSection === 'product' && (
        <ProductSettingsCard
          productAllowManualEntry={productAllowManualEntry}
          productDefaultCompanyAccountType={productDefaultCompanyAccountType}
          productUiShellV2={productUiShellV2}
          readOnly={productReadOnly}
          setProductAllowManualEntry={setProductAllowManualEntry}
          setProductDefaultCompanyAccountType={setProductDefaultCompanyAccountType}
          setProductUiShellV2={setProductUiShellV2}
        />
      )}

      {activeSection === 'lists' && (
        <ReferentialsSection
          readOnly={agencyReadOnly}
          usage={usage}
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
          renameItem={renameItem}
          setFamilies={setFamilies}
          setServices={setServices}
          setEntities={setEntities}
          setInteractionTypes={setInteractionTypes}
        />
      )}

      {activeSection === 'workflow' && (
        <KanbanSection
          readOnly={agencyReadOnly}
          usage={usage}
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
    </div>
  );
};

export default SettingsSections;
