import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/test-utils';
import ActivityCanonicalDetails from '@/components/interactions/ActivityCanonicalDetails';
import { correctActivityV2 } from '@/services/interactions/correctActivityV2';
import { getActivityV2 } from '@/services/interactions/getActivityV2';
import type { ActivityV2 } from '../../../../../shared/schemas/interaction/activity-v2.schema';

vi.mock('@/services/interactions/getActivityV2', () => ({ getActivityV2: vi.fn() }));
vi.mock('@/services/interactions/correctActivityV2', () => ({ correctActivityV2: vi.fn() }));

const id = (suffix: string) => `00000000-0000-4000-8000-${suffix.padStart(12, '0')}`;
const timestamp = '2026-08-09T10:00:00.000Z';

const activity: ActivityV2 = {
  id: id('1'),
  legacy_interaction_id: 'interaction-1',
  agency_id: id('2'),
  author_id: id('3'),
  created_by: id('3'),
  updated_by: id('3'),
  legacy_updated_by_raw: null,
  occurred_at: timestamp,
  channel: 'Téléphone',
  activity_type: 'Demande',
  subject: 'Roulement moteur',
  report: 'Besoin confirmé.',
  organization_id: id('4'),
  contact_id: id('5'),
  lifecycle_status: 'corrected',
  version: 2,
  corrected_at: timestamp,
  archived_at: null,
  created_at: timestamp,
  updated_at: timestamp,
  participants: [{
    id: id('6'),
    participant_kind: 'external',
    internal_profile_id: null,
    external_contact_id: id('5'),
    organization_id: id('4'),
    participant_role: 'contact',
  }],
  sources: [{
    id: id('7'),
    source_type: 'legacy_interaction',
    source_reference: 'interaction-1',
    source_label: 'Saisie Cockpit',
    captured_at: timestamp,
  }],
  attachments: [{
    id: id('8'),
    source_id: id('7'),
    file_name: 'plaque-moteur.jpg',
    mime_type: 'image/jpeg',
    byte_size: 1234,
    checksum_sha256: 'a'.repeat(64),
    storage_bucket: null,
    storage_object_path: null,
  }],
  history: [{
    id: id('9'),
    event_order: 1,
    legacy_event_id: 'legacy-event-1',
    event_type: 'creation',
    event_domain: 'activity',
    occurred_at: timestamp,
    author_id: id('3'),
    author_label_raw: null,
    content: 'Activité créée',
    raw_event: null,
  }],
  corrections: [{
    id: id('10'),
    activity_version: 2,
    field_name: 'subject',
    previous_value: 'Roulement',
    new_value: 'Roulement moteur',
    corrected_by: id('3'),
    corrected_at: timestamp,
    reason: 'Précision client',
  }],
};

describe('ActivityCanonicalDetails', () => {
  beforeEach(() => vi.clearAllMocks());

  it('affiche le contrat canonique complet après récupération d’une erreur de lecture', async () => {
    vi.mocked(getActivityV2)
      .mockRejectedValueOnce(new Error('indisponible'))
      .mockResolvedValueOnce(activity);

    renderWithProviders(<ActivityCanonicalDetails legacyInteractionId="interaction-1" />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/détail canonique.*indisponible/i);
    await userEvent.click(screen.getByRole('button', { name: /réessayer/i }));

    expect(await screen.findByRole('region', { name: /données canoniques/i })).toBeInTheDocument();
    expect(screen.getByText('Saisie Cockpit')).toBeInTheDocument();
    expect(screen.getByText(/contact · externe/i)).toBeInTheDocument();
    expect(screen.getByText(/activité créée/i)).toBeInTheDocument();
    expect(screen.getByText(/plaque-moteur\.jpg/i)).toBeInTheDocument();
    expect(screen.getByText(/précision client/i)).toBeInTheDocument();
  });

  it('rend un conflit de correction actionnable sans perdre les données affichées', async () => {
    vi.mocked(getActivityV2).mockResolvedValue(activity);
    vi.mocked(correctActivityV2).mockRejectedValue(new Error('Version périmée.'));
    const user = userEvent.setup();

    renderWithProviders(<ActivityCanonicalDetails legacyInteractionId="interaction-1" />);
    await user.clear(await screen.findByLabelText(/objet de l’activité/i));
    await user.type(screen.getByLabelText(/objet de l’activité/i), 'Roulement urgent');
    await user.type(screen.getByLabelText(/motif de correction/i), 'Retour client');
    await user.click(screen.getByRole('button', { name: /^corriger$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/rechargez l’activité puis réessayez/i);
    expect(screen.getByLabelText(/objet de l’activité/i)).toHaveValue('Roulement urgent');
  });
});
