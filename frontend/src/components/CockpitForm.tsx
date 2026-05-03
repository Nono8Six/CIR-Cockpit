import CockpitFormHeader from './cockpit/CockpitFormHeader';
import CockpitFormDialogs from './cockpit/CockpitFormDialogs';
import CockpitReadonlyView from './cockpit/CockpitReadonlyView';
import CockpitGuidedEntry from './cockpit/guided/CockpitGuidedEntry';
import type { CockpitFormProps } from './cockpit/CockpitForm.types';
import { useCockpitFormController } from '@/hooks/useCockpitFormController';

const EMPTY_ENTITIES: CockpitFormProps['recentEntities'] = [];
const EMPTY_INTERACTIONS: NonNullable<CockpitFormProps['interactions']> = [];

const CockpitForm = ({
  onSave,
  config,
  activeAgencyId,
  userId,
  userRole,
  recentEntities = EMPTY_ENTITIES,
  interactions = EMPTY_INTERACTIONS,
  entitySearchIndex,
  entitySearchLoading,
  onOpenGlobalSearch
}: CockpitFormProps) => {
  const {
    canSave,
    gateMessage,
    formRef,
    handleFormSubmit,
    focusCurrentStep,
    leftPaneProps,
    rightPaneProps,
    draftStatus,
    lastSavedAt,
    lastSavedInteraction,
    onStartNewEntry,
    clientContextInteractions,
    clientContextInteractionsTotal,
    isClientContextInteractionsLoading,
    hasClientContextInteractionsError,
    dialogs
  } = useCockpitFormController({
    onSave,
    config,
    activeAgencyId,
    userId,
    userRole,
    recentEntities,
    interactions,
    entitySearchIndex,
    entitySearchLoading,
    onOpenGlobalSearch
  });

  const formId = 'interaction-form';

  return (
    <div data-testid="cockpit-form-shell" className="flex h-full min-h-0 flex-col overflow-x-clip bg-background">
      {lastSavedInteraction ? (
        <>
          <CockpitFormHeader
            canSave={canSave}
            draftStatus={draftStatus}
            lastSavedAt={lastSavedAt}
            savedInteractionId={lastSavedInteraction.id}
          />
          <CockpitReadonlyView
            interaction={lastSavedInteraction}
            config={config}
            onStartNew={onStartNewEntry}
          />
        </>
      ) : (
        <form
          id={formId}
          ref={formRef}
          onSubmit={handleFormSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <CockpitGuidedEntry
            formId={formId}
            canSave={canSave}
            gateMessage={gateMessage}
            focusCurrentStep={focusCurrentStep}
            leftPaneProps={leftPaneProps}
            rightPaneProps={rightPaneProps}
            clientContextInteractions={clientContextInteractions}
            clientContextInteractionsTotal={clientContextInteractionsTotal}
            isClientContextInteractionsLoading={isClientContextInteractionsLoading}
            hasClientContextInteractionsError={hasClientContextInteractionsError}
          />
        </form>
      )}
      <CockpitFormDialogs
        agencies={dialogs.agencies}
        userRole={dialogs.userRole}
        activeAgencyId={dialogs.activeAgencyId}
        selectedEntity={dialogs.selectedEntity}
        isClientDialogOpen={dialogs.isClientDialogOpen}
        isProspectDialogOpen={dialogs.isProspectDialogOpen}
        isContactDialogOpen={dialogs.isContactDialogOpen}
        isConvertDialogOpen={dialogs.isConvertDialogOpen}
        convertTarget={dialogs.convertTarget}
        onClientDialogChange={dialogs.onClientDialogChange}
        onProspectDialogChange={dialogs.onProspectDialogChange}
        onContactDialogChange={dialogs.onContactDialogChange}
        onConvertDialogChange={dialogs.onConvertDialogChange}
        onSaveClient={dialogs.onSaveClient}
        onSaveProspect={dialogs.onSaveProspect}
        onSaveContact={dialogs.onSaveContact}
        onConvertClient={dialogs.onConvertClient}
      />
    </div>
  );
};

export default CockpitForm;
