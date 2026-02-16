import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ClientList from './ClientList';
import { Agency, Client } from '@/types';

const buildClient = (overrides: Partial<Client> = {}): Client => ({
  id: 'client-1',
  account_type: 'term',
  address: '1 rue de Paris',
  agency_id: 'agency-1',
  archived_at: null,
  city: 'Paris',
  client_number: '10001',
  country: 'FR',
  created_at: '2025-01-01T00:00:00Z',
  created_by: null,
  department: '75',
  entity_type: 'Client',
  name: 'Client Alpha',
  notes: null,
  postal_code: '75001',
  siret: null,
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides
});

describe('ClientList', () => {
  it('shows empty state when no clients', () => {
    render(<ClientList clients={[]} selectedClientId={null} onSelect={vi.fn()} />);
    expect(screen.getByText(/aucun client trouve/i)).toBeInTheDocument();
  });

  it('calls onSelect when clicking a client row and shows archive badge', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const clients = [
      buildClient({ id: 'c1', name: 'Client A' }),
      buildClient({ id: 'c2', name: 'Client Archive', archived_at: '2025-01-10T00:00:00Z' })
    ];

    render(<ClientList clients={clients} selectedClientId={null} onSelect={onSelect} />);

    await user.click(screen.getByTestId('clients-list-row-c1'));
    expect(onSelect).toHaveBeenCalledWith('c1');
    expect(screen.getAllByText(/archive/i).length).toBeGreaterThan(0);
  });

  it('sorts clients by name when header is clicked', async () => {
    const user = userEvent.setup();
    const clients = [
      buildClient({ id: 'c1', name: 'Zeta Client' }),
      buildClient({ id: 'c2', name: 'Alpha Client' })
    ];

    render(<ClientList clients={clients} selectedClientId={null} onSelect={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /^client$/i }));

    const rows = screen.getAllByTestId(/clients-list-row-/i);
    expect(rows[0]).toHaveAttribute('data-testid', 'clients-list-row-c2');
  });

  it('shows reassign controls only in orphan view and calls onReassignEntity', async () => {
    const user = userEvent.setup();
    const onReassignEntity = vi.fn().mockResolvedValue(undefined);
    const orphanClient = buildClient({ id: 'c-orphan', agency_id: null });
    const agencies = [{ id: 'agency-2', name: 'Agence Beta', archived_at: null } as Agency];

    const { rerender } = render(
      <ClientList
        clients={[orphanClient]}
        selectedClientId={null}
        onSelect={vi.fn()}
        agencies={agencies}
        isOrphansFilterActive={false}
        onReassignEntity={onReassignEntity}
      />
    );

    expect(screen.queryByTestId('client-reassign-button-c-orphan')).toBeNull();

    rerender(
      <ClientList
        clients={[orphanClient]}
        selectedClientId={null}
        onSelect={vi.fn()}
        agencies={agencies}
        isOrphansFilterActive
        onReassignEntity={onReassignEntity}
      />
    );

    await user.click(screen.getByTestId('client-reassign-select-c-orphan'));
    await user.click(screen.getByRole('option', { name: /agence beta/i }));
    await user.click(screen.getByTestId('client-reassign-button-c-orphan'));

    expect(onReassignEntity).toHaveBeenCalledWith('c-orphan', 'agency-2');
  });
});
