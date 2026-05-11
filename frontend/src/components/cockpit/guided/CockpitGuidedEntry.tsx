import { RotateCcw } from 'lucide-react';

import type { CockpitFormLeftPaneProps, CockpitFormRightPaneProps } from '../CockpitPaneTypes';
import type { Interaction } from '@/types';
import { Button } from '@/components/ui/button';
import { buildCockpitLeftEntitySectionsProps } from '../buildCockpitLeftEntitySectionsProps';
import { GUIDED_STEP_ORDER, type CockpitGuidedStep, useCockpitGuidedFlow } from '@/hooks/useCockpitGuidedFlow';
import { cn } from '@/lib/utils';
import CockpitShortcutLegend from '../CockpitShortcutLegend';
import CockpitGuidedAnswerRow from './CockpitGuidedAnswerRow';
import CockpitGuidedContextPanel from './CockpitGuidedContextPanel';
import CockpitGuidedStepSwitch from './CockpitGuidedStepSwitch';

type CockpitGuidedEntryProps = {
  formId: string;
  canSave: boolean;
  gateMessage: string | null;
  focusCurrentStep: () => void;
  leftPaneProps: CockpitFormLeftPaneProps;
  rightPaneProps: CockpitFormRightPaneProps;
  clientContextInteractions: Interaction[];
  clientContextInteractionsTotal: number;
  isClientContextInteractionsLoading: boolean;
  hasClientContextInteractionsError: boolean;
};

const getStepIndex = (step: CockpitGuidedStep): number => GUIDED_STEP_ORDER.indexOf(step) + 1;

const STEP_PROGRESS_LABELS: Record<CockpitGuidedStep, string> = {
  channel: 'Canal',
  relation: 'Relation',
  search: 'Tiers',
  contact: 'Contact',
  subject: 'Sujet',
  details: 'Validation'
};

