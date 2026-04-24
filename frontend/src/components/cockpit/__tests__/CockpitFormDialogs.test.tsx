import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CockpitFormDialogs from '@/components/cockpit/CockpitFormDialogs';

vi.mock('@/components/ClientFormDialog', () => ({
  default: () => null
}));

vi.mock('@/components/ClientContactDialog', () => ({
  default: () => null
}));

vi.mock('@/components/EntityOnboardingDialog', () => ({
  default: ({
    open,
    allowedIntents,
    defaultIntent,
    sourceLabel
  }: {
    open: boolean;
    allowedIntents?: string[];
    defaultIntent?: string;
    sourceLabel?: string;
  }) => (
    <div
      data-testid="entity-onboarding-dialog"
      data-open={String(open)}
      data-allowed-intents={allowedIntents?.join(',') ?? ''}
      data-default-intent={defaultIntent ?? ''}
      data-source-label={sourceLabel ?? ''}
    />
  )
}));

const baseProps = {
  agencies: [],
  userRole: 'tcs' as const,
  activeAgencyId: 'agency-1',
  selectedEntity: null,
  isClientDialogOpen: false,
  isProspectDialogOpen: false,
  isContactDialogOpen: false,
  isConvertDialogOpen: false,
  convertTarget: null,
  onClientDialogChange: vi.fn(),
  onProspectDialogChange: vi.fn(),
  onContactDialogChange: vi.fn(),
  onConvertDialogChange: vi.fn(),
  onSaveClient: vi.fn(),
  onSaveProspect: vi.fn(),
  onSaveContact: vi.fn(),
  onConvertClient: vi.fn()
};

describe('CockpitFormDialogs', () => {
  it('rend le dialog onboarding verrouille sur Prospect pour la creation inline', () => {
    render(
      <CockpitFormDialogs
        {...baseProps}
        isProspectDialogOpen
      />
    );

    const dialog = screen.getByTestId('entity-onboarding-dialog');
    expect(dialog).toHaveAttribute('data-open', 'true');
    expect(dialog).toHaveAttribute('data-allowed-intents', 'prospect');
    expect(dialog).toHaveAttribute('data-default-intent', 'prospect');
    expect(dialog).toHaveAttribute('data-source-label', 'Cockpit');
  });
});
