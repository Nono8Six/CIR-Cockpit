import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/test-utils';
import { TooltipProvider } from '@/components/ui/feedback/Tooltip';
import {
  findMotorEquivalentsFromMotor,
  findMotorEquivalentsFromSpec,
  listMotorCatalog
} from '@/services/configurator/motorConfigurator';
import MotorReplacementPage from '../pages/MotorReplacementPage';

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
  listMotorCatalog: vi.fn(),
  findMotorEquivalentsFromMotor: vi.fn(),
  findMotorEquivalentsFromSpec: vi.fn()
}));

const SNAPSHOT = {
  id: '6fbf4046-be74-4422-9fe8-2d2d8a8d9157',
  label: 'Catalogue technique moteur 2026-07',
  activated_at: '2026-07-28T12:05:56.000Z'
};

const CATALOG_RESPONSE = {
  request_id: '1e1f8b0c-2d3e-4f5a-8b9c-0d1e2f3a4b5c',
  snapshot: SNAPSHOT,
  items: [
    {
      candidate: {
        model_id: '11',
        model_key: 'leroy-somer.lshrm-160mr1',
        operating_point_id: '412',
        brand: 'Leroy-Somer',
        series: 'LSHRM',
        designation: 'LSHRM 160MR1',
        variant_key: '11 kW / IE4',
        power_kw: 11,
        rated_speed_rpm: 1465,
        frequency_hz: 50,
        poles: 4,
        supply_mode: 'mains',
        efficiency_class: 'IE4',
        lifecycle: 'current',
        data_grade: 'B'
      },
      model_evidence: [],
      operating_point_evidence: []
    }
  ],
  next_cursor: null
};

const buildCandidate = (
  overrides: { operatingPointId: string; designation: string; status: 'satisfied' | 'not_satisfied' }
) => ({
  candidate: {
    model_id: '21',
    model_key: 'innomotics.1le1',
    operating_point_id: overrides.operatingPointId,
    brand: 'Innomotics',
    series: '1LE1',
    designation: overrides.designation,
    variant_key: null,
    power_kw: 11,
    rated_speed_rpm: 1460,
    frequency_hz: 50,
    poles: 4,
    supply_mode: 'mains',
    efficiency_class: 'IE3',
    lifecycle: 'current',
    data_grade: 'B'
  },
  matched_flange: null,
  ruleset_id: 'motor.compatibility.cir',
  ruleset_version: 1,
  mechanical_status: overrides.status,
  electrical_status: 'satisfied',
  application_status: 'satisfied',
  overall_status: overrides.status,
  explanation:
    overrides.status === 'satisfied'
      ? 'Tous les critères mécaniques applicables sont compatibles.'
      : 'La hauteur d’axe du candidat dépasse celle du moteur en place.',
  criteria: [
    {
      code: 'FRAME_H',
      label: 'Hauteur d’axe',
      status: overrides.status,
      blocking: true,
      expected: 160,
      observed: overrides.status === 'satisfied' ? 160 : 180,
      unit: 'mm',
      explanation: 'Comparaison de la hauteur d’axe publiée.',
      evidence: [],
      affected_by_issue_codes: []
    },
    {
      code: 'SHAFT_D',
      label: 'Diamètre du bout d’arbre',
      status: 'satisfied',
      blocking: true,
      expected: 42,
      observed: 42,
      unit: 'mm',
      explanation: 'Le diamètre publié correspond au diamètre attendu.',
      evidence: [],
      affected_by_issue_codes: []
    }
  ],
  adaptations_required: [],
  checks_required: [],
  facts_used: [],
  rules_applied: [],
  issues: [],
  missing_facts: [],
  ranking: {
    overall_status: overrides.status,
    mechanical_status: overrides.status,
    reservation_count: 0,
    missing_fact_count: 0,
    requested_sort: 'compatibility',
    requested_sort_value: null,
    canonical_key: overrides.operatingPointId,
    evidence: []
  }
});

const EQUIVALENTS_RESPONSE = {
  request_id: '2e2f8b0c-2d3e-4f5a-8b9c-0d1e2f3a4b5c',
  snapshot: SNAPSHOT,
  normalized_spec: {},
  candidates: [
    buildCandidate({ operatingPointId: '901', designation: '1LE1 160L', status: 'not_satisfied' }),
    buildCandidate({ operatingPointId: '902', designation: '1LE1 160M', status: 'satisfied' })
  ],
  next_cursor: null
};

