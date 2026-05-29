import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CockpitReadonlyView from '@/components/cockpit/CockpitReadonlyView';
import { Channel, type InteractionDraft } from '@/types';
import type { AgencyConfig } from '@/services/config';

const config: AgencyConfig = {
  statuses: [
    {
      id: 'status-1',
      label: 'Nouveau',
      category: 'todo',
      is_terminal: false,
      is_default: true,
      is_active: true,
      sort_order: 1
    }
  ],
  historicalStatuses: [],
  services: ['Atelier'],
  families: ['Freinage'],
  interactionTypes: ['Devis']
};

const interaction: InteractionDraft = {
  id: 'interaction-1',
  channel: Channel.PHONE,
  entity_type: 'Prospect',
  contact_service: 'Atelier',
  interaction_type: 'Devis',
  company_name: 'Ateliers Rive Ouest',
  contact_first_name: 'Aline',
  contact_last_name: 'Martin',
  contact_position: '',
  contact_name: '',
  contact_phone: '0102030405',
  contact_email: undefined,
  mega_families: undefined,
  subject: 'Demande de devis',
  order_ref: '',
  reminder_at: undefined,
  notes: '',
  timeline: [],
  status_id: 'status-1'
};

describe('CockpitReadonlyView', () => {
  it('ne rend pas de tags quand mega_families est absent', () => {
    render(
      <CockpitReadonlyView
        interaction={interaction}
        config={config}
        onStartNew={vi.fn()}
      />
    );

    expect(screen.getByTestId('cockpit-readonly-view')).toBeInTheDocument();
    expect(screen.queryByTestId('cockpit-readonly-tags')).not.toBeInTheDocument();
  });

  it('resume une sollicitation avec uniquement nom telephone et description', () => {
    render(
      <CockpitReadonlyView
        interaction={{
          ...interaction,
          entity_type: 'Sollicitation',
          contact_service: 'Comptabilité',
          interaction_type: 'Démarchage téléphonique',
          contact_name: 'Test pub',
          contact_phone: '05 58 96 52 12',
          subject: 'Appel publicitaire',
          notes: 'Appel publicitaire pour proposer une offre fournisseur.',
          reminder_at: '2026-05-15T08:00:00Z'
        }}
        config={config}
        onStartNew={vi.fn()}
      />
    );

    expect(screen.getByText('Sollicitation enregistrée')).toBeInTheDocument();
    expect(screen.getByText('Test pub')).toBeInTheDocument();
    expect(screen.getByText('05 58 96 52 12')).toBeInTheDocument();
    expect(screen.getByText('Appel publicitaire pour proposer une offre fournisseur.')).toBeInTheDocument();
    expect(screen.queryByText('Comptabilité')).not.toBeInTheDocument();
    expect(screen.queryByText('Démarchage téléphonique')).not.toBeInTheDocument();
    expect(screen.queryByText('Nouveau')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cockpit-readonly-subject')).not.toBeInTheDocument();
  });

  it('resume une interaction interne avec uniquement contact telephone et description', () => {
    render(
      <CockpitReadonlyView
        interaction={{
          ...interaction,
          entity_type: 'Interne (CIR)',
          contact_service: 'Comptabilité',
          interaction_type: 'Interne (CIR)',
          company_name: 'CIR',
          contact_name: 'Arnaud FERRON',
          contact_phone: '05 58 36 96 19',
          subject: 'Synchronisation atelier',
          notes: 'Point rapide avec l’agence sur le dossier.',
          reminder_at: '2026-05-15T08:00:00Z'
        }}
        config={config}
        onStartNew={vi.fn()}
      />
    );

    expect(screen.getByText('Interaction interne enregistrée')).toBeInTheDocument();
    expect(screen.getByText('Arnaud FERRON')).toBeInTheDocument();
    expect(screen.getByText('05 58 36 96 19')).toBeInTheDocument();
    expect(screen.getByText('Point rapide avec l’agence sur le dossier.')).toBeInTheDocument();
    expect(screen.queryByText('Comptabilité')).not.toBeInTheDocument();
    expect(screen.queryByText('Interne (CIR)')).not.toBeInTheDocument();
    expect(screen.queryByText('Nouveau')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cockpit-readonly-subject')).not.toBeInTheDocument();
  });

  it('resume une interaction fournisseur sans statut ni qualification visibles', () => {
    render(
      <CockpitReadonlyView
        interaction={{
          ...interaction,
          entity_type: 'Fournisseur',
          company_name: 'SEA Aquitaine',
          contact_service: 'Achats',
          interaction_type: 'Relance',
          contact_first_name: '',
          contact_last_name: '',
          contact_name: '',
          contact_phone: '05 58 36 96 19',
          subject: 'Relance délai fournisseur',
          notes: 'Relance sur délai de livraison vérins.'
        }}
        config={config}
        onStartNew={vi.fn()}
      />
    );

    expect(screen.getByText('Interaction fournisseur enregistrée')).toBeInTheDocument();
    expect(screen.getByText('SEA Aquitaine')).toBeInTheDocument();
    expect(screen.getByText('05 58 36 96 19')).toBeInTheDocument();
    expect(screen.getByText('Relance sur délai de livraison vérins.')).toBeInTheDocument();
    expect(screen.queryByText('Achats')).not.toBeInTheDocument();
    expect(screen.queryByText('Relance')).not.toBeInTheDocument();
    expect(screen.queryByText('Nouveau')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cockpit-readonly-subject')).not.toBeInTheDocument();
  });
});
