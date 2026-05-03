import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import CockpitGuidedRelationQuestion from '@/components/cockpit/guided/CockpitGuidedRelationQuestion';

describe('CockpitGuidedRelationQuestion', () => {
  it('delegue le changement de type au reset central avant de continuer', async () => {
    const user = userEvent.setup();
    const onRelationChange = vi.fn();
    const onComplete = vi.fn();

    render(
      <CockpitGuidedRelationQuestion
        entityType="Client"
        errors={{}}
        onRelationChange={onRelationChange}
        relationButtonRef={createRef<HTMLButtonElement>()}
        onComplete={onComplete}
      />
    );

    await user.click(screen.getByRole('button', { name: /Fournisseur/ }));

    expect(onRelationChange).toHaveBeenCalledWith('Fournisseur');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('propose les relations explicites sans option Tout', async () => {
    const user = userEvent.setup();
    const onRelationChange = vi.fn();
    const onComplete = vi.fn();

    render(
      <CockpitGuidedRelationQuestion
        entityType="Client"
        errors={{}}
        onRelationChange={onRelationChange}
        relationButtonRef={createRef<HTMLButtonElement>()}
        onComplete={onComplete}
      />
    );

    expect(screen.queryByRole('button', { name: /Tout/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Client comptant/ }));

    expect(onRelationChange).toHaveBeenCalledWith('Client comptant');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
