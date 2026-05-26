import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AgencyConfig } from '@/services/config';
import {
  DEFAULT_AGENCY_SETTINGS,
  DEFAULT_APP_SETTINGS,
  type ConfigUsageSnapshot
} from '../../../shared/schemas/system/config.schema';
import { useConfigSnapshot } from '../hooks/cockpit-utils/useConfigSnapshot';
import { useSettingsState } from '@/hooks/settings-state/useSettingsState';
import { getConfigUsage } from '@/services/config';
import { createAppError } from '@/services/errors/AppError';
import { configUsageKey } from '@/services/query/queryKeys';
import SettingsHeader from './settings/SettingsHeader';
import SettingsReadOnlyBanner from './settings/SettingsReadOnlyBanner';
import SettingsSections from './settings/SettingsSections';
import SettingsSidebar from './settings/sidebar/SettingsSidebar';
import SettingsActionDrawer from './settings/ui/SettingsActionDrawer';

interface SettingsProps {
  config: AgencyConfig;
  canEditAgencySettings: boolean;
  canEditProductSettings: boolean;
  agencyId: string | null;
}

/**
 * Main Settings component that orchestrates agency and product configurations.
 * Coordinates layout split into a sticky sidebar and bento scroll stack,
 * and mounts the floating bottom actions drawer.
 *
 * @param {SettingsProps} props - The component properties.
 * @param {AgencyConfig} props.config - Pre-loaded default configuration context.
 * @param {boolean} props.canEditAgencySettings - Flag indicating whether user can edit agency-level settings.
 * @param {boolean} props.canEditProductSettings - Flag indicating whether user can edit product-level settings.
 * @param {string | null} props.agencyId - The active agency ID.
 * @returns {JSX.Element} The rendered settings dashboard screen.
 */
const Settings = ({
  config,
  canEditAgencySettings,
  canEditProductSettings,
  agencyId
}: SettingsProps) => {
  const snapshotQuery = useConfigSnapshot(agencyId, Boolean(agencyId));
  const usageQuery = useQuery<ConfigUsageSnapshot>({
    queryKey: agencyId ? configUsageKey(agencyId) : ['config-usage', 'none'],
    queryFn: () => {
      if (!agencyId) {
        return Promise.reject(createAppError({
          code: 'AGENCY_ID_INVALID',
          message: 'Identifiant agence requis.',
          source: 'validation'
        }));
      }
      return getConfigUsage(agencyId);
    },
    enabled: Boolean(agencyId),
    staleTime: 60_000
  });
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
    handleSave,
    handleReset,
    addItem,
    removeItem,
    updateItem,
    renameItem,
    setFamilies,
    setServices,
    setEntities,
    setInteractionTypes,
    addStatus,
    removeStatus,
    updateStatusLabel,
    updateStatusCategory,
    renameStatus,
    setStatuses,
    isDirty
  } = useSettingsState({
    snapshot,
    canEditAgencySettings,
    canEditProductSettings,
    agencyId
  });

  const [activeSection, setActiveSection] = useState<string>('general');
  const usage = usageQuery.data ?? null;

  return (
    <div className="flex h-full flex-col overflow-hidden border border-border bg-surface-1" data-testid="settings-root">
      <SettingsHeader
        readOnly={readOnly}
      />

      {readOnly && (
        <SettingsReadOnlyBanner
          readOnly={readOnly}
        />
      )}

      <div className="grid flex-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden lg:grid-cols-[18rem_minmax(0,1fr)] lg:grid-rows-1">
        <div className="shrink-0 border-b border-border bg-surface-2 p-3 lg:border-b-0 lg:border-r">
          <SettingsSidebar
            activeSection={activeSection}
            readOnly={readOnly}
            isDirty={isDirty}
            onSectionChange={setActiveSection}
          />
        </div>
        <div className="overflow-auto bg-background p-4">
          <SettingsSections
            readOnly={readOnly}
            activeSection={activeSection}
            canEditAgencySettings={canEditAgencySettings}
            canEditProductSettings={canEditProductSettings}
            usage={usage}
            usageLoading={usageQuery.isLoading}
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
            setAllowManualEntryOverride={setAllowManualEntryOverride}
            setDefaultCompanyAccountTypeOverride={setDefaultCompanyAccountTypeOverride}
            setProductAllowManualEntry={setProductAllowManualEntry}
            setProductDefaultCompanyAccountType={setProductDefaultCompanyAccountType}
            setProductUiShellV2={setProductUiShellV2}
            setNewFamily={setNewFamily}
            setNewService={setNewService}
            setNewEntity={setNewEntity}
            setNewInteractionType={setNewInteractionType}
            setNewStatus={setNewStatus}
            setNewStatusCategory={setNewStatusCategory}
            addItem={addItem}
            removeItem={removeItem}
            updateItem={updateItem}
            renameItem={renameItem}
            setFamilies={setFamilies}
            setServices={setServices}
            setEntities={setEntities}
            setInteractionTypes={setInteractionTypes}
            setStatuses={setStatuses}
            addStatus={addStatus}
            removeStatus={removeStatus}
            updateStatusLabel={updateStatusLabel}
            updateStatusCategory={updateStatusCategory}
            renameStatus={renameStatus}
          />
        </div>
      </div>

      <SettingsActionDrawer
        isDirty={isDirty}
        isSaving={isSaving}
        readOnly={readOnly}
        onReset={handleReset}
        onSave={handleSave}
      />
    </div>
  );
};

export default Settings;
