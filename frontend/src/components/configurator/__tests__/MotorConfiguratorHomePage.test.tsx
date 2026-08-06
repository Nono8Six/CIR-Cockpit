import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/test-utils';
import { TooltipProvider } from '@/components/ui/feedback/Tooltip';
import { listMotorCatalog } from '@/services/configurator/motorConfigurator';
import MotorConfiguratorHomePage from '../pages/MotorConfiguratorHomePage';
import MotorJourneyPage from '../pages/MotorJourneyPage';

type MockLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  to: string;
  children: ReactNode;
};

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: MockLinkProps) => (
    <a href={to} {...props}>
      {children}
    </a>
  )
}));

vi.mock('@/services/configurator/motorConfigurator', () => ({
  listMotorCatalog: vi.fn()
}));

const SNAPSHOT_RESPONSE = {
  request_id: '1e1f8b0c-2d3e-4f5a-8b9c-0d1e2f3a4b5c',
  snapshot: {
    id: '6fbf4046-be74-4422-9fe8-2d2d8a8d9157',
    label: 'Catalogue technique moteur 2026-07',
    activated_at: '2026-07-28T12:05:56.000Z'
  },
  items: [],
  next_cursor: null
};

const renderHome = () =>
  renderWithProviders(
    <TooltipProvider>
      <MotorConfiguratorHomePage />
    </TooltipProvider>
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('accueil du configurateur moteur', () => {
  it('annonce la lecture du catalogue avant de la resoudre', async () => {
    vi.mocked(listMotorCatalog).mockReturnValue(new Promise(() => undefined) as never);

    renderHome();

    expect(
      screen.getByRole('status', { name: 'Lecture du catalogue technique en cours' })
    ).toBeInTheDocument();
  });

  it('affiche le catalogue actif une fois la lecture aboutie', async () => {
    vi.mocked(listMotorCatalog).mockResolvedValue(SNAPSHOT_RESPONSE as never);

    renderHome();

    expect(
      await screen.findByText('Catalogue technique moteur 2026-07')
    ).toBeInTheDocument();
    expect(listMotorCatalog).toHaveBeenCalledWith({ limit: 1 });
  });

  it('propose une reprise explicite quand la lecture echoue', async () => {
    const user = userEvent.setup();
    vi.mocked(listMotorCatalog).mockRejectedValue({
      _tag: 'AppError',
      code: 'CONFIGURATOR_SNAPSHOT_UNAVAILABLE',
      message: 'Aucun catalogue technique actif.',
      source: 'edge'
    });

    renderHome();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Aucun catalogue technique actif.');

    vi.mocked(listMotorCatalog).mockResolvedValue(SNAPSHOT_RESPONSE as never);
    await user.click(screen.getByRole('button', { name: /Réessayer/ }));

    await waitFor(() => {
      expect(screen.getByText('Catalogue technique moteur 2026-07')).toBeInTheDocument();
    });
  });

  it('presente les quatre entrees, le remplacement en premier', async () => {
    vi.mocked(listMotorCatalog).mockResolvedValue(SNAPSHOT_RESPONSE as never);

    const { container } = renderHome();
    await screen.findByText('Catalogue technique moteur 2026-07');

    const journeyLinks = container.querySelectorAll('[data-journey]');
    expect(journeyLinks).toHaveLength(4);
    expect(journeyLinks[0]).toHaveAttribute('data-journey', 'remplacement');
    expect(journeyLinks[0]).toHaveAttribute('href', '/configurateurs/moteurs/remplacement');
  });

  it('enonce les quatre etats metier et n emploie jamais le mot garantie', async () => {
    vi.mocked(listMotorCatalog).mockResolvedValue(SNAPSHOT_RESPONSE as never);

    const { container } = renderHome();
    await screen.findByText('Catalogue technique moteur 2026-07');

    expect(screen.getByText('Ce que l’outil établit')).toBeInTheDocument();
    expect(container.textContent?.toLowerCase()).not.toContain('garantie');
    expect(container.textContent).toContain('compatibilité');
  });

  it('rend la page atteignable au clavier, en commencant par le fil d Ariane', async () => {
    const user = userEvent.setup();
    vi.mocked(listMotorCatalog).mockResolvedValue(SNAPSHOT_RESPONSE as never);

    renderHome();
    await screen.findByText('Catalogue technique moteur 2026-07');

    await user.tab();
    expect(document.activeElement).toHaveAttribute('href', '/configurateurs');

    await user.tab();
    expect(document.activeElement).toHaveAttribute(
      'href',
      '/configurateurs/mes-configurations'
    );
  });

  it('ne presente aucune violation d accessibilite detectable', async () => {
    vi.mocked(listMotorCatalog).mockResolvedValue(SNAPSHOT_RESPONSE as never);

    const { container } = renderHome();
    await screen.findByText('Catalogue technique moteur 2026-07');

    const results = await axe(container);
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});

describe('page de parcours moteur', () => {
  it('declare l etat de livraison du parcours au lieu d une coquille muette', () => {
    renderWithProviders(
      <TooltipProvider>
        <MotorJourneyPage journeyId="consultation" />
      </TooltipProvider>
    );

    expect(screen.getByText('Parcours non ouvert')).toBeInTheDocument();
    expect(screen.getByText('C10')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Retour aux entrées/ })
    ).toHaveAttribute('href', '/configurateurs/moteurs');
  });

  it('conserve le fil d Ariane complet sur chaque parcours', () => {
    renderWithProviders(
      <TooltipProvider>
        <MotorJourneyPage journeyId="pas-a-pas" />
      </TooltipProvider>
    );

    const breadcrumb = screen.getByRole('navigation', { name: 'Fil d’Ariane' });
    expect(breadcrumb).toHaveTextContent('Configurateurs');
    expect(breadcrumb).toHaveTextContent('Moteurs');
    expect(breadcrumb).toHaveTextContent('Pas à pas');
  });
});
