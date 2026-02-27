import { Save } from 'lucide-react';

import InteractionStepper from './InteractionStepper';
import CockpitFormHeader from './cockpit/CockpitFormHeader';
import CockpitFormLeftPane from './cockpit/CockpitFormLeftPane';
import CockpitFormRightPane from './cockpit/CockpitFormRightPane';
import CockpitFormDialogs from './cockpit/CockpitFormDialogs';
import type { CockpitFormProps } from './cockpit/CockpitForm.types';
import { useCockpitFormController } from '@/hooks/useCockpitFormController';
import { Button } from '@/components/ui/button';

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
    <div data-testid="cockpit-form-shell" className="min-h-full rounded-lg border border-border bg-card shadow-sm overflow-x-clip flex flex-col">
      <CockpitFormHeader
        canSave={canSave}
      />
      <form
        id={formId}
        ref={formRef}
        onSubmit={handleFormSubmit}
        className="flex flex-1 flex-col bg-surface-1/30"
      >
        <div className="shrink-0 border-b border-border bg-surface-1/70 px-3 py-2 sm:px-5">
          <InteractionStepper steps={stepperSteps} />
        </div>

        <div className="grid min-w-0 grid-cols-12 gap-0">
          <CockpitFormLeftPane {...leftPaneProps} />
          <CockpitFormRightPane {...rightPaneProps} />
        </div>
        <div data-testid="cockpit-submit-bar" className="sticky bottom-0 z-10 border-t border-border bg-card/95 px-3 py-3 backdrop-blur sm:px-5">
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {!canSave && gateMessage ? (
              <button
                type="button"
                onClick={focusCurrentStep}
                className="h-9 w-full truncate rounded-md border border-warning/35 bg-warning/15 px-2.5 text-xs font-semibold text-warning-foreground transition-colors hover:bg-warning/20 sm:h-8 sm:w-auto sm:max-w-[260px]"
                aria-label="Aller au champ requis"
              >
                {gateMessage}
              </button>
            ) : null}
            <Button
              data-testid="cockpit-submit-button"
              type="submit"
              form={formId}
              disabled={!canSave}
              className="h-9 w-full gap-1.5 px-3 text-xs sm:h-8 sm:w-auto"
              title={canSave ? 'Pret a enregistrer' : gateMessage ?? undefined}
            >
              <Save size={12} />
              Enregistrer
            </Button>
          </div>
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
