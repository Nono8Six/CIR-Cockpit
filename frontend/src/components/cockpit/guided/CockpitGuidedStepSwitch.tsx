import type { CockpitFormLeftPaneProps, CockpitFormRightPaneProps } from '../CockpitPaneTypes';
import type { CockpitLeftEntitySectionsProps } from '../CockpitLeftEntitySectionsProps';
import type { useCockpitGuidedFlow } from '@/hooks/useCockpitGuidedFlow';
import { Button } from '@/components/ui/button';
import CockpitContactSection from '../left/CockpitContactSection';
import CockpitSubjectSection from '../right/CockpitSubjectSection';
import CockpitGuidedChannelQuestion from './CockpitGuidedChannelQuestion';
import CockpitGuidedRelationQuestion from './CockpitGuidedRelationQuestion';
import CockpitGuidedQuestionFrame from './CockpitGuidedQuestionFrame';
import CockpitGuidedSearchQuestion from './CockpitGuidedSearchQuestion';
import CockpitGuidedQualificationQuestion from './CockpitGuidedQualificationQuestion';
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
      <CockpitGuidedQuestionFrame eyebrow="Etape 1" title="Par quel canal arrive la demande ?">
        <CockpitGuidedChannelQuestion {...leftPaneProps} onComplete={() => flow.completeStep('channel')} />
      </CockpitGuidedQuestionFrame>
    );
  }
  if (flow.activeStep === 'relation') {
    return (
      <CockpitGuidedQuestionFrame eyebrow="Etape 2" title="Quel type de tiers est concerne ?">
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
        eyebrow="Etape 4"
        title="Quel contact dois-je rattacher ?"
        actions={<Button type="button" size="sm" onClick={() => flow.completeStep('contact')} disabled={!flow.contactComplete}>Continuer</Button>}
      >
        <CockpitContactSection {...entityProps.contact} />
      </CockpitGuidedQuestionFrame>
    );
  }
  if (flow.activeStep === 'qualification') {
    return (
      <CockpitGuidedQualificationQuestion
        leftPaneProps={leftPaneProps}
        rightPaneProps={rightPaneProps}
        qualificationComplete={flow.qualificationComplete}
        onComplete={() => flow.completeStep('qualification')}
      />
    );
  }
  if (flow.activeStep === 'subject') {
    return (
      <CockpitGuidedQuestionFrame
        eyebrow="Etape 6"
        title="Resumer le sujet et le descriptif"
        actions={<Button type="button" size="sm" onClick={() => flow.completeStep('subject')} disabled={!flow.subjectComplete}>Continuer</Button>}
      >
        <CockpitSubjectSection {...rightPaneProps} />
      </CockpitGuidedQuestionFrame>
    );
  }
  return <CockpitGuidedDetailsQuestion rightPaneProps={rightPaneProps} onReset={onReset} />;
};

export default CockpitGuidedStepSwitch;
