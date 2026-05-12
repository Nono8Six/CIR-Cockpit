import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import CockpitGuidedStepSwitch from '@/components/cockpit/guided/CockpitGuidedStepSwitch';
import type { CockpitLeftEntitySectionsProps } from '@/components/cockpit/CockpitLeftEntitySectionsProps';
import type { CockpitFormLeftPaneProps, CockpitFormRightPaneProps } from '@/components/cockpit/CockpitPaneTypes';
import type { useCockpitGuidedFlow } from '@/hooks/useCockpitGuidedFlow';

type GuidedFlowState = ReturnType<typeof useCockpitGuidedFlow>;

const buildFlow = (contactComplete: boolean): GuidedFlowState => ({
  activeStep: 'contact',
  completeStep: vi.fn(),
  editStep: vi.fn(),
  resetFlow: vi.fn(),
  isChannelConfirmed: true,
  isRelationConfirmed: true,
  identityComplete: true,
  contactComplete,
  qualificationComplete: false,
  subjectComplete: false
});

const entityProps = {
  contact: {
    selectedEntity: null,
    selectedContact: null,
    errors: {},
    relationMode: 'client'
  }
} as unknown as CockpitLeftEntitySectionsProps;

describe('CockpitGuidedStepSwitch', () => {
  it('keeps Continue disabled until the contact step is complete', () => {
    render(
      <CockpitGuidedStepSwitch
        flow={buildFlow(false)}
        leftPaneProps={{} as CockpitFormLeftPaneProps}
        rightPaneProps={{} as CockpitFormRightPaneProps}
        entityProps={entityProps}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /continuer/i })).toBeDisabled();
  });

  it('continues once a contact is selected', async () => {
    const user = userEvent.setup();
    const flow = buildFlow(true);

    render(
      <CockpitGuidedStepSwitch
        flow={flow}
        leftPaneProps={{} as CockpitFormLeftPaneProps}
        rightPaneProps={{} as CockpitFormRightPaneProps}
        entityProps={entityProps}
        onReset={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /continuer/i }));

    expect(flow.completeStep).toHaveBeenCalledWith('contact');
  });
});