const renderPage = () =>
  renderWithProviders(
    <TooltipProvider>
      <MotorReplacementPage />
    </TooltipProvider>
  );

/** Saisie de plaque : le chemin par défaut, celui de l'appel client. */
const dictateNameplate = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText(/Puissance/), '11');
  await user.click(screen.getByRole('button', { name: /Le montage/ }));
  await user.click(screen.getByRole('button', { name: /B35/ }));
  await user.click(screen.getByRole('button', { name: /Rechercher les équivalents/ }));
};

/** Entrée secondaire : le moteur en place est déjà au catalogue CIR. */
const selectReferenceAndMounting = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /^Référence au catalogue/ }));
  await user.click(await screen.findByRole('button', { name: /LSHRM 160MR1/ }));
  await user.click(await screen.findByRole('button', { name: /^B35/ }));
  await user.click(screen.getByRole('button', { name: /Rechercher les équivalents/ }));
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listMotorCatalog).mockResolvedValue(CATALOG_RESPONSE as never);
  vi.mocked(findMotorEquivalentsFromMotor).mockResolvedValue(EQUIVALENTS_RESPONSE as never);
  vi.mocked(findMotorEquivalentsFromSpec).mockResolvedValue(EQUIVALENTS_RESPONSE as never);
});

describe('parcours Remplacement', () => {
  it('ouvre par defaut sur la saisie de plaque, pas sur le catalogue CIR', () => {
    renderPage();

    expect(screen.getByRole('button', { name: /^Plaque signalétique/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByText('Que lit le client sur la plaque ?')).toBeInTheDocument();
  });

  it('n affiche que les cotes reellement decisives pour le montage choisi', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Le montage/ }));
    await user.click(screen.getByRole('button', { name: /B5\b/ }));

    // B5 est une bride : les cotes de pattes n'existent pas et ne sont pas demandées.
    expect(screen.getByLabelText(/^M —/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^N —/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^A —/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^H —/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Le montage/ }));
    await user.click(screen.getByRole('button', { name: /B3\b/ }));

    // B3 repose sur des pattes : la bride disparaît à son tour.
    expect(screen.getByLabelText(/^A —/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^H —/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^M —/)).not.toBeInTheDocument();
  });

  it('montre la cote sur le schema quand le champ prend le focus', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Le montage/ }));
    await user.click(screen.getByRole('button', { name: /B3\b/ }));
    await user.click(screen.getByLabelText(/^H —/));

    // La légende du schéma nomme la cote et dit où poser le mètre.
    expect(
      screen.getByText(/Du dessous des pattes à l’axe de l’arbre/)
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Vue de côté/ })).toBeInTheDocument();
  });

  it('n interroge rien tant que le contrat de recherche n est pas satisfait', async () => {
    renderPage();

    expect(screen.getByRole('button', { name: /Rechercher les équivalents/ })).toBeDisabled();
    expect(findMotorEquivalentsFromSpec).not.toHaveBeenCalled();
  });

  it('attend une action explicite avant de lancer la recherche couteuse', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/Puissance/), '11');
    await user.click(screen.getByRole('button', { name: /Le montage/ }));
    await user.click(screen.getByRole('button', { name: /B35/ }));
    expect(findMotorEquivalentsFromSpec).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /Rechercher les équivalents/ }));

    await waitFor(() => {
      expect(findMotorEquivalentsFromSpec).toHaveBeenCalledOnce();
    });

    const [input] = vi.mocked(findMotorEquivalentsFromSpec).mock.calls[0]!;
    expect(input.mounting).toBe('B35');
    expect(input.electrical.power_kw.value).toBe(11);
    expect(input.electrical.power_kw.origin).toBe('nameplate');
    expect(input.electrical.power_kw.confirmation).toBe('unconfirmed');
    expect(input.electrical.frequency_hz.value).toBe(50);
    expect(input.electrical.supply_mode.value).toBe('vfd');
  });

  it('qualifie une cote comme mesure client et saisit le filetage des brides B14', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText(/Puissance/), '2,2');
    await user.click(screen.getByRole('button', { name: /Le montage/ }));
    await user.click(screen.getByRole('button', { name: /B14/ }));
    expect(screen.getByLabelText(/^S_thread —/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^S —/)).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/^S_thread —/), 'M8');
    await user.click(screen.getByRole('button', { name: /Rechercher les équivalents/ }));
    await waitFor(() => { expect(findMotorEquivalentsFromSpec).toHaveBeenCalledOnce(); });
    const [input] = vi.mocked(findMotorEquivalentsFromSpec).mock.calls[0]!;
    expect(input.mechanical.flange?.dimensions.S_thread).toMatchObject({
      value: 'M8', origin: 'user_measurement', confirmation: 'confirmed'
    });
  });

  it('ne fabrique aucune valeur pour un champ laisse vide', async () => {
    const user = userEvent.setup();
    renderPage();

    await dictateNameplate(user);
    await waitFor(() => {
      expect(findMotorEquivalentsFromSpec).toHaveBeenCalledOnce();
    });

    const [input] = vi.mocked(findMotorEquivalentsFromSpec).mock.calls[0]!;
    expect(input.electrical.voltage_v).toBeUndefined();
    expect(input.mechanical.frame.dimensions.A).toBeUndefined();
    expect(input.mechanical.shaft.dimensions.D).toBeUndefined();
  });

  it('garde l entree catalogue pour un moteur deja connu', async () => {
    const user = userEvent.setup();
    renderPage();

    await selectReferenceAndMounting(user);

    await waitFor(() => {
      expect(findMotorEquivalentsFromMotor).toHaveBeenCalledWith({
        operating_point_id: '412',
        mounting: 'B35',
        limit: 25,
        sort: 'compatibility'
      });
    });
  });

  it('affiche l attente reelle sans progression fictive', async () => {
    const user = userEvent.setup();
    vi.mocked(findMotorEquivalentsFromSpec).mockReturnValue(
      new Promise(() => undefined) as never
    );
    renderPage();

    await dictateNameplate(user);

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('00:00');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('classe les candidats du plus compatible au moins compatible', async () => {
    const user = userEvent.setup();
    renderPage();
    await dictateNameplate(user);

    await screen.findByRole('table', { name: /Candidats au remplacement/ });
    const rows = screen.getAllByRole('row').slice(1);

    expect(rows[0]).toHaveAttribute('data-verdict', 'satisfied');
    expect(rows[1]).toHaveAttribute('data-verdict', 'not_satisfied');
  });

  it('ouvre le verdict explicable dans un dialog centre, refermable par Escape', async () => {
    const user = userEvent.setup();
    renderPage();
    await dictateNameplate(user);

    await user.click((await screen.findAllByRole('button', { name: /1LE1 160L/ }))[0]!);

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText('La hauteur d’axe du candidat dépasse celle du moteur en place.')
    ).toBeInTheDocument();
    expect(within(dialog).getByText('Hauteur d’axe')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('annonce une absence de candidat sans laisser d impasse', async () => {
    const user = userEvent.setup();
    vi.mocked(findMotorEquivalentsFromSpec).mockResolvedValue({
      ...EQUIVALENTS_RESPONSE,
      candidates: []
    } as never);
    renderPage();

    await dictateNameplate(user);

    expect(await screen.findByText('Aucun candidat sur ce montage')).toBeInTheDocument();
  });

  it('propose une reprise quand la recherche echoue', async () => {
    const user = userEvent.setup();
    vi.mocked(findMotorEquivalentsFromSpec).mockRejectedValue({
      _tag: 'AppError',
      code: 'CONFIGURATOR_DB_TIMEOUT',
      message: 'La lecture du catalogue a dépassé le délai autorisé.',
      source: 'edge'
    });
    renderPage();

    await dictateNameplate(user);

    // La recherche d'équivalents se re-tente une fois avant d'échouer : l'écran
    // d'erreur n'apparaît qu'après cette seconde tentative.
    const alert = await screen.findByRole('alert', {}, { timeout: 8000 });
    expect(alert).toHaveTextContent('La lecture du catalogue a dépassé le délai autorisé.');
    expect(screen.getByRole('button', { name: /Réessayer/ })).toBeInTheDocument();
  });

  it('ne presente aucune violation d accessibilite detectable sur les resultats', async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    await dictateNameplate(user);
    await screen.findByRole('table', { name: /Candidats au remplacement/ });

    const results = await axe(container);
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
