import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ClientContactsList from '@/components/ClientContactsList';
import type { ClientContact } from '@/types';

const buildContact = (overrides: Partial<ClientContact> = {}): ClientContact => ({
  id: 'contact-1',
  archived_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
  email: 'alice@example.com',
  entity_id: 'entity-1',
  first_name: 'Alice',
  last_name: 'Martin',
  notes: null,
  phone: null,
  position: 'Achats',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides
});

describe('ClientContactsList', () => {
  it('renders shared compact rows and triggers edit/delete actions', async () => {
    const user = userEvent.setup();
    const contact = buildContact();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <ClientContactsList
        contacts={[contact]}
        focusedContactId={null}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    expect(screen.getByText('Alice Martin')).toBeInTheDocument();
    expect(screen.getByText('Achats · alice@example.com')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /modifier alice martin/i }));
    await user.click(screen.getByRole('button', { name: /supprimer alice martin/i }));

    expect(onEdit).toHaveBeenCalledWith(contact);
    expect(onDelete).toHaveBeenCalledWith(contact);
  });

  it('renders the configured empty label', () => {
    render(
      <ClientContactsList
        contacts={[]}
        focusedContactId={null}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        emptyLabel="Aucun contact pour ce prospect."
      />
    );

    expect(screen.getByText('Aucun contact pour ce prospect.')).toBeInTheDocument();
  });
});
