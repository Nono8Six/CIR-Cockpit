import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import DashboardPageHeader, {
  type DashboardHeaderStats
} from '@/components/dashboard/DashboardPageHeader';

const baseStats: DashboardHeaderStats = {
  overdueCount: 2,
  dueTodayCount: 1,
  openCount: 8,
  pipelineOpenCount: 4,
  pipelineOpenAmount: 12400,
  wonCount30d: 3,
  lostCount30d: 1
};

describe('DashboardPageHeader', () => {
  it('affiche le titre, la pastille de retard et la ligne de stats', () => {
    render(
      <DashboardPageHeader stats={baseStats} viewMode="myday" onViewModeChange={vi.fn()} />
    );

    expect(screen.getByRole('heading', { name: 'Pilotage' })).toBeInTheDocument();
    expect(screen.getByText(/2 relances en retard/i)).toBeInTheDocument();

    const stats = screen.getByTestId('dashboard-header-stats');
    expect(stats).toHaveTextContent('8');
    expect(stats).toHaveTextContent(/dossiers ouverts/i);
    expect(stats).toHaveTextContent('3');
  });

  it('signale les relances à jour quand il n y a aucun retard', () => {
    render(
      <DashboardPageHeader
        stats={{ ...baseStats, overdueCount: 0 }}
        viewMode="myday"
        onViewModeChange={vi.fn()}
      />
    );

    expect(screen.getByText(/relances à jour/i)).toBeInTheDocument();
  });

  it('bascule de vue au clic sur un onglet', async () => {
    const user = userEvent.setup();
    const onViewModeChange = vi.fn();

    render(
      <DashboardPageHeader stats={baseStats} viewMode="myday" onViewModeChange={onViewModeChange} />
    );

    const pipelineTab = screen.getByRole('tab', { name: /mode pipeline/i });
    expect(pipelineTab).toHaveAttribute('aria-selected', 'false');
    await user.click(pipelineTab);
    expect(onViewModeChange).toHaveBeenCalledWith('pipeline');

    // Compteur du pipeline affiché sur son onglet.
    expect(pipelineTab).toHaveTextContent('4');

    // L'onglet Ma journée additionne retards + à faire aujourd'hui.
    expect(screen.getByRole('tab', { name: /mode ma journée/i })).toHaveTextContent('3');
  });
});
