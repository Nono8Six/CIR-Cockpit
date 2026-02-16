import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ProspectList from './ProspectList';
import { Agency, Entity } from '@/types';

const buildProspect = (overrides: Partial<Entity> = {}): Entity => ({
  id: 'prospect-1',
  account_type: null,
  address: null,
  agency_id: 'agency-1',
  archived_at: null,
  city: 'Bordeaux',
  client_number: null,
  country: 'FR',
  created_at: '2025-01-01T00:00:00Z',
  created_by: null,
  department: '33',
  entity_type: 'Prospect',
  name: 'Prospect Alpha',
  notes: null,
  postal_code: '33000',
  siret: null,
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides
});

describe('ProspectList', () => {
  it('shows empty state when no prospects', () => {
    render(<ProspectList prospects={[]} selectedProspectId={null} onSelect={vi.fn()} />);
    expect(screen.getByText(/aucun prospect trouve/i)).toBeInTheDocument();
  });

  it('calls onSelect when clicking a prospect row and shows archive badge', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const prospects = [
      buildProspect({ id: 'p1', name: 'Prospect A' }),
      buildProspect({ id: 'p2', name: 'Prospect Archive', archived_at: '2025-01-10T00:00:00Z' })
    ];

    render(<ProspectList prospects={prospects} selectedProspectId={null} onSelect={onSelect} />);

    await user.click(screen.getByTestId('prospects-list-row-p1'));
    expect(onSelect).toHaveBeenCalledWith('p1');
    expect(screen.getAllByText(/archive/i).length).toBeGreaterThan(0);
  });

  it('sorts prospects by name when header is clicked', async () => {
    const user = userEvent.setup();
    const prospects = [
      buildProspect({ id: 'p1', name: 'Zeta Prospect' }),
      buildProspect({ id: 'p2', name: 'Alpha Prospect' })
    ];

    render(<ProspectList prospects={prospects} selectedProspectId={null} onSelect={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /prospect/i }));

    const rows = screen.getAllByTestId(/prospects-list-row-/i);
    expect(rows[0]).toHaveAttribute('data-testid', 'prospects-list-row-p2');
  });

  it('shows reassign controls only in orphan view and calls onReassignEntity', async () => {
    const user = userEvent.setup();
    const onReassignEntity = vi.fn().mockResolvedValue(undefined);
    const orphanProspect = buildProspect({ id: 'p-orphan', agency_id: null });
    const agencies = [{ id: 'agency-2', name: 'Agence Beta', archived_at: null } as Agency];

    const { rerender } = render(
      <ProspectList
        prospects={[orphanProspect]}
        selectedProspectId={null}
        onSelect={vi.fn()}
        agencies={agencies}
        isOrphansFilterActive={false}
        onReassignEntity={onReassignEntity}
      />
    );

    expect(screen.queryByTestId('prospect-reassign-button-p-orphan')).toBeNull();

    rerender(
      <ProspectList
        prospects={[orphanProspect]}
        selectedProspectId={null}
        onSelect={vi.fn()}
        agencies={agencies}
        isOrphansFilterActive
        onReassignEntity={onReassignEntity}
      />
    );

    await user.click(screen.getByTestId('prospect-reassign-select-p-orphan'));
    await user.click(screen.getByRole('option', { name: /agence beta/i }));
    await user.click(screen.getByTestId('prospect-reassign-button-p-orphan'));

    expect(onReassignEntity).toHaveBeenCalledWith('p-orphan', 'agency-2');
  });
});
