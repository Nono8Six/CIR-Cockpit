import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';

import ClientList from '@/components/ClientList';
import type { Client } from '@/types';

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

describe('ClientList accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <ClientList
        clients={[buildClient()]}
        selectedClientId={null}
        onSelect={() => undefined}
      />
    );

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
