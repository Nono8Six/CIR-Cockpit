import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import UserMembershipDialog from '@/components/UserMembershipDialog';

const agencies = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Agence A',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    archived_at: null
  }
];

describe('UserMembershipDialog', () => {
  it('prevents saving when no agency is selected', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <UserMembershipDialog
        open
        onOpenChange={vi.fn()}
        agencies={agencies}
        selectedIds={[]}
        onSave={onSave}
      />
    );

    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(await screen.findByText(/au moins une agence requise/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});
