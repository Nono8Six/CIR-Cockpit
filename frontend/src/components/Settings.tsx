import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AgencyConfig } from '@/services/config';
import {
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
import ConfirmDialog from './ConfirmDialog';


interface SettingsProps {
  config: AgencyConfig;
  canEditAgencySettings: boolean;
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
 * @param {string | null} props.agencyId - The active agency ID.
 * @returns {JSX.Element} The rendered settings dashboard screen.
 */
const Settings = ({
  config,
  canEditAgencySettings,
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
    references: {
      statuses: config.statuses,
      historical_statuses: config.historicalStatuses,
      services: config.services,
      families: config.families,
      interaction_types: config.interactionTypes,
      resolutions: config.resolutions ?? [],
      departments: []
    }
  };
  const {
    readOnly,
    isSaving,
    families,
    services,
    interactionTypes,
    statuses,
    newFamily,
    newService,
    newInteractionType,
    newStatus,
    newStatusCategory,
    setNewFamily,
    setNewService,
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
    setInteractionTypes,
    addStatus,
    removeStatus,
    updateStatusLabel,
    updateStatusCategory,
    renameStatus,
    setStatuses,
    canRunImmediateAction,
    isDirty
  } = useSettingsState({
    snapshot,
    canEditAgencySettings,
    agencyId
  });

  const [activeSection, setActiveSection] = useState<string>('workflow');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const usage = usageQuery.data ?? null;

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

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
            unresolvedCount={usage?.totals.unresolved ?? 0}
          />
        </div>
        <div className="overflow-auto bg-background p-4">
          <SettingsSections
            readOnly={readOnly}
            activeSection={activeSection}
            canEditAgencySettings={canEditAgencySettings}
            usage={usage}
            usageLoading={usageQuery.isLoading}
            agencyId={agencyId}
            onExamineIntegrity={() => setActiveSection('integrity')}
            canRunImmediateAction={canRunImmediateAction}
            families={families}
            services={services}
            interactionTypes={interactionTypes}
            statuses={statuses}
            newFamily={newFamily}
            newService={newService}
            newInteractionType={newInteractionType}
            newStatus={newStatus}
            newStatusCategory={newStatusCategory}
            setNewFamily={setNewFamily}
            setNewService={setNewService}
            setNewInteractionType={setNewInteractionType}
            setNewStatus={setNewStatus}
            setNewStatusCategory={setNewStatusCategory}
            addItem={addItem}
            removeItem={removeItem}
            updateItem={updateItem}
            renameItem={renameItem}
            setFamilies={setFamilies}
            setServices={setServices}
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
        onReset={() => setIsResetConfirmOpen(true)}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={isResetConfirmOpen}
        onOpenChange={setIsResetConfirmOpen}
        title="Réinitialiser la configuration"
        description="Êtes-vous sûr de vouloir recharger la configuration depuis la base ? Toutes vos modifications non enregistrées seront perdues."
        confirmLabel="Réinitialiser"
        cancelLabel="Annuler"
        variant="destructive"
        onConfirm={handleReset}
      />
    </div>
  );
};

export default Settings;
