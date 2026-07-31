import { useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import type { FieldErrors } from 'react-hook-form';

import type { CockpitFormLeftPaneProps, CockpitFormRightPaneProps } from '../CockpitPaneTypes';
import type { InteractionFormValues } from '../../../../../shared/schemas/interaction/interaction.schema';
import type { Interaction } from '@/types';
import { Button } from '../../ui/inputs/basic/Button';
import { buildCockpitLeftEntitySectionsProps } from '../buildCockpitLeftEntitySectionsProps';
import { GUIDED_STEP_ORDER, type CockpitGuidedStep, useCockpitGuidedFlow } from '../../../hooks/cockpit/useCockpitGuidedFlow';
import { cn } from '@/lib/utils';
import CockpitShortcutLegend from '../CockpitShortcutLegend';
import CockpitGuidedContextPanel from './CockpitGuidedContextPanel';
import CockpitGuidedStepSwitch from './CockpitGuidedStepSwitch';

type CockpitGuidedEntryProps = {
  formId: string;
  canSave: boolean;
  gateMessage: string | null;
  focusCurrentStep: () => void;
  focusFirstInvalidField: () => void;
  leftPaneProps: CockpitFormLeftPaneProps;
  rightPaneProps: CockpitFormRightPaneProps;
  clientContextInteractions: Interaction[];
  clientContextInteractionsTotal: number;
  isClientContextInteractionsLoading: boolean;
  hasClientContextInteractionsError: boolean;
};

const NO_VISIBLE_ERRORS: FieldErrors<InteractionFormValues> = {};

const STEP_PROGRESS_LABELS: Record<CockpitGuidedStep, string> = {
  channel: 'Canal',
  relation: 'Relation',
  search: 'Tiers',
  contact: 'Contact',
  subject: 'Sujet',
  details: 'Validation'
};

type GuidedProgressStep = {
  step: CockpitGuidedStep;
  label: string;
  value: string;
  isEditable: boolean;
};

// Seul dispositif de progression de l'ecran: il porte la position courante,
// la valeur deja choisie et le retour en arriere sur une etape franchie.
const CockpitGuidedProgress = ({
  steps,
  activeStep,
  onEditStep
}: {
  steps: GuidedProgressStep[];
  activeStep: CockpitGuidedStep;
  onEditStep: (step: CockpitGuidedStep) => void;
}) => {
  const activeIndex = GUIDED_STEP_ORDER.indexOf(activeStep);

  return (
    <nav aria-label="Progression de la saisie">
      <ol className="grid grid-cols-3 gap-x-2 gap-y-3 sm:grid-cols-6">
        {steps.map(({ step, label, value, isEditable }) => {
          const isActive = step === activeStep;
          const isComplete = GUIDED_STEP_ORDER.indexOf(step) < activeIndex;

          return (
            <li key={step} aria-current={isActive ? 'step' : undefined} className="min-w-0">
              <button
                type="button"
                onClick={() => onEditStep(step)}
                disabled={!isEditable}
                title={isEditable ? `Revenir à l’étape ${label}` : undefined}
                className={cn(
                  'group block w-full min-w-0 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  isEditable ? 'cursor-pointer' : 'cursor-default'
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'block h-[2px] w-full rounded-full transition-colors',
                    isActive && 'bg-primary',
                    isComplete && 'bg-primary/55',
                    !isActive && !isComplete && 'bg-[hsl(var(--border-subtle))]',
                    isEditable && 'group-hover:bg-primary'
                  )}
                />
                <span
                  className={cn(
                    'mt-1.5 block truncate text-[11px] tracking-wide transition-colors',
                    isActive && 'font-semibold text-foreground',
                    !isActive && isComplete && 'font-medium text-muted-foreground group-hover:text-foreground',
                    !isActive && !isComplete && 'font-medium text-muted-foreground/65'
                  )}
                >
                  {label}
                </span>
                <span className="mt-0.5 block h-4 truncate text-[11px] font-semibold leading-4 text-foreground/85">
                  {value}
                </span>
              </button>
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
  return isRelationConfirmed ? 'Relation choisie' : 'À choisir';
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
  focusFirstInvalidField,
  leftPaneProps,
  rightPaneProps,
  clientContextInteractions,
  clientContextInteractionsTotal,
  isClientContextInteractionsLoading,
  hasClientContextInteractionsError
}: CockpitGuidedEntryProps) => {
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
    subject: rightPaneProps.subject,
    megaFamilies: rightPaneProps.megaFamilies,
    requiresProductFamilies: rightPaneProps.requiresProductFamilies
  });

  const stepLeftPaneProps = useMemo(
    () => (flow.areStepErrorsVisible ? leftPaneProps : { ...leftPaneProps, errors: NO_VISIBLE_ERRORS }),
    [flow.areStepErrorsVisible, leftPaneProps]
  );
  const stepRightPaneProps = useMemo(
    () => (flow.areStepErrorsVisible ? rightPaneProps : { ...rightPaneProps, errors: NO_VISIBLE_ERRORS }),
    [flow.areStepErrorsVisible, rightPaneProps]
  );
  const entityProps = buildCockpitLeftEntitySectionsProps(stepLeftPaneProps);

  const handleReset = () => {
    flow.resetFlow();
    rightPaneProps.onReset();
  };
  // Le rail droit n'existe que s'il a une fiche a montrer: un simple libelle
  // de contexte ne suffit pas a justifier une colonne.
  const showContextPanel = Boolean(leftPaneProps.selectedEntity || leftPaneProps.selectedContact);
  const visibleAnswerSteps = getVisibleGuidedAnswerSteps(flow, leftPaneProps);
  const stepValues: Record<CockpitGuidedStep, string> = {
    channel: leftPaneProps.channel,
    relation: buildRelationLabel(leftPaneProps.entityType, flow.isRelationConfirmed),
    search: buildIdentityLabel(leftPaneProps),
    contact: buildContactLabel(leftPaneProps),
    subject: rightPaneProps.subject,
    details: ''
  };
  const progressSteps: GuidedProgressStep[] = GUIDED_STEP_ORDER.map((step) => {
    const isAnswered = step !== 'details' && visibleAnswerSteps.includes(step as GuidedAnswerStep);
    const isLockedIdentity = step === 'search' && leftPaneProps.relationMode === 'internal';

    return {
      step,
      label: step === 'search' && leftPaneProps.relationMode === 'solicitation'
        ? 'Appelant'
        : STEP_PROGRESS_LABELS[step],
      value: isAnswered ? stepValues[step] : '',
      isEditable: isAnswered && !isLockedIdentity
    };
  });

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
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Nouvelle interaction</span>
              <span className="h-px flex-1 bg-[hsl(var(--border-subtle))]" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-7 gap-1.5 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                aria-label="Réinitialiser la saisie en cours"
              >
                <RotateCcw size={12} aria-hidden="true" />
                Recommencer
              </Button>
            </div>
            <CockpitGuidedProgress
              steps={progressSteps}
              activeStep={flow.activeStep}
              onEditStep={flow.editStep}
            />
            <CockpitGuidedStepSwitch
              flow={flow}
              leftPaneProps={stepLeftPaneProps}
              rightPaneProps={stepRightPaneProps}
              entityProps={entityProps}
              onReset={handleReset}
              focusFirstInvalidField={focusFirstInvalidField}
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
