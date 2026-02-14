import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import DashboardToolbar from '@/components/dashboard/DashboardToolbar';

const baseProps = {
  viewMode: 'kanban' as const,
  onViewModeChange: vi.fn(),
  period: 'today' as const,
  onPeriodChange: vi.fn(),
  periodErrorMessage: null as string | null,
  effectiveStartDate: '2026-02-01',
  effectiveEndDate: '2026-02-09',
  onDateRangeChange: vi.fn(),
  onStartDateChange: vi.fn(),
  onEndDateChange: vi.fn(),
  searchTerm: '',
  onSearchTermChange: vi.fn()
};

describe('DashboardToolbar', () => {
  it('pilote les vues, la periode, les dates et la recherche', async () => {
    const user = userEvent.setup();
    const onViewModeChange = vi.fn();
    const onPeriodChange = vi.fn();
    const onDateRangeChange = vi.fn();
    const onStartDateChange = vi.fn();
    const onEndDateChange = vi.fn();
    const onSearchTermChange = vi.fn();

    render(
      <DashboardToolbar
        {...baseProps}
        onViewModeChange={onViewModeChange}
        onPeriodChange={onPeriodChange}
        onDateRangeChange={onDateRangeChange}
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
        onSearchTermChange={onSearchTermChange}
      />
    );

    await user.click(screen.getByRole('tab', { name: /historique/i }));
    expect(onViewModeChange).toHaveBeenCalledWith('list');

    await user.click(screen.getByTestId('dashboard-period-select'));
    await user.click(screen.getByRole('option', { name: /mois dernier/i }));
    expect(onPeriodChange).toHaveBeenCalledWith('lastMonth');
    expect(screen.getByTestId('dashboard-date-range-help')).toBeInTheDocument();

    await user.click(screen.getByTestId('dashboard-date-range-trigger'));
    expect(screen.getByTestId('dashboard-date-range-apply')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-date-range-cancel')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('dashboard-start-date'), {
      target: { value: '2026-02-02' }
    });
    expect(onStartDateChange).toHaveBeenCalledWith('2026-02-02');

    fireEvent.change(screen.getByTestId('dashboard-end-date'), {
      target: { value: '2026-02-10' }
    });
    expect(onEndDateChange).toHaveBeenCalledWith('2026-02-10');
    expect(onDateRangeChange).not.toHaveBeenCalled();

    fireEvent.change(screen.getByTestId('dashboard-search-input'), {
      target: { value: 'P06' }
    });
    expect(onSearchTermChange).toHaveBeenLastCalledWith('P06');
  });

  it("affiche l'erreur utilisateur de periode", () => {
    render(
      <DashboardToolbar
        {...baseProps}
        periodErrorMessage="La date de debut doit preceder la date de fin."
      />
    );

    expect(screen.getByTestId('dashboard-period-error')).toHaveTextContent(
      /date de debut doit preceder/i
    );
  });
});
