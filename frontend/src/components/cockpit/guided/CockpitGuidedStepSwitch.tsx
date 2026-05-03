import { ArrowRight } from 'lucide-react';

import type { CockpitFormLeftPaneProps, CockpitFormRightPaneProps } from '../CockpitPaneTypes';
import type { CockpitLeftEntitySectionsProps } from '../CockpitLeftEntitySectionsProps';
import type { useCockpitGuidedFlow } from '@/hooks/useCockpitGuidedFlow';
import { Button } from '@/components/ui/button';
import CockpitContactSection from '../left/CockpitContactSection';
import CockpitGuidedChannelQuestion from './CockpitGuidedChannelQuestion';
import CockpitGuidedRelationQuestion from './CockpitGuidedRelationQuestion';
import CockpitGuidedQuestionFrame from './CockpitGuidedQuestionFrame';
import CockpitGuidedSearchQuestion from './CockpitGuidedSearchQuestion';
import CockpitGuidedDetailsQuestion from './CockpitGuidedDetailsQuestion';

type CockpitGuidedFlowState = ReturnType<typeof useCockpitGuidedFlow>;

type CockpitGuidedStepSwitchProps = {
  flow: CockpitGuidedFlowState;
  leftPaneProps: CockpitFormLeftPaneProps;
  rightPaneProps: CockpitFormRightPaneProps;
  entityProps: CockpitLeftEntitySectionsProps;
  onReset: () => void;
};

const CockpitGuidedStepSwitch = ({
  flow,
  leftPaneProps,
  rightPaneProps,
  entityProps,
  onReset
}: CockpitGuidedStepSwitchProps) => {
  if (flow.activeStep === 'channel') {
    return (
      <CockpitGuidedQuestionFrame eyebrow="Canal">
        <CockpitGuidedChannelQuestion {...leftPaneProps} onComplete={() => flow.completeStep('channel')} />
      </CockpitGuidedQuestionFrame>
    );
  }
  if (flow.activeStep === 'relation') {
    return (
      <CockpitGuidedQuestionFrame eyebrow="Relation">
        <CockpitGuidedRelationQuestion {...leftPaneProps} onComplete={() => flow.completeStep('relation')} />
      </CockpitGuidedQuestionFrame>
    );
  }
  if (flow.activeStep === 'search') {
    return (
      <CockpitGuidedSearchQuestion
        leftPaneProps={leftPaneProps}
        entityProps={entityProps}
        identityComplete={flow.identityComplete}
        onComplete={() => flow.completeStep('search')}
      />
    );
  }
  if (flow.activeStep === 'contact') {
    return (
      <CockpitGuidedQuestionFrame
        eyebrow="Contact"
        title="Avec qui as-tu échangé ?"
        description="Choisis un contact existant du tiers, ou ajoute-en un nouveau."
        actions={
          <Button
            type="button"
            size="sm"
            onClick={() => flow.completeStep('contact')}
            disabled={!flow.contactComplete}
            className="gap-1.5"
          >
            Continuer
            <ArrowRight size={14} aria-hidden="true" />
          </Button>
        }
      >
        <CockpitContactSection {...entityProps.contact} />
      </CockpitGuidedQuestionFrame>
    );
  }
  if (flow.activeStep === 'subject') {
    return (
      <CockpitGuidedDetailsQuestion
        leftPaneProps={leftPaneProps}
        rightPaneProps={rightPaneProps}
        onReset={onReset}
        onComplete={() => flow.completeStep('subject')}
        canComplete={flow.subjectComplete}
        onEditContact={() => flow.editStep('contact')}
      />
    );
  }
  return (
    <CockpitGuidedDetailsQuestion
      leftPaneProps={leftPaneProps}
      rightPaneProps={rightPaneProps}
      onReset={onReset}
      onEditContact={() => flow.editStep('contact')}
    />
  );
};

export default CockpitGuidedStepSwitch;
