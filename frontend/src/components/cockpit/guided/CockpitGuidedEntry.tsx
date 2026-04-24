import { Save } from 'lucide-react';

import type { CockpitFormLeftPaneProps, CockpitFormRightPaneProps } from '../CockpitPaneTypes';
import type { Entity, Interaction } from '@/types';
import { buildCockpitLeftEntitySectionsProps } from '../buildCockpitLeftEntitySectionsProps';
import { GUIDED_STEP_ORDER, type CockpitGuidedStep, useCockpitGuidedFlow } from '@/hooks/useCockpitGuidedFlow';
import { Button } from '@/components/ui/button';
import CockpitEntryRecents from '../CockpitEntryRecents';
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
  recentOwnInteractions: Interaction[];
  searchIndexEntities: Entity[];
  onSelectRecent: (interaction: Interaction, entity: Entity | null) => void;
  showEntryRecents: boolean;
};

const getStepIndex = (step: CockpitGuidedStep): number => GUIDED_STEP_ORDER.indexOf(step) + 1;

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
  return isRelationConfirmed ? 'Tout' : 'A choisir';
};

const CockpitGuidedEntry = ({
  formId,
  canSave,
  gateMessage,
  focusCurrentStep,
  leftPaneProps,
  rightPaneProps,
  recentOwnInteractions,
  searchIndexEntities,
  onSelectRecent,
  showEntryRecents
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

  return (
    <div className="flex flex-1 flex-col bg-surface-1/30">
      <div className="grid flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0 px-3 pb-28 pt-6 sm:px-6 lg:px-10">
          <div className="mx-auto flex w-full max-w-[860px] flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Nouvelle interaction</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="grid gap-2">
              <CockpitGuidedAnswerRow index={getStepIndex('channel')} label="Canal" value={leftPaneProps.channel} active={flow.activeStep === 'channel'} complete={flow.isChannelConfirmed} onEdit={() => flow.editStep('channel')} />
              <CockpitGuidedAnswerRow index={getStepIndex('relation')} label="Type de tiers" value={buildRelationLabel(leftPaneProps.entityType, flow.isRelationConfirmed)} active={flow.activeStep === 'relation'} complete={flow.isRelationConfirmed} onEdit={() => flow.editStep('relation')} />
              <CockpitGuidedAnswerRow index={getStepIndex('search')} label="Recherche" value={buildIdentityLabel(leftPaneProps)} active={flow.activeStep === 'search'} complete={flow.identityComplete} onEdit={() => flow.editStep('search')} />
              <CockpitGuidedAnswerRow index={getStepIndex('contact')} label="Contact" value={buildContactLabel(leftPaneProps)} active={flow.activeStep === 'contact'} complete={flow.contactComplete} onEdit={() => flow.editStep('contact')} />
              <CockpitGuidedAnswerRow index={getStepIndex('qualification')} label="Qualification" value={[leftPaneProps.interactionType, leftPaneProps.contactService].filter(Boolean).join(' - ') || 'A qualifier'} active={flow.activeStep === 'qualification'} complete={flow.qualificationComplete} onEdit={() => flow.editStep('qualification')} />
              <CockpitGuidedAnswerRow index={getStepIndex('subject')} label="Sujet" value={rightPaneProps.subject || 'A renseigner'} active={flow.activeStep === 'subject'} complete={flow.subjectComplete} onEdit={() => flow.editStep('subject')} />
            </div>
            {showEntryRecents ? (
              <CockpitEntryRecents interactions={recentOwnInteractions} entities={searchIndexEntities} onSelectRecent={onSelectRecent} />
            ) : null}
            <CockpitGuidedStepSwitch
              flow={flow}
              leftPaneProps={leftPaneProps}
              rightPaneProps={rightPaneProps}
              entityProps={entityProps}
              onReset={handleReset}
            />
          </div>
        </main>
        <CockpitGuidedContextPanel
          selectedEntity={leftPaneProps.selectedEntity}
          selectedEntityMeta={leftPaneProps.selectedEntityMeta}
          selectedContact={leftPaneProps.selectedContact}
          selectedContactMeta={leftPaneProps.selectedContactMeta}
          recentOwnInteractions={recentOwnInteractions}
        />
      </div>
      <div data-testid="cockpit-submit-bar" className="border-t border-border bg-card/95 px-3 py-3 backdrop-blur sm:px-5">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-2 sm:justify-end">
          {!canSave && gateMessage ? (
            <button type="button" onClick={focusCurrentStep} className="h-9 w-full truncate rounded-md border border-warning/35 bg-warning/15 px-2.5 text-xs font-semibold text-warning-foreground transition-colors hover:bg-warning/20 sm:h-8 sm:w-auto sm:max-w-[260px]">
              {gateMessage}
            </button>
          ) : null}
          <Button data-testid="cockpit-submit-button" type="submit" form={formId} disabled={!canSave} className="h-9 w-full gap-1.5 px-3 text-xs sm:h-8 sm:w-auto" title={canSave ? 'Pret a enregistrer' : gateMessage ?? undefined}>
            <Save size={12} />
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CockpitGuidedEntry;
