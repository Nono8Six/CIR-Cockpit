import type { CockpitFormLeftPaneProps, CockpitFormRightPaneProps } from '../CockpitPaneTypes';
import { Button } from '@/components/ui/button';
import CockpitInteractionTypeSection from '../left/CockpitInteractionTypeSection';
import CockpitServiceSection from '../left/CockpitServiceSection';
import CockpitStatusControl from '../right/CockpitStatusControl';
import CockpitGuidedQuestionFrame from './CockpitGuidedQuestionFrame';

type CockpitGuidedQualificationQuestionProps = {
  leftPaneProps: CockpitFormLeftPaneProps;
  rightPaneProps: CockpitFormRightPaneProps;
  qualificationComplete: boolean;
  onComplete: () => void;
};

const CockpitGuidedQualificationQuestion = ({
  leftPaneProps,
  rightPaneProps,
  qualificationComplete,
  onComplete
}: CockpitGuidedQualificationQuestionProps) => (
  <CockpitGuidedQuestionFrame
    eyebrow="Étape 5"
    title="Qualifier la demande"
    actions={<Button type="button" size="sm" onClick={onComplete} disabled={!qualificationComplete}>Continuer</Button>}
  >
    <div className="grid gap-4 lg:grid-cols-3">
      <CockpitInteractionTypeSection {...leftPaneProps} />
      <CockpitServiceSection {...leftPaneProps} />
      <CockpitStatusControl {...rightPaneProps} />
    </div>
    {rightPaneProps.errors.status_id ? (
      <p className="text-xs text-destructive" role="status" aria-live="polite">
        {rightPaneProps.errors.status_id.message}
      </p>
    ) : null}
  </CockpitGuidedQuestionFrame>
);

export default CockpitGuidedQualificationQuestion;
