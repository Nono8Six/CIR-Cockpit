import { useState, useRef, useEffect } from 'react';
import { AgencyConfig } from '@/services/config';
import { DEFAULT_AGENCY_SETTINGS, DEFAULT_APP_SETTINGS } from '../../../shared/schemas/system/config.schema';
import { useConfigSnapshot } from '../hooks/cockpit-utils/useConfigSnapshot';
import { useSettingsState } from '@/hooks/settings-state/useSettingsState';
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
 * @param {boolean} props.canEditProductSettings - Flag indicating whether user can edit product-wide settings.
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
    updateStatusCategory,
    setStatuses,
    isDirty
  } = useSettingsState({
    snapshot,
    canEditAgencySettings,
    canEditProductSettings,
    agencyId
  });

  const [activeSection, setActiveSection] = useState<string>('general');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const sections = ['general', 'product', 'referentials', 'kanban'];
    const observedElements: HTMLElement[] = [];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id.replace('settings-section-', '');
            setActiveSection(id);
          }
        });
      },
      {
        root: container,
        rootMargin: '-5% 0px -80% 0px',
        threshold: 0,
      }
    );

    sections.forEach((secId) => {
      const element = document.getElementById(`settings-section-${secId}`);
      if (element) {
        observer.observe(element);
        observedElements.push(element);
      }
    });

    return () => {
      observedElements.forEach((el) => observer.unobserve(el));
      observer.disconnect();
    };
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm" data-testid="settings-root">
      <SettingsHeader />

      {(readOnly || !canEditProductSettings) && (
        <SettingsReadOnlyBanner
          readOnly={readOnly}
          canEditProductSettings={canEditProductSettings}
        />
      )}

      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Sticky left/top sidebar panel */}
        <div className="shrink-0 border-b border-border p-4 bg-card/30 lg:w-64 lg:border-b-0 lg:border-r lg:p-4">
          <SettingsSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        </div>
        {/* Main scrollable section stack */}
        <div ref={scrollContainerRef} className="flex-1 overflow-auto bg-surface-1/70 p-4 sm:p-6 scroll-smooth">
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
            setStatuses={setStatuses}
            addStatus={addStatus}
            removeStatus={removeStatus}
            updateStatusLabel={updateStatusLabel}
            updateStatusCategory={updateStatusCategory}
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
