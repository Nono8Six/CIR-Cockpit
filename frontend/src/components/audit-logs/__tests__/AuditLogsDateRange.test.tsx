import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AuditLogsDateRange from '@/components/audit-logs/AuditLogsDateRange';

describe('AuditLogsDateRange', () => {
  it('associates labels with date inputs', () => {
    render(
      <AuditLogsDateRange
        fromDate=""
        toDate=""
        onFromDateChange={vi.fn()}
        onToDateChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/^du$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^au$/i)).toBeInTheDocument();
  });

  it('updates range values through callbacks', async () => {
    const user = userEvent.setup();
    const onFromDateChange = vi.fn();
    const onToDateChange = vi.fn();

    render(
      <AuditLogsDateRange
        fromDate=""
        toDate=""
        onFromDateChange={onFromDateChange}
        onToDateChange={onToDateChange}
      />
    );

    await user.type(screen.getByLabelText(/^du$/i), '2026-02-20');
    await user.type(screen.getByLabelText(/^au$/i), '2026-02-26');

    expect(onFromDateChange).toHaveBeenCalled();
    expect(onToDateChange).toHaveBeenCalled();
  });
});
