import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CockpitShortcutLegend from '@/components/cockpit/CockpitShortcutLegend';

const getActions = () => within(screen.getByTestId('cockpit-shortcut-legend-actions'));

describe('CockpitShortcutLegend', () => {
  it('ne rend pas de barre basse avant l etape validation', () => {
    const { container, rerender } = render(<CockpitShortcutLegend activeStep="channel" />);

    expect(container.firstChild).toBeNull();

    rerender(<CockpitShortcutLegend activeStep="relation" />);
    expect(container.firstChild).toBeNull();

    rerender(<CockpitShortcutLegend activeStep="search" />);
    expect(container.firstChild).toBeNull();

    rerender(<CockpitShortcutLegend activeStep="contact" />);
    expect(container.firstChild).toBeNull();

    rerender(<CockpitShortcutLegend activeStep="subject" />);
    expect(container.firstChild).toBeNull();
  });

  it('affiche l enregistrement uniquement sur l etape details', () => {
    const { rerender } = render(<CockpitShortcutLegend activeStep="channel" />);

    expect(screen.queryByTestId('cockpit-submit-button')).not.toBeInTheDocument();

    rerender(
      <CockpitShortcutLegend
        activeStep="details"
        canSave
        formId="cockpit-form"
        onFocusCurrentStep={vi.fn()}
      />
    );

    expect(screen.getByTestId('cockpit-submit-button')).toBeEnabled();
    expect(getActions().getByText(/(Ctrl|⌘) ↵/)).toBeInTheDocument();
    expect(getActions().getByText('Enregistrer')).toBeInTheDocument();
  });

  it('rend le message bloquant actionnable quand l enregistrement est impossible', () => {
    const focusCurrentStep = vi.fn();
    render(
      <CockpitShortcutLegend
        activeStep="details"
        canSave={false}
        formId="cockpit-form"
        gateMessage="Sujet obligatoire"
        onFocusCurrentStep={focusCurrentStep}
      />
    );

    expect(screen.getByRole('button', { name: 'Sujet obligatoire' })).toBeInTheDocument();
    expect(screen.getByTestId('cockpit-submit-button')).toBeDisabled();
  });
});
