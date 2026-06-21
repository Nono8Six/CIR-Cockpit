import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { AuditLogEntry } from '@/services/admin/getAuditLogs';
import ClientDirectoryRecordHistoryPanel from '../ClientDirectoryRecordHistoryPanel';

const buildAuditLog = (index: number, metadata: AuditLogEntry['metadata'] = {
  ['source']: 'manual_edit',
  changes: [{ field: 'name', before: `Avant ${index}`, after: `Après ${index}` }]
}): AuditLogEntry => ({
  id: `audit-${index}`,
  action: 'UPDATE',
  entity_table: 'entities',
  entity_id: 'entity-1',
  metadata,
  created_at: `2026-06-${String((index % 20) + 1).padStart(2, '0')}T10:00:00.000Z`,
  actor_id: 'user-1',
  actor_is_super_admin: true,
  agency_id: 'agency-1',
  actor: {
    id: 'user-1',
    display_name: 'Arnaud FERRON',
    email: 'arnaud@example.test'
  },
  agency: {
    id: 'agency-1',
    name: 'CIR Bordeaux'
  }
});

describe('ClientDirectoryRecordHistoryPanel', () => {
  it('paginates audit events and lets users change the page size', async () => {
    const user = userEvent.setup();
    const logs = Array.from({ length: 12 }, (_, index) => buildAuditLog(index + 1));

    render(
      <ClientDirectoryRecordHistoryPanel
        logs={logs}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
      />
    );

    expect(screen.getByText('1-10 sur 12 · Page 1/2')).toBeInTheDocument();
    expect(document.body).toHaveTextContent('Après 10');
    expect(document.body).not.toHaveTextContent('Après 11');

    await user.click(screen.getByRole('button', { name: "Page suivante de l'historique" }));

    expect(screen.getByText('11-12 sur 12 · Page 2/2')).toBeInTheDocument();
    expect(document.body).toHaveTextContent('Après 11');

    await user.selectOptions(screen.getByLabelText("Nombre d'événements par page"), '20');

    expect(screen.getByText('1-12 sur 12 · Page 1/1')).toBeInTheDocument();
    expect(document.body).toHaveTextContent('Après 12');
  });

  it('shows actor, agency and detailed metadata changes', () => {
    render(
      <ClientDirectoryRecordHistoryPanel
        logs={[
          buildAuditLog(1, {
            ['source']: 'manual_edit',
            status_before: 'En cours',
            status_after: 'Terminé'
          })
        ]}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
      />
    );

    expect(screen.getByText(/Par Arnaud FERRON/)).toBeInTheDocument();
    expect(screen.getByText(/arnaud@example\.test/)).toBeInTheDocument();
    expect(screen.getByText(/CIR Bordeaux/)).toBeInTheDocument();
    expect(screen.getByText('Statut')).toBeInTheDocument();
    expect(screen.getByText('En cours -> Terminé')).toBeInTheDocument();
  });

  it('explains legacy audit events without actor or before/after details', () => {
    render(
      <ClientDirectoryRecordHistoryPanel
        logs={[
          {
            ...buildAuditLog(1, {
              name: 'SEA',
              email: 'kevin.chauchet@sea-sarl.fr',
              entity_id: '30391709-cf97-493d-8644-6c2a1984ad1f'
            }),
            actor_id: null,
            actor: null,
            actor_is_super_admin: false
          }
        ]}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
      />
    );

    expect(screen.getByText(/Par Acteur non capturé/)).toBeInTheDocument();
    expect(screen.getByText(/actor_id absent dans audit_logs/)).toBeInTheDocument();
    expect(screen.getByText(/Ancien format d’audit/)).toBeInTheDocument();
    expect(screen.getByText(/Valeurs connues enregistrées/)).toBeInTheDocument();
    expect(screen.getByText('SEA')).toBeInTheDocument();
  });
});
