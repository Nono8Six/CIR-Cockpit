import { createRef, type ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import CockpitClientContactSection from '@/components/cockpit/left/CockpitClientContactSection';
import type { Entity, EntityContact } from '@/types';

const selectedEntity: Entity = {
  id: 'entity-1',
  account_type: 'term',
  address: null,
  agency_id: 'agency-1',
  archived_at: null,
  city: 'Paris',
  client_number: '123',
  country: 'France',
  created_at: '2026-01-01T00:00:00.000Z',
  created_by: null,
  department: null,
  entity_type: 'Client',
  name: 'Client Alpha',
  notes: null,
  postal_code: null,
  siret: null,
  updated_at: '2026-01-01T00:00:00.000Z'
};

const buildContact = (overrides: Partial<EntityContact> = {}): EntityContact => ({
  id: 'contact-1',
  archived_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
  email: 'alice@example.com',
  entity_id: 'entity-1',
  first_name: 'Alice',
  last_name: 'Martin',
  notes: null,
  phone: null,
  position: 'Responsable technique',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides
});

const buildProps = (
  overrides: Partial<ComponentProps<typeof CockpitClientContactSection>> = {}
): ComponentProps<typeof CockpitClientContactSection> => ({
  labelStyle: '',
  errors: {},
  selectedEntity,
  selectedContact: null,
  selectedContactMeta: '',
  contactSelectValue: 'none',
  contacts: [buildContact()],
  contactsLoading: false,
  onContactSelect: vi.fn(),
  contactSelectRef: createRef<HTMLButtonElement>(),
  onOpenContactDialog: vi.fn(),
  onClearSelectedContact: vi.fn(),
  ...overrides
});

describe('CockpitClientContactSection', () => {
  it('selects an existing contact from a compact row', async () => {
    const user = userEvent.setup();
    const onContactSelect = vi.fn();

    render(<CockpitClientContactSection {...buildProps({ onContactSelect })} />);

    await user.click(screen.getByRole('button', { name: /sélectionner alice martin/i }));

    expect(onContactSelect).toHaveBeenCalledWith('contact-1');
    expect(screen.getByText('Responsable technique · alice@example.com')).toBeInTheDocument();
  });

  it('keeps the selected state compact and exposes a change action', async () => {
    const user = userEvent.setup();
    const onClearSelectedContact = vi.fn();

    render(
      <CockpitClientContactSection
        {...buildProps({
          selectedContact: buildContact(),
          onClearSelectedContact
        })}
      />
    );

    await user.click(screen.getByRole('button', { name: /changer le contact/i }));

    expect(onClearSelectedContact).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Alice Martin')).toBeInTheDocument();
  });

  it('shows a small empty state and keeps add contact available', async () => {
    const user = userEvent.setup();
    const onOpenContactDialog = vi.fn();

    render(
      <CockpitClientContactSection
        {...buildProps({
          contacts: [],
          onOpenContactDialog
        })}
      />
    );

    expect(screen.getByText('Aucun contact rattaché')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /ajouter un nouveau contact/i }));
    expect(onOpenContactDialog).toHaveBeenCalledTimes(1);
  });
});
