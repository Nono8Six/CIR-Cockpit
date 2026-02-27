import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AppMainStateView from '@/components/app-main/AppMainStateView';
import type { AppMainViewState } from '@/components/app-main/AppMainContent.types';

const renderStateView = (mainViewState: AppMainViewState) => {
  const onReloadData = vi.fn();
  const renderResult = render(
    <AppMainStateView
      mainViewState={mainViewState}
      onReloadData={onReloadData}
    />
  );

  return { ...renderResult, onReloadData };
};

describe('AppMainStateView', () => {
  it('renders context loading state', () => {
    renderStateView({ kind: 'context-loading' });
    expect(screen.getByText(/chargement du contexte agence/i)).toBeInTheDocument();
  });

  it('renders data loading state', () => {
    renderStateView({ kind: 'data-loading' });
    expect(screen.getByText(/chargement des donnees/i)).toBeInTheDocument();
  });

  it('renders error state and calls reload action', async () => {
    const user = userEvent.setup();
    const { onReloadData } = renderStateView({ kind: 'data-error' });

    await user.click(screen.getByRole('button', { name: /recharger/i }));
    expect(onReloadData).toHaveBeenCalledTimes(1);
  });

  it('renders missing agency state with contextual message', () => {
    renderStateView({
      kind: 'missing-agency',
      contextError: "Vous n'etes rattache a aucune agence."
    });

    expect(screen.getByText(/aucune agence active/i)).toBeInTheDocument();
    expect(screen.getByText(/vous n'etes rattache a aucune agence/i)).toBeInTheDocument();
  });

  it('renders nothing when state is ready', () => {
    const { container } = renderStateView({ kind: 'ready' });
    expect(container).toBeEmptyDOMElement();
  });
});
