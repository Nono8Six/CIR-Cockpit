import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ClientDirectoryRecordActionsBar from '../ClientDirectoryRecordActionsBar';

const renderActionsBar = (
  overrides: Partial<Parameters<typeof ClientDirectoryRecordActionsBar>[0]> = {}
) => {
  const onConfirmDelete = vi.fn().mockResolvedValue(true);

  render(
    <ClientDirectoryRecordActionsBar
      isProspect={false}
      isSupplier={false}
      canDeleteRecord
      deleteLabel="Supprimer définitivement"
      recordName="ACME Industries"
      isDeleting={false}
      onEditClient={vi.fn()}
      onEditProspect={vi.fn()}
      onEditSupplier={vi.fn()}
      onConvertProspect={vi.fn()}
      onConfirmDelete={onConfirmDelete}
      {...overrides}
    />
  );

  return { onConfirmDelete };
};

describe('ClientDirectoryRecordActionsBar', () => {
  it('keeps the destructive action out of the main action bar', () => {
    renderActionsBar();

    expect(screen.getByRole('button', { name: 'Modifier' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Supprimer définitivement' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Plus d'actions" })).toBeInTheDocument();
  });

  it('requires the exact record name before enabling the confirmation button', async () => {
    const user = userEvent.setup();
    const { onConfirmDelete } = renderActionsBar();

    await user.click(screen.getByRole('button', { name: "Plus d'actions" }));
    await user.click(await screen.findByRole('menuitem', { name: 'Supprimer définitivement' }));

    const confirmButton = await screen.findByRole('button', { name: 'Supprimer définitivement' });
    expect(confirmButton).toBeDisabled();

    const input = screen.getByPlaceholderText('Nom de la fiche');
    await user.type(input, 'ACME');
    expect(confirmButton).toBeDisabled();

    await user.type(input, ' Industries');
    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);
    expect(onConfirmDelete).toHaveBeenCalledWith(true);
  });

  it('closes on Escape without deleting and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    const { onConfirmDelete } = renderActionsBar();

    const trigger = screen.getByRole('button', { name: "Plus d'actions" });
    await user.click(trigger);
    await user.click(await screen.findByRole('menuitem', { name: 'Supprimer définitivement' }));
    await screen.findByRole('alertdialog');

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
    expect(onConfirmDelete).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });
});
