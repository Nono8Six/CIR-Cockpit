import { RotateCcw } from 'lucide-react';

import type { CockpitFormRightPaneProps } from '../CockpitPaneTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CockpitReminderControl from '../right/CockpitReminderControl';
import CockpitGuidedQuestionFrame from './CockpitGuidedQuestionFrame';

type CockpitGuidedDetailsQuestionProps = {
  rightPaneProps: CockpitFormRightPaneProps;
  onReset: () => void;
};

const CockpitGuidedDetailsQuestion = ({
  rightPaneProps,
  onReset
}: CockpitGuidedDetailsQuestionProps) => (
  <CockpitGuidedQuestionFrame eyebrow="Etape 7" title="Finaliser la saisie">
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
      <div className="space-y-2">
        <label className={rightPaneProps.footerLabelStyle} htmlFor="interaction-order-ref">
          Ref. Dossier
        </label>
        <Input
          id="interaction-order-ref"
          type="text"
          {...rightPaneProps.orderRefField}
          maxLength={6}
          className="h-9 font-mono text-xs"
          autoComplete="off"
        />
      </div>
      <CockpitReminderControl
        footerLabelStyle={rightPaneProps.footerLabelStyle}
        reminderField={rightPaneProps.reminderField}
        reminderAt={rightPaneProps.reminderAt}
        onSetReminder={rightPaneProps.onSetReminder}
      />
      <Button type="button" variant="outline" size="icon" onClick={onReset} aria-label="Effacer le formulaire">
        <RotateCcw size={14} />
      </Button>
    </div>
  </CockpitGuidedQuestionFrame>
);

export default CockpitGuidedDetailsQuestion;
