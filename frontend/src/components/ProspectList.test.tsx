import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ProspectList from './ProspectList';
import { Entity } from '@/types';

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

  it('calls onSelect when clicking a prospect and shows archive badge', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const prospects = [
      buildProspect({ id: 'p1', name: 'Prospect A' }),
      buildProspect({ id: 'p2', name: 'Prospect Archive', archived_at: '2025-01-10T00:00:00Z' })
    ];

    render(<ProspectList prospects={prospects} selectedProspectId={null} onSelect={onSelect} />);

    const prospectButton = screen
      .getAllByRole('button')
      .find((button) => (button.textContent ?? '').includes('Prospect A'));
    expect(prospectButton).toBeTruthy();
    await user.click(prospectButton as HTMLElement);
    expect(onSelect).toHaveBeenCalledWith('p1');
    expect(screen.getAllByText(/archive/i).length).toBeGreaterThan(0);
  });
});
