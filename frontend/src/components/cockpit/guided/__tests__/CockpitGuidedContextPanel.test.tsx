import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import CockpitGuidedContextPanel from '../CockpitGuidedContextPanel';
import { Channel, type Entity, type EntityContact, type Interaction } from '@/types';

const buildEntity = (overrides: Partial<Entity> = {}): Entity => ({
  id: overrides.id ?? 'entity-1',
  agency_id: overrides.agency_id ?? 'agency-1',
  account_type: overrides.account_type ?? 'term',
  address: overrides.address ?? null,
  archived_at: overrides.archived_at ?? null,
  cir_commercial_id: overrides.cir_commercial_id ?? null,
  city: overrides.city ?? 'Gradignan',
  client_kind: overrides.client_kind ?? null,
  client_number: overrides.client_number ?? '116277',
  country: overrides.country ?? 'France',
  created_at: overrides.created_at ?? '2026-04-20T10:00:00.000Z',
  created_by: overrides.created_by ?? null,
  department: overrides.department ?? '33',
  entity_type: overrides.entity_type ?? 'Client',
  naf_code: overrides.naf_code ?? '4669B',
  name: overrides.name ?? 'SEA',
  notes: overrides.notes ?? null,
  official_data_source: overrides.official_data_source ?? null,
  official_data_synced_at: overrides.official_data_synced_at ?? null,
  official_name: overrides.official_name ?? null,
  postal_code: overrides.postal_code ?? '33170',
  siren: overrides.siren ?? '123456789',
  siret: overrides.siret ?? '12345678900010',
  updated_at: overrides.updated_at ?? '2026-04-20T10:00:00.000Z'
});

const buildContact = (overrides: Partial<EntityContact> = {}): EntityContact => ({
  id: overrides.id ?? 'contact-1',
  archived_at: overrides.archived_at ?? null,
  created_at: overrides.created_at ?? '2026-04-20T10:00:00.000Z',
  email: overrides.email ?? 'kevin.chauchet@sea.fr',
  entity_id: overrides.entity_id ?? 'entity-1',
  first_name: overrides.first_name ?? 'Kévin',
  last_name: overrides.last_name ?? 'CHAUCHET',
  notes: overrides.notes ?? null,
  phone: overrides.phone ?? '05 56 00 00 00',
  position: overrides.position ?? 'Responsable technique',
  updated_at: overrides.updated_at ?? '2026-04-20T10:00:00.000Z'
});

const buildInteraction = (overrides: Partial<Interaction> & { id: string }): Interaction => ({
  id: overrides.id,
  agency_id: overrides.agency_id ?? 'agency-1',
  channel: overrides.channel ?? Channel.PHONE,
  company_name: overrides.company_name ?? 'SEA',
  contact_email: overrides.contact_email ?? null,
  contact_id: overrides.contact_id ?? null,
  contact_name: overrides.contact_name ?? 'Kévin CHAUCHET',
  contact_phone: overrides.contact_phone ?? null,
  contact_service: overrides.contact_service ?? 'Atelier',
  created_at: overrides.created_at ?? '2026-04-20T10:00:00.000Z',
  created_by: overrides.created_by ?? 'user-2',
  entity_id: overrides.entity_id ?? 'entity-1',
  entity_type: overrides.entity_type ?? 'Client',
  interaction_type: overrides.interaction_type ?? 'Devis',
  last_action_at: overrides.last_action_at ?? '2026-04-20T10:00:00.000Z',
  mega_families: overrides.mega_families ?? [],
  notes: overrides.notes ?? null,
  order_ref: overrides.order_ref ?? null,
  reminder_at: overrides.reminder_at ?? null,
  status: overrides.status ?? 'Nouveau',
  status_id: overrides.status_id ?? 'status-1',
  status_is_terminal: overrides.status_is_terminal ?? false,
  subject: overrides.subject ?? 'Demande de prix',
  timeline: overrides.timeline ?? [],
  updated_at: overrides.updated_at ?? '2026-04-20T10:00:00.000Z',
  updated_by: overrides.updated_by ?? null
});

const renderPanel = (props: Partial<Parameters<typeof CockpitGuidedContextPanel>[0]> = {}) =>
  render(
    <CockpitGuidedContextPanel
      selectedEntity={buildEntity()}
      selectedContact={buildContact()}
      clientInteractions={[]}
      totalClientInteractions={0}
      isClientInteractionsLoading={false}
      hasClientInteractionsError={false}
      {...props}
    />
  );

describe('CockpitGuidedContextPanel', () => {
  it('affiche les interactions fournies pour le client sans reprendre les recentes utilisateur', () => {
    renderPanel({
      clientInteractions: [
        buildInteraction({ id: 'client-interaction', subject: 'Demande vérin', contact_name: 'Contact Ligne' })
      ],
      totalClientInteractions: 1
    });

    expect(screen.getByText('Demande vérin')).toBeInTheDocument();
    expect(screen.getByText('116277 - Client')).toBeInTheDocument();
    expect(screen.getByText('33170 Gradignan')).toBeInTheDocument();
    expect(screen.getByText('Compte à terme')).toBeInTheDocument();
    expect(screen.queryByText(/116277 - 116277/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Interaction autre client')).not.toBeInTheDocument();
  });

  it('affiche un etat vide quand le client n a aucune interaction rattachee', () => {
    renderPanel({ clientInteractions: [], totalClientInteractions: 0 });

    expect(screen.getByText('Aucune interaction rattachée à ce client.')).toBeInTheDocument();
    expect(screen.queryByText('Kévin CHAUCHET')).not.toBeInTheDocument();
  });

  it('garde l etat vide quand les interactions client ne sont pas encore hydratees', () => {
    renderPanel({ clientInteractions: undefined, totalClientInteractions: 0 });

    expect(screen.getByText('Aucune interaction rattachée à ce client.')).toBeInTheDocument();
  });

  it('desactive les actions telephone et email quand le contact ne les possede pas', () => {
    renderPanel({
      selectedContact: { ...buildContact(), phone: null, email: null }
    });

    expect(screen.getByRole('button', { name: 'Téléphone' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Email' })).toBeDisabled();
  });
});
