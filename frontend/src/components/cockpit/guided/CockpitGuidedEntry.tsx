import { RotateCcw } from 'lucide-react';

import type { CockpitFormLeftPaneProps, CockpitFormRightPaneProps } from '../CockpitPaneTypes';
import type { Interaction } from '@/types';
import { Button } from '../../ui/inputs/basic/Button';
import { buildCockpitLeftEntitySectionsProps } from '../buildCockpitLeftEntitySectionsProps';
import { GUIDED_STEP_ORDER, type CockpitGuidedStep, useCockpitGuidedFlow } from '../../../hooks/cockpit/useCockpitGuidedFlow';
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
  return [props.contactFirstName, props.contactLastName].filter(Boolean).join(' ') || props.contactName || props.contactPhone;
};

const hasContactSummary = (props: CockpitFormLeftPaneProps): boolean => {
  if (props.relationMode === 'solicitation') return false;
  if (props.selectedContact) return true;
  const contactName = [props.contactFirstName, props.contactLastName].filter(Boolean).join(' ') || props.contactName;
  if (props.relationMode === 'supplier') return Boolean(contactName.trim());
  return Boolean(contactName.trim() || props.contactPhone.trim() || props.contactEmail.trim() || props.selectedContactMeta.trim());
};

const buildIdentityLabel = (props: CockpitFormLeftPaneProps): string => {
  if (props.relationMode === 'internal') return 'CIR';
  if (props.relationMode === 'solicitation') {
    const contactName = props.contactName.trim();
    const contactPhone = props.contactPhone.trim();
    if (contactName && contactPhone) return `${contactName} · ${contactPhone}`;
    return contactName || contactPhone || 'Numéro appelant';
  }
  const manualLabel = props.companyName.trim() || props.contactName.trim() || 'Tiers';
  return props.selectedEntity?.name ?? manualLabel;
};

const buildRelationLabel = (entityType: string, isRelationConfirmed: boolean): string => {
  if (entityType.trim()) return entityType;
  return isRelationConfirmed ? 'Relation choisie' : 'A choisir';
};

type GuidedAnswerStep = 'channel' | 'relation' | 'search' | 'contact' | 'subject';

type GuidedAnswerVisibilityFlow = Pick<
  ReturnType<typeof useCockpitGuidedFlow>,
  | 'activeStep'
  | 'isChannelConfirmed'
  | 'isRelationConfirmed'
  | 'identityComplete'
  | 'contactComplete'
  | 'subjectComplete'
>;

export const getVisibleGuidedAnswerSteps = (
  flow: GuidedAnswerVisibilityFlow,
  leftPaneProps: CockpitFormLeftPaneProps
): GuidedAnswerStep[] => {
  const activeIndex = GUIDED_STEP_ORDER.indexOf(flow.activeStep);
  const isPrevious = (step: GuidedAnswerStep) => GUIDED_STEP_ORDER.indexOf(step) < activeIndex;
  const visible: GuidedAnswerStep[] = [];

  if (isPrevious('channel') && flow.isChannelConfirmed) visible.push('channel');
  if (isPrevious('relation') && flow.isRelationConfirmed) visible.push('relation');
  if (isPrevious('search') && flow.identityComplete) visible.push('search');
  if (isPrevious('contact') && flow.contactComplete && hasContactSummary(leftPaneProps)) visible.push('contact');
  if (isPrevious('subject') && flow.subjectComplete) visible.push('subject');

  return visible;
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
    contactName: leftPaneProps.contactName,
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
  const visibleAnswerSteps = getVisibleGuidedAnswerSteps(flow, leftPaneProps);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div
        className={cn(
          'grid min-h-0 flex-1 grid-cols-1 transition-[grid-template-columns] duration-300 ease-out',
          showContextPanel && 'xl:grid-cols-[minmax(0,1fr)_360px]'
        )}
      >
        <main
          data-cockpit-scroll-root
          className={cn(
            'min-h-0 min-w-0 overflow-y-auto px-3 pt-6 sm:px-6 lg:px-10',
            flow.activeStep === 'details' ? 'pb-28' : 'pb-10'
          )}
        >
          <div className="mx-auto flex w-full max-w-[900px] flex-col gap-3">
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
              {visibleAnswerSteps.includes('channel') ? (
                <CockpitGuidedAnswerRow index={getStepIndex('channel')} label="Canal" value={leftPaneProps.channel} active={false} complete onEdit={() => flow.editStep('channel')} />
              ) : null}
              {visibleAnswerSteps.includes('relation') ? (
                <CockpitGuidedAnswerRow index={getStepIndex('relation')} label="Relation" value={buildRelationLabel(leftPaneProps.entityType, flow.isRelationConfirmed)} active={false} complete onEdit={() => flow.editStep('relation')} />
              ) : null}
              {visibleAnswerSteps.includes('search') ? (
                <CockpitGuidedAnswerRow
                  index={getStepIndex('search')}
                  label={leftPaneProps.relationMode === 'solicitation' ? 'Appelant' : 'Tiers'}
                  value={buildIdentityLabel(leftPaneProps)}
                  active={false}
                  complete
                  editable={leftPaneProps.relationMode !== 'internal'}
                  onEdit={() => flow.editStep('search')}
                />
              ) : null}
              {visibleAnswerSteps.includes('contact') ? (
                <CockpitGuidedAnswerRow index={getStepIndex('contact')} label="Contact" value={buildContactLabel(leftPaneProps)} active={false} complete onEdit={() => flow.editStep('contact')} />
              ) : null}
              {visibleAnswerSteps.includes('subject') ? (
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
