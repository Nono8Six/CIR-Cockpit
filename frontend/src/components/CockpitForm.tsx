import InteractionStepper from './InteractionStepper';
import CockpitFormHeader from './cockpit/CockpitFormHeader';
import CockpitFormLeftPane from './cockpit/CockpitFormLeftPane';
import CockpitFormRightPane from './cockpit/CockpitFormRightPane';
import CockpitFormDialogs from './cockpit/CockpitFormDialogs';
import type { CockpitFormProps } from './cockpit/CockpitForm.types';
import { useCockpitFormController } from '@/hooks/useCockpitFormController';

const EMPTY_ENTITIES: CockpitFormProps['recentEntities'] = [];

const CockpitForm = ({
  onSave,
  config,
  activeAgencyId,
  userId,
  userRole,
  recentEntities = EMPTY_ENTITIES,
  entitySearchIndex,
  entitySearchLoading,
  onOpenGlobalSearch
}: CockpitFormProps) => {
  const {
    canSave,
    gateMessage,
    stepperSteps,
    formRef,
    handleFormSubmit,
    focusCurrentStep,
    leftPaneProps,
    rightPaneProps,
    dialogs
  } = useCockpitFormController({
    onSave,
    config,
    activeAgencyId,
    userId,
    userRole,
    recentEntities,
    entitySearchIndex,
    entitySearchLoading,
    onOpenGlobalSearch
  });

  const formId = 'interaction-form';

  return (
    <div className="h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col">
      <CockpitFormHeader
        canSave={canSave}
        gateMessage={gateMessage}
        formId={formId}
        onFocusRequired={focusCurrentStep}
      />
      <form
        id={formId}
        ref={formRef}
        onSubmit={handleFormSubmit}
        className="flex-1 flex flex-col min-h-0 bg-slate-50/30"
      >
        <div className="shrink-0 border-b border-slate-200 bg-slate-50/50 px-5 py-2">
          <InteractionStepper steps={stepperSteps} />
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-12 gap-0 overflow-hidden">
          <CockpitFormLeftPane {...leftPaneProps} />
          <CockpitFormRightPane {...rightPaneProps} />
        </div>
      </form>
      <CockpitFormDialogs
        agencies={dialogs.agencies}
        userRole={dialogs.userRole}
        activeAgencyId={dialogs.activeAgencyId}
        selectedEntity={dialogs.selectedEntity}
        isClientDialogOpen={dialogs.isClientDialogOpen}
        isContactDialogOpen={dialogs.isContactDialogOpen}
        isConvertDialogOpen={dialogs.isConvertDialogOpen}
        convertTarget={dialogs.convertTarget}
        onClientDialogChange={dialogs.onClientDialogChange}
        onContactDialogChange={dialogs.onContactDialogChange}
        onConvertDialogChange={dialogs.onConvertDialogChange}
        onSaveClient={dialogs.onSaveClient}
        onSaveContact={dialogs.onSaveContact}
        onConvertClient={dialogs.onConvertClient}
      />
    </div>
  );
};

export default CockpitForm;


