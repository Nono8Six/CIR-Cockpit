import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import AgencyFormDialog from '@/components/AgencyFormDialog';

describe('AgencyFormDialog', () => {
  it('blocks submit when agency name is empty', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <AgencyFormDialog
        open
        onOpenChange={vi.fn()}
        title="Nouvelle agence"
        onSubmit={onSubmit}
      />
    );

    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(await screen.findByText(/nom d'agence requis/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows a root error when submit fails', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error('boom'));

    render(
      <AgencyFormDialog
        open
        onOpenChange={vi.fn()}
        title="Nouvelle agence"
        onSubmit={onSubmit}
      />
    );

    await user.type(screen.getByLabelText(/nom de l'agence/i), 'Agence Test');
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(await screen.findByText(/impossible d'enregistrer l'agence/i)).toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
