import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import AuditLogsFilters from '@/components/audit-logs/AuditLogsFilters';
import type { Agency } from '@/types';
import type { AdminUserSummary } from '@/services/admin/getAdminUsers';

const agencies: Agency[] = [
  {
    id: 'agency-1',
    name: 'Agence Sud',
    archived_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  }
];

const users: AdminUserSummary[] = [
  {
    id: 'user-1',
    email: 'admin@cir.fr',
    display_name: 'Admin CIR',
    first_name: 'CIR',
    last_name: 'Admin',
    role: 'super_admin',
    archived_at: null,
    created_at: '2026-01-01T00:00:00Z',
    memberships: []
  }
];

describe('AuditLogsFilters', () => {
  it('uses shadcn selects instead of native select', () => {
    const { container } = render(
      <AuditLogsFilters
        userRole="super_admin"
        agencies={agencies}
        users={users}
        agencyId={null}
        actorId={null}
        entityTable=""
        onAgencyChange={vi.fn()}
        onActorChange={vi.fn()}
        onEntityTableChange={vi.fn()}
      />
    );

    expect(container.querySelector('select')).toBeNull();
    expect(screen.getByTestId('admin-audit-filter-agency-trigger')).toBeInTheDocument();
    expect(screen.getByTestId('admin-audit-filter-user-trigger')).toBeInTheDocument();
  });

  it('updates table filter input', async () => {
    const user = userEvent.setup();
    const onEntityTableChange = vi.fn();

    render(
      <AuditLogsFilters
        userRole="super_admin"
        agencies={agencies}
        users={users}
        agencyId={null}
        actorId={null}
        entityTable=""
        onAgencyChange={vi.fn()}
        onActorChange={vi.fn()}
        onEntityTableChange={onEntityTableChange}
      />
    );

    const tableInput = screen.getByTestId('admin-audit-filter-table-input');
    await user.type(tableInput, 'clients');

    expect(onEntityTableChange).toHaveBeenCalled();
  });

  it('associates labels with controls for accessibility', () => {
    render(
      <AuditLogsFilters
        userRole="super_admin"
        agencies={agencies}
        users={users}
        agencyId={null}
        actorId={null}
        entityTable=""
        onAgencyChange={vi.fn()}
        onActorChange={vi.fn()}
        onEntityTableChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/agence/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/utilisateur/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/table/i)).toBeInTheDocument();
  });
});