const CockpitGuidedProgress = ({ activeStep }: { activeStep: CockpitGuidedStep }) => {
  const activeIndex = GUIDED_STEP_ORDER.indexOf(activeStep);

  return (
    <nav aria-label="Progression de la saisie">
      <ol className="grid grid-cols-3 gap-x-2 gap-y-3 sm:grid-cols-6">
        {GUIDED_STEP_ORDER.map((step, index) => {
          const isActive = step === activeStep;
          const isComplete = index < activeIndex;

          return (
            <li key={step} aria-current={isActive ? 'step' : undefined} className="min-w-0">
              <span
                aria-hidden="true"
                className={cn(
                  'block h-[2px] w-full rounded-full transition-colors',
                  isActive && 'bg-primary',
                  isComplete && 'bg-primary/55',
                  !isActive && !isComplete && 'bg-[hsl(var(--border-subtle))]'
                )}
              />
              <span
                className={cn(
                  'mt-1.5 block truncate text-[10px] uppercase tracking-[0.16em] transition-colors',
                  isActive && 'font-semibold text-foreground',
                  isComplete && 'font-medium text-muted-foreground',
                  !isActive && !isComplete && 'font-medium text-muted-foreground/65'
                )}
              >
                {STEP_PROGRESS_LABELS[step]}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

const buildContactLabel = (props: CockpitFormLeftPaneProps): string => {
  if (props.selectedContact) {
    return [props.selectedContact.first_name ?? '', props.selectedContact.last_name].filter(Boolean).join(' ');
  }
  return [props.contactFirstName, props.contactLastName].filter(Boolean).join(' ') || props.contactName || props.contactPhone || 'Contact';
};

const buildIdentityLabel = (props: CockpitFormLeftPaneProps): string => {
  const manualLabel = props.companyName.trim() || props.contactName.trim() || 'Tiers';
  return props.selectedEntity?.name ?? manualLabel;
};

const buildRelationLabel = (entityType: string, isRelationConfirmed: boolean): string => {
  if (entityType.trim()) return entityType;
  return isRelationConfirmed ? 'Relation choisie' : 'A choisir';
};

const CockpitGuidedEntry = ({
  formId,
  canSave,
  gateMessage,
  focusCurrentStep,
  leftPaneProps,
  rightPaneProps,
  clientContextInteractions,
  clientContextInteractionsTotal,
  isClientContextInteractionsLoading,
  hasClientContextInteractionsError
}: CockpitGuidedEntryProps) => {
  const entityProps = buildCockpitLeftEntitySectionsProps(leftPaneProps);
  const flow = useCockpitGuidedFlow({
    relationMode: leftPaneProps.relationMode,
    entityType: leftPaneProps.entityType,
    selectedEntity: leftPaneProps.selectedEntity,
    selectedContact: leftPaneProps.selectedContact,
    companyName: leftPaneProps.companyName,
    companyCity: leftPaneProps.companyCity,
    contactFirstName: leftPaneProps.contactFirstName,
    contactLastName: leftPaneProps.contactLastName,
    contactPosition: leftPaneProps.contactPosition,
    contactName: buildContactLabel(leftPaneProps),
    contactPhone: leftPaneProps.contactPhone,
    contactEmail: leftPaneProps.contactEmail,
    interactionType: leftPaneProps.interactionType,
    contactService: leftPaneProps.contactService,
    statusValue: rightPaneProps.statusValue,
    subject: rightPaneProps.subject
  });

  const handleReset = () => {
    flow.resetFlow();
    rightPaneProps.onReset();
  };
  const showContextPanel = Boolean(
    leftPaneProps.selectedEntity
      || leftPaneProps.selectedContact
      || leftPaneProps.selectedEntityMeta
      || leftPaneProps.selectedContactMeta
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div
        className={cn(
          'grid min-h-0 flex-1 grid-cols-1 transition-[grid-template-columns] duration-300 ease-out',
          showContextPanel && 'xl:grid-cols-[minmax(0,1fr)_360px]'
        )}
      >
        <main
          className={cn(
            'min-h-0 min-w-0 overflow-y-auto px-3 pt-6 sm:px-6 lg:px-10',
            flow.activeStep === 'details' ? 'pb-28' : 'pb-10'
          )}
        >
          <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Nouvelle interaction</span>
              <span className="h-px flex-1 bg-[hsl(var(--border-subtle))]" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-7 gap-1.5 px-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                aria-label="Réinitialiser la saisie en cours"
              >
                <RotateCcw size={12} aria-hidden="true" />
                Recommencer
              </Button>
            </div>
            <CockpitGuidedProgress activeStep={flow.activeStep} />
            <div className="flex flex-col divide-y divide-[hsl(var(--border-subtle))]">
              {flow.isChannelConfirmed && flow.activeStep !== 'channel' ? (
                <CockpitGuidedAnswerRow index={getStepIndex('channel')} label="Canal" value={leftPaneProps.channel} active={false} complete onEdit={() => flow.editStep('channel')} />
              ) : null}
              {flow.isRelationConfirmed && flow.activeStep !== 'relation' ? (
                <CockpitGuidedAnswerRow index={getStepIndex('relation')} label="Relation" value={buildRelationLabel(leftPaneProps.entityType, flow.isRelationConfirmed)} active={false} complete onEdit={() => flow.editStep('relation')} />
              ) : null}
              {flow.identityComplete && flow.activeStep !== 'search' ? (
                <CockpitGuidedAnswerRow index={getStepIndex('search')} label="Tiers" value={buildIdentityLabel(leftPaneProps)} active={false} complete onEdit={() => flow.editStep('search')} />
              ) : null}
              {flow.contactComplete && flow.activeStep !== 'contact' ? (
                <CockpitGuidedAnswerRow index={getStepIndex('contact')} label="Contact" value={buildContactLabel(leftPaneProps)} active={false} complete onEdit={() => flow.editStep('contact')} />
              ) : null}
              {flow.subjectComplete && flow.activeStep !== 'subject' ? (
                <CockpitGuidedAnswerRow index={getStepIndex('subject')} label="Sujet" value={rightPaneProps.subject || 'A renseigner'} active={false} complete onEdit={() => flow.editStep('subject')} />
              ) : null}
            </div>
            <CockpitGuidedStepSwitch
              flow={flow}
              leftPaneProps={leftPaneProps}
              rightPaneProps={rightPaneProps}
              entityProps={entityProps}
              onReset={handleReset}
            />
          </div>
        </main>
        {showContextPanel ? (
          <CockpitGuidedContextPanel
            selectedEntity={leftPaneProps.selectedEntity}
            selectedContact={leftPaneProps.selectedContact}
            clientInteractions={clientContextInteractions}
            totalClientInteractions={clientContextInteractionsTotal}
            isClientInteractionsLoading={isClientContextInteractionsLoading}
            hasClientInteractionsError={hasClientContextInteractionsError}
          />
        ) : null}
      </div>
      <CockpitShortcutLegend
        activeStep={flow.activeStep}
        canSave={canSave}
        formId={formId}
        gateMessage={gateMessage}
        onFocusCurrentStep={focusCurrentStep}
      />
    </div>
  );
};

export default CockpitGuidedEntry;
