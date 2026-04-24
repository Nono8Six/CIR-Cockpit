import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/__tests__/test-utils';
import { axe } from 'vitest-axe';

import CockpitForm from '@/components/CockpitForm';
import type { AgencyConfig } from '@/services/config';

vi.mock('@/components/InteractionStepper', () => ({
  default: () => <div data-testid="interaction-stepper" />
}));
vi.mock('@/components/cockpit/CockpitFormHeader', () => ({
  default: () => <div data-testid="cockpit-form-header" />
}));
vi.mock('@/components/cockpit/CockpitFormLeftPane', () => ({
  default: () => <section data-testid="cockpit-form-left-pane" />
}));
vi.mock('@/components/cockpit/CockpitFormRightPane', () => ({
  default: () => <section data-testid="cockpit-form-right-pane" />
}));
vi.mock('@/components/cockpit/CockpitFormDialogs', () => ({
  default: () => null
}));
vi.mock('@/components/cockpit/CockpitShortcutLegend', () => ({
  default: () => <div data-testid="cockpit-shortcut-legend" />
}));
vi.mock('@/components/cockpit/left/CockpitChannelSection', () => ({
  default: () => <div data-testid="cockpit-channel-section" />
}));
vi.mock('@/components/cockpit/guided/CockpitGuidedEntry', () => ({
  default: () => <section data-testid="cockpit-guided-entry" />
}));
vi.mock('@/hooks/useCockpitFormController', () => ({
  useCockpitFormController: () => ({
    canSave: true,
    gateMessage: null,
    stepperSteps: [],
    formRef: { current: null },
    handleFormSubmit: vi.fn(),
    focusCurrentStep: vi.fn(),
    leftPaneProps: {},
    rightPaneProps: {},
    dialogs: {
      agencies: [],
      userRole: 'tcs',
      activeAgencyId: null,
      selectedEntity: null,
      isClientDialogOpen: false,
      isContactDialogOpen: false,
      isConvertDialogOpen: false,
      convertTarget: null,
      onClientDialogChange: vi.fn(),
      onContactDialogChange: vi.fn(),
      onConvertDialogChange: vi.fn(),
      onSaveClient: vi.fn(),
      onSaveContact: vi.fn(),
      onConvertClient: vi.fn()
    }
  })
}));

const config: AgencyConfig = {
  statuses: [
    {
      id: 'status-default',
      label: 'Nouveau',
      category: 'todo',
      is_terminal: false,
      is_default: true,
      sort_order: 1
    }
  ],
  services: ['Atelier'],
  entities: ['Client'],
  families: ['Freinage'],
  interactionTypes: ['Demande']
};

describe('CockpitForm accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderWithProviders(
      <CockpitForm
        onSave={async () => true}
        config={config}
        activeAgencyId="agency-1"
        userId="user-1"
        userRole="tcs"
        recentEntities={[]}
        entitySearchIndex={{ entities: [], contacts: [] }}
        entitySearchLoading={false}
        onOpenGlobalSearch={() => undefined}
      />
    );

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
