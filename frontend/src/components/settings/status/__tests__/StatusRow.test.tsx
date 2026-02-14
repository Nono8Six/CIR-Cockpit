import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import StatusRow from '@/components/settings/status/StatusRow';
import type { AgencyStatus } from '@/types';

const status: AgencyStatus = {
  id: 'status-1',
  label: 'Nouveau',
  category: 'todo',
  is_default: true,
  is_terminal: false,
  sort_order: 1
};

describe('StatusRow', () => {
  it('uses shadcn select instead of native select', () => {
    const { container } = render(
      <StatusRow
        status={status}
        index={0}
        readOnly={false}
        onRemove={vi.fn()}
        onLabelUpdate={vi.fn()}
        onCategoryUpdate={vi.fn()}
      />
    );

    expect(container.querySelector('select')).toBeNull();
    expect(screen.getByTestId('settings-status-row-category-0')).toBeInTheDocument();
  });

  it('updates the status label and category', async () => {
    const user = userEvent.setup();
    const onLabelUpdate = vi.fn();
    const onCategoryUpdate = vi.fn();

    render(
      <StatusRow
        status={status}
        index={0}
        readOnly={false}
        onRemove={vi.fn()}
        onLabelUpdate={onLabelUpdate}
        onCategoryUpdate={onCategoryUpdate}
      />
    );

    const input = screen.getByLabelText('Statut 1');
    await user.clear(input);
    await user.type(input, 'Qualification');
    expect(onLabelUpdate).toHaveBeenCalled();

    await user.click(screen.getByTestId('settings-status-row-category-0'));
    await user.click(screen.getByRole('option', { name: /en cours/i }));
    expect(onCategoryUpdate).toHaveBeenCalledWith(0, 'in_progress');
  });
});
