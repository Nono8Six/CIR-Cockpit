import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResolvedConfigSnapshot } from 'shared/schemas/config.schema';

import { renderWithProviders } from '@/__tests__/test-utils';
import EntityOnboardingDialog from '@/components/EntityOnboardingDialog';

const useDirectoryCompanySearchMock = vi.fn();
const useDirectoryCompanyDetailsMock = vi.fn();
const useDirectoryDuplicatesMock = vi.fn();
const useConfigSnapshotMock = vi.fn();

const BASE_CONFIG_SNAPSHOT: ResolvedConfigSnapshot = {
  product: {
    feature_flags: {
      ui_shell_v2: false
    },
    onboarding: {
      allow_manual_entry: true,
      default_account_type_company: 'term',
      default_account_type_individual: 'cash'
    }
  },
  agency: {
    onboarding: {}
  },
  references: {
    statuses: [],
    services: [],
    entities: [],
    families: [],
    interaction_types: [],
    departments: [
      {
        code: '33',
        label: 'Gironde',
        sort_order: 33,
        is_active: true
      }
    ]
  }
};

vi.mock('@/hooks/useDirectoryCompanySearch', () => ({
  useDirectoryCompanySearch: (...args: unknown[]) => useDirectoryCompanySearchMock(...args)
}));

vi.mock('@/hooks/useDirectoryCompanyDetails', () => ({
  useDirectoryCompanyDetails: (...args: unknown[]) => useDirectoryCompanyDetailsMock(...args)
}));

vi.mock('@/hooks/useDirectoryDuplicates', () => ({
  useDirectoryDuplicates: (...args: unknown[]) => useDirectoryDuplicatesMock(...args)
}));

vi.mock('@/hooks/useConfigSnapshot', () => ({
  useConfigSnapshot: (...args: unknown[]) => useConfigSnapshotMock(...args)
}));

const makeCompanyDetails = (overrides: Record<string, unknown> = {}) => ({
  siren: '451013759',
  official_name: 'SARL SEA',
  name: 'SARL SEA (SEA) (SEA)',
  sigle: 'SEA',
  nature_juridique: 'Société à responsabilité limitée',
  categorie_entreprise: 'PME',
  date_creation: '2004-01-02',
  etat_administratif: 'A',
  activite_principale: 'Ingénierie',
  activite_principale_naf25: '71.12B',
  section_activite_principale: 'M',
  company_establishments_count: 2,
  company_open_establishments_count: 1,
  employee_range: '10 à 19 salariés',
  employee_range_year: 2024,
  is_employer: true,
  diffusion_status: 'O',
  directors: [{
    full_name: 'Jean Martin',
    role: 'Gérant',
    nationality: 'Française',
    birth_year: 1978
  }],
  financials: {
    latest_year: 2024,
    revenue: 1250000,
    net_income: 96000
  },
  signals: {
    association: false,
    ess: true,
    qualiopi: false,
    rge: true,
    bio: false,
    organisme_formation: false,
    service_public: false,
    societe_mission: false
  },
  ...overrides
});

const TEST_AGENCY_ID = '00000000-0000-4000-8000-000000000001';

const TEST_AGENCIES = [{
  id: TEST_AGENCY_ID,
  name: 'CIR Bordeaux',
  archived_at: null,
  created_at: '2026-03-09T00:00:00.000Z',
  updated_at: '2026-03-09T00:00:00.000Z'
}];

const renderOnboardingDialog = (
  overrides: Partial<Parameters<typeof EntityOnboardingDialog>[0]> = {}
) =>
  renderWithProviders(
    <EntityOnboardingDialog
      open
      onOpenChange={vi.fn()}
      agencies={TEST_AGENCIES}
      userRole="super_admin"
      activeAgencyId={TEST_AGENCY_ID}
      commercials={[]}
      {...overrides}
    />
  );

const reachManualReviewStep = async (
  user: ReturnType<typeof userEvent.setup>,
  values: {
    name: string;
    city: string;
    address?: string;
    postalCode?: string;
    clientNumber?: string;
  }
) => {
  await user.click(await screen.findByRole('button', { name: /saisie manuelle/i }));
  await user.click(screen.getByRole('button', { name: /^continuer$/i }));

  const companyNameInput = await screen.findByLabelText(/nom de la societe/i);
  const cityInput = await screen.findByLabelText(/^ville$/i);

  await user.clear(companyNameInput);
  await user.type(companyNameInput, values.name);
  await user.clear(cityInput);
  await user.type(cityInput, values.city);

  if (values.address) {
    const addressInput = await screen.findByLabelText(/^adresse$/i);
    await user.clear(addressInput);
    await user.type(addressInput, values.address);
  }

  if (values.postalCode) {
    const postalCodeInput = await screen.findByLabelText(/^code postal$/i);
    await user.clear(postalCodeInput);
    await user.type(postalCodeInput, values.postalCode);
  }

  if (values.clientNumber) {
    const clientNumberInput = await screen.findByLabelText(/^numero de compte$/i);
    await user.clear(clientNumberInput);
    await user.type(clientNumberInput, values.clientNumber);
  }

  await user.click(screen.getByRole('button', { name: /^continuer$/i }));
  expect(await screen.findByText(/confirmation finale/i)).toBeInTheDocument();
};

describe('EntityOnboardingDialog', () => {
  beforeEach(() => {
    useDirectoryCompanySearchMock.mockReset();
    useDirectoryCompanyDetailsMock.mockReset();
    useDirectoryDuplicatesMock.mockReset();
    useConfigSnapshotMock.mockReset();
    useDirectoryCompanySearchMock.mockReturnValue({
      isFetching: false,
      data: { companies: [] }
    });
    useDirectoryCompanyDetailsMock.mockReturnValue({
      isLoading: false,
      data: undefined
    });
    useDirectoryDuplicatesMock.mockReturnValue({
      isFetching: false,
      data: { matches: [] }
    });
    useConfigSnapshotMock.mockReturnValue({
      data: BASE_CONFIG_SNAPSHOT,
      isLoading: false,
      error: null
    });
  });

  it('renders an open client onboarding dialog without entering an update loop', async () => {
    renderWithProviders(
      <EntityOnboardingDialog
        open
        onOpenChange={vi.fn()}
        agencies={[{
          id: 'agency-1',
          name: 'CIR Bordeaux',
          archived_at: null,
          created_at: '2026-03-09T00:00:00.000Z',
          updated_at: '2026-03-09T00:00:00.000Z'
        }]}
        userRole="super_admin"
        activeAgencyId="agency-1"
        commercials={[]}
        allowedIntents={['client']}
        onSaveClient={vi.fn(async () => undefined)}
        onSaveProspect={vi.fn(async () => undefined)}
      />
    );

    expect(await screen.findByRole('dialog', { name: /nouvelle fiche entreprise/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /département/i })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /filtre statut etablissement/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^continuer$/i })).toBeDisabled();
  });

  it('announces the current step and only exposes completed steps as navigation actions', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <EntityOnboardingDialog
        open
        onOpenChange={vi.fn()}
        agencies={[{
          id: 'agency-1',
          name: 'CIR Bordeaux',
          archived_at: null,
          created_at: '2026-03-09T00:00:00.000Z',
          updated_at: '2026-03-09T00:00:00.000Z'
        }]}
        userRole="super_admin"
        activeAgencyId="agency-1"
        commercials={[]}
        onSaveClient={vi.fn(async () => undefined)}
        onSaveProspect={vi.fn(async () => undefined)}
      />
    );

    const navigation = screen.getByRole('navigation', { name: /progression du parcours/i });
    expect(within(navigation).getByText('Type').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(within(navigation).queryAllByRole('button')).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: /^continuer$/i }));

    expect(within(navigation).getByText('Recherche').closest('li')).toHaveAttribute('aria-current', 'step');
    const previousStepButton = within(navigation).getByRole('button', { name: /revenir à l'étape type/i });
    expect(previousStepButton).toBeEnabled();
    expect(within(navigation).queryByRole('button', { name: /revenir à l'étape recherche/i })).not.toBeInTheDocument();

    await user.click(previousStepButton);

    expect(within(navigation).getByText('Type').closest('li')).toHaveAttribute('aria-current', 'step');
  });

  it('requires selecting an establishment when a company has multiple sites', async () => {
    const user = userEvent.setup();
    useDirectoryCompanySearchMock.mockReturnValue({
      isFetching: false,
      data: {
        companies: [
          {
            name: 'SARL SEA (SEA) (SEA)',
            official_name: 'SARL SEA',
            city: 'Gradignan',
            postal_code: '33170',
            department: '33',
            address: '6 RUE DU SOLARIUM',
            siret: '45101375900027',
            siren: '451013759',
            naf_code: '71.12B',
            match_quality: 'exact',
            match_explanation: 'Correspondance exacte',
            official_data_source: 'api-recherche-entreprises',
            official_data_synced_at: '2026-03-10T00:00:00.000Z',
            is_head_office: true,
            is_former_head_office: false,
            establishment_status: 'open',
            establishment_closed_at: null,
            commercial_name: null,
            company_establishments_count: 2,
            company_open_establishments_count: 1
          },
          {
            name: 'SARL SEA (SEA) (SEA)',
            official_name: 'SARL SEA',
            city: 'Bruges',
            postal_code: '33520',
            department: '33',
            address: '1 RUE SERGE DEJEAN',
            siret: '45101375900019',
            siren: '451013759',
            naf_code: '71.12B',
            match_quality: 'exact',
            match_explanation: 'Correspondance exacte',
            official_data_source: 'api-recherche-entreprises',
            official_data_synced_at: '2026-03-10T00:00:00.000Z',
            is_head_office: false,
            is_former_head_office: true,
            establishment_status: 'closed',
            establishment_closed_at: '2010-06-05',
            commercial_name: null,
            company_establishments_count: 2,
            company_open_establishments_count: 1
          }
        ]
      }
    });

    renderWithProviders(
      <EntityOnboardingDialog
        open
        onOpenChange={vi.fn()}
        agencies={[{
          id: 'agency-1',
          name: 'CIR Bordeaux',
          archived_at: null,
          created_at: '2026-03-09T00:00:00.000Z',
          updated_at: '2026-03-09T00:00:00.000Z'
        }]}
        userRole="super_admin"
        activeAgencyId="agency-1"
        commercials={[]}
        allowedIntents={['client']}
        onSaveClient={vi.fn(async () => undefined)}
        onSaveProspect={vi.fn(async () => undefined)}
      />
    );

    const continueButton = await screen.findByRole('button', { name: /^continuer$/i });
    expect(continueButton).toBeDisabled();

    const companyButton = screen.getByRole('button', { name: /sarl sea/i });
    await user.click(companyButton);

    expect(within(companyButton).getByText(/1 actif/i)).toBeInTheDocument();
    expect(within(companyButton).getByText(/1 ferme/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /33170 gradignan/i })).toBeInTheDocument();
    const closedSiteButton = screen.getByRole('button', { name: /33520 bruges/i });
    expect(closedSiteButton).toBeInTheDocument();
    expect(within(closedSiteButton).getByText(/^site ferme$/i)).toBeInTheDocument();
    expect(screen.getByText(/ferme officiellement le/i)).toBeInTheDocument();
    expect(screen.getByText(/ancien siège/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /33170 gradignan/i }));
    expect(continueButton).toBeEnabled();
  });

  it('surfaces official site counts and highlights closed establishments when more sites exist', async () => {
    const user = userEvent.setup();
    useDirectoryCompanySearchMock.mockReturnValue({
      isFetching: false,
      data: {
        companies: [
          {
            name: 'CONSEIL INVESTISSEMENTS ROST (EDITIONS RAYONNANTES) (CIR)',
            official_name: 'CONSEIL INVESTISSEMENTS ROST',
            city: 'Bruges',
            postal_code: '33520',
            department: '33',
            address: '21 RUE PASCAL TRIAT',
            siret: '50399214100039',
            siren: '503992141',
            naf_code: '70.10Z',
            match_quality: 'close',
            match_explanation: 'Correspondance approchante',
            official_data_source: 'api-recherche-entreprises',
            official_data_synced_at: '2026-03-10T00:00:00.000Z',
            is_head_office: true,
            is_former_head_office: false,
            establishment_status: 'open',
            establishment_closed_at: null,
            commercial_name: 'EDITIONS RAYONNANTES',
            company_establishments_count: 4,
            company_open_establishments_count: 1
          },
          {
            name: 'CONSEIL INVESTISSEMENTS ROST (EDITIONS RAYONNANTES) (CIR)',
            official_name: 'CONSEIL INVESTISSEMENTS ROST',
            city: 'Le Bouscat',
            postal_code: '33110',
            department: '33',
            address: '12 AVENUE DE LA LIBERATION',
            siret: '50399214100013',
            siren: '503992141',
            naf_code: '64.20Z',
            match_quality: 'close',
            match_explanation: 'Correspondance approchante',
            official_data_source: 'api-recherche-entreprises',
            official_data_synced_at: '2026-03-10T00:00:00.000Z',
            is_head_office: false,
            is_former_head_office: true,
            establishment_status: 'closed',
            establishment_closed_at: '2010-06-05',
            commercial_name: null,
            company_establishments_count: 4,
            company_open_establishments_count: 1
          },
          {
            name: 'CONSEIL INVESTISSEMENTS ROST (EDITIONS RAYONNANTES) (CIR)',
            official_name: 'CONSEIL INVESTISSEMENTS ROST',
            city: 'Bordeaux',
            postal_code: '33000',
            department: '33',
            address: '8 COURS DE VERDUN',
            siret: '50399214100021',
            siren: '503992141',
            naf_code: '64.20Z',
            match_quality: 'close',
            match_explanation: 'Correspondance approchante',
            official_data_source: 'api-recherche-entreprises',
            official_data_synced_at: '2026-03-10T00:00:00.000Z',
            is_head_office: false,
            is_former_head_office: false,
            establishment_status: 'closed',
            establishment_closed_at: '2014-02-17',
            commercial_name: null,
            company_establishments_count: 4,
            company_open_establishments_count: 1
          }
        ]
      }
    });

    renderWithProviders(
      <EntityOnboardingDialog
        open
        onOpenChange={vi.fn()}
        agencies={[{
          id: 'agency-1',
          name: 'CIR Bordeaux',
          archived_at: null,
          created_at: '2026-03-09T00:00:00.000Z',
          updated_at: '2026-03-09T00:00:00.000Z'
        }]}
        userRole="super_admin"
        activeAgencyId="agency-1"
        commercials={[]}
        allowedIntents={['client']}
        onSaveClient={vi.fn(async () => undefined)}
        onSaveProspect={vi.fn(async () => undefined)}
      />
    );

    const continueButton = await screen.findByRole('button', { name: /^continuer$/i });
    const companyButton = screen.getByRole('button', { name: /conseil investissements rost/i });
    expect(within(companyButton).getByText(/4 sites/i)).toBeInTheDocument();
    expect(within(companyButton).getByText(/3 fermes/i)).toBeInTheDocument();
    expect(within(companyButton).getByText(/1 autre site officiel hors de la liste actuelle/i)).toBeInTheDocument();

    await user.click(companyButton);

    expect(
      screen.getByText(/3 établissements affichés sur 4 sites officiels/i)
    ).toBeInTheDocument();
    expect(screen.getAllByText(/^site ferme$/i)).toHaveLength(2);
    expect(screen.getByText(/ferme officiellement le 05\/06\/2010/i)).toBeInTheDocument();
    expect(screen.getByText(/ferme officiellement le 17\/02\/2014/i)).toBeInTheDocument();

    const closedSiteButton = screen.getByRole('button', { name: /33110 le bouscat/i });
    expect(within(closedSiteButton).getByText(/^site ferme$/i)).toBeInTheDocument();

    await user.click(closedSiteButton);
    expect(continueButton).toBeEnabled();
    expect(within(closedSiteButton).getByText(/^site ferme$/i)).toBeInTheDocument();
  });

  it('filters visible establishments by status and clears a hidden selection', async () => {
    const user = userEvent.setup();
    useDirectoryCompanySearchMock.mockReturnValue({
      isFetching: false,
      data: {
        companies: [
          {
            name: 'SARL SEA (SEA) (SEA)',
            official_name: 'SARL SEA',
            city: 'Gradignan',
            postal_code: '33170',
            department: '33',
            address: '6 RUE DU SOLARIUM',
            siret: '45101375900027',
            siren: '451013759',
            naf_code: '71.12B',
            match_quality: 'exact',
            match_explanation: 'Correspondance exacte',
            official_data_source: 'api-recherche-entreprises',
            official_data_synced_at: '2026-03-10T00:00:00.000Z',
            is_head_office: true,
            is_former_head_office: false,
            establishment_status: 'open',
            establishment_closed_at: null,
            commercial_name: null,
            company_establishments_count: 2,
            company_open_establishments_count: 1
          },
          {
            name: 'SARL SEA (SEA) (SEA)',
            official_name: 'SARL SEA',
            city: 'Bruges',
            postal_code: '33520',
            department: '33',
            address: '1 RUE SERGE DEJEAN',
            siret: '45101375900019',
            siren: '451013759',
            naf_code: '71.12B',
            match_quality: 'exact',
            match_explanation: 'Correspondance exacte',
            official_data_source: 'api-recherche-entreprises',
            official_data_synced_at: '2026-03-10T00:00:00.000Z',
            is_head_office: false,
            is_former_head_office: true,
            establishment_status: 'closed',
            establishment_closed_at: '2010-06-05',
            commercial_name: null,
            company_establishments_count: 2,
            company_open_establishments_count: 1
          }
        ]
      }
    });

    renderWithProviders(
      <EntityOnboardingDialog
        open
        onOpenChange={vi.fn()}
        agencies={[{
          id: 'agency-1',
          name: 'CIR Bordeaux',
          archived_at: null,
          created_at: '2026-03-09T00:00:00.000Z',
          updated_at: '2026-03-09T00:00:00.000Z'
        }]}
        userRole="super_admin"
        activeAgencyId="agency-1"
        commercials={[]}
        allowedIntents={['client']}
        onSaveClient={vi.fn(async () => undefined)}
        onSaveProspect={vi.fn(async () => undefined)}
      />
    );

    const continueButton = await screen.findByRole('button', { name: /^continuer$/i });

    await user.click(screen.getByRole('button', { name: /sarl sea/i }));
    await user.click(screen.getByRole('button', { name: /33520 bruges/i }));

    expect(continueButton).toBeEnabled();

    await user.click(
      screen.getByRole('radio', { name: /etablissements actifs/i })
    );

    expect(continueButton).toBeDisabled();
    expect(
      screen.getByText(/1 établissement actif affiché sur 2 sites officiels/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /33520 bruges/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /33170 gradignan/i })).toBeInTheDocument();
  });

  it('shows enriched company intelligence before an establishment is chosen', async () => {
    const user = userEvent.setup();
    useDirectoryCompanySearchMock.mockReturnValue({
      isFetching: false,
      data: {
        companies: [
          {
            name: 'SARL SEA (SEA) (SEA)',
            official_name: 'SARL SEA',
            city: 'Gradignan',
            postal_code: '33170',
            department: '33',
            region: 'Nouvelle-Aquitaine',
            date_creation: '2004-01-02',
            date_debut_activite: '2004-01-02',
            employee_range: '10 à 19 salariés',
            employee_range_year: 2024,
            is_employer: true,
            establishment_diffusion_status: 'O',
            brands: ['SEA CONSEIL'],
            address: '6 RUE DU SOLARIUM',
            siret: '45101375900027',
            siren: '451013759',
            naf_code: '71.12B',
            match_quality: 'exact',
            match_explanation: 'Correspondance exacte',
            official_data_source: 'api-recherche-entreprises',
            official_data_synced_at: '2026-03-10T00:00:00.000Z',
            is_head_office: true,
            is_former_head_office: false,
            establishment_status: 'open',
            establishment_closed_at: null,
            commercial_name: null,
            company_establishments_count: 2,
            company_open_establishments_count: 1
          },
          {
            name: 'SARL SEA (SEA) (SEA)',
            official_name: 'SARL SEA',
            city: 'Bruges',
            postal_code: '33520',
            department: '33',
            region: 'Nouvelle-Aquitaine',
            date_creation: '2004-01-02',
            date_debut_activite: '2007-03-15',
            employee_range: '10 à 19 salariés',
            employee_range_year: 2024,
            is_employer: true,
            establishment_diffusion_status: 'O',
            brands: [],
            address: '1 RUE SERGE DEJEAN',
            siret: '45101375900019',
            siren: '451013759',
            naf_code: '71.12B',
            match_quality: 'exact',
            match_explanation: 'Correspondance exacte',
            official_data_source: 'api-recherche-entreprises',
            official_data_synced_at: '2026-03-10T00:00:00.000Z',
            is_head_office: false,
            is_former_head_office: true,
            establishment_status: 'closed',
            establishment_closed_at: '2010-06-05',
            commercial_name: null,
            company_establishments_count: 2,
            company_open_establishments_count: 1
          }
        ]
      }
    });
    useDirectoryCompanyDetailsMock.mockReturnValue({
      isLoading: false,
      data: {
        company: makeCompanyDetails()
      }
    });

    renderWithProviders(
      <EntityOnboardingDialog
        open
        onOpenChange={vi.fn()}
        agencies={[{
          id: 'agency-1',
          name: 'CIR Bordeaux',
          archived_at: null,
          created_at: '2026-03-09T00:00:00.000Z',
          updated_at: '2026-03-09T00:00:00.000Z'
        }]}
        userRole="super_admin"
        activeAgencyId="agency-1"
        commercials={[]}
        allowedIntents={['client']}
        onSaveClient={vi.fn(async () => undefined)}
        onSaveProspect={vi.fn(async () => undefined)}
      />
    );

    await user.click(await screen.findByRole('button', { name: /sarl sea/i }));

    expect(screen.getAllByText('SARL SEA').length).toBeGreaterThan(0);
    expect(screen.getByText(/société à responsabilité limitée/i)).toBeInTheDocument();
    expect(screen.getByText(/10 à 19 salariés/i)).toBeInTheDocument();
    expect(screen.getByText('ESS')).toBeInTheDocument();
    expect(screen.getByText('RGE')).toBeInTheDocument();
    expect(screen.getByText(/sélectionne un établissement pour voir les infos du site/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /dirigeants/i }));
    expect(screen.getByText('Jean Martin')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /finances/i }));
    expect(screen.getByText(/1.?250.?000/)).toBeInTheDocument();
  });

  it('keeps company selection usable when enriched details fail', async () => {
    const user = userEvent.setup();
    useDirectoryCompanySearchMock.mockReturnValue({
      isFetching: false,
      data: {
        companies: [{
          name: 'LE PETIT BASQUE',
          official_name: 'LE PETIT BASQUE',
          city: "SAINT-MEDARD-D'EYRANS",
          postal_code: '33650',
          department: '33',
          address: "PARC D'ACTIVITE LA PRADE",
          siret: '39968565000018',
          siren: '399685650',
          naf_code: '10.51A',
          match_quality: 'close',
          match_explanation: 'Correspondance approchante',
          official_data_source: 'api-recherche-entreprises',
          official_data_synced_at: '2026-05-05T17:47:18.606Z',
          is_head_office: true,
          is_former_head_office: false,
          establishment_status: 'open',
          establishment_closed_at: null,
          commercial_name: null,
          company_establishments_count: 3,
          company_open_establishments_count: 2
        }]
      }
    });
    useDirectoryCompanyDetailsMock.mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined
    });

    renderWithProviders(
      <EntityOnboardingDialog
        open
        onOpenChange={vi.fn()}
        agencies={[{
          id: 'agency-1',
          name: 'CIR Bordeaux',
          archived_at: null,
          created_at: '2026-03-09T00:00:00.000Z',
          updated_at: '2026-03-09T00:00:00.000Z'
        }]}
        userRole="super_admin"
        activeAgencyId="agency-1"
        commercials={[]}
        allowedIntents={['client']}
        onSaveClient={vi.fn(async () => undefined)}
        onSaveProspect={vi.fn(async () => undefined)}
      />
    );

    const continueButton = await screen.findByRole('button', { name: /^continuer$/i });

    await user.click(screen.getByRole('button', { name: /le petit basque/i }));

    expect(screen.getByText(/données enrichies indisponibles/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /33650 saint-medard/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /33650 saint-medard/i }));
    expect(continueButton).toBeEnabled();
  });

  it('surfaces a controlled error when client save callback is missing', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    renderOnboardingDialog({
      onOpenChange,
      allowedIntents: ['client'],
      onSaveProspect: vi.fn(async () => undefined)
    });

    await reachManualReviewStep(user, {
      name: 'Client Sans Callback',
      city: 'Bordeaux',
      address: '1 rue des Tests',
      postalCode: '33000',
      clientNumber: '1001'
    });
    await user.click(screen.getByRole('button', { name: /creer le client/i }));

    expect(
      (await screen.findAllByText(/action d'enregistrement client indisponible/i)).length
    ).toBeGreaterThan(0);
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('surfaces a controlled error when prospect save callback is missing', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    renderOnboardingDialog({
      onOpenChange,
      allowedIntents: ['prospect'],
      defaultIntent: 'prospect',
      onSaveClient: vi.fn(async () => undefined)
    });

    await reachManualReviewStep(user, {
      name: 'Prospect Sans Callback',
      city: 'Bordeaux'
    });
    await user.click(screen.getByRole('button', { name: /creer le prospect/i }));

    expect(
      (await screen.findAllByText(/action d'enregistrement prospect indisponible/i)).length
    ).toBeGreaterThan(0);
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('blocks prospect conversion when the client save callback is missing', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    renderOnboardingDialog({
      onOpenChange,
      mode: 'convert',
      allowedIntents: ['client'],
      initialEntity: {
        id: 'prospect-1',
        entity_type: 'Prospect',
        name: 'Prospect A Convertir',
        address: '2 rue des Tests',
        postal_code: '33000',
        department: '33',
        city: 'Bordeaux',
        agency_id: TEST_AGENCY_ID
      }
    });

    await user.click(screen.getByRole('button', { name: /^continuer$/i }));
    await reachManualReviewStep(user, {
      name: 'Prospect A Convertir',
      city: 'Bordeaux',
      address: '2 rue des Tests',
      postalCode: '33000',
      clientNumber: '1002'
    });
    await user.click(screen.getByRole('button', { name: /convertir en client/i }));

    expect(
      (await screen.findAllByText(/action d'enregistrement client indisponible/i)).length
    ).toBeGreaterThan(0);
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('supports arrow-key navigation for both onboarding radio groups', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <EntityOnboardingDialog
        open
        onOpenChange={vi.fn()}
        agencies={[{
          id: 'agency-1',
          name: 'CIR Bordeaux',
          archived_at: null,
          created_at: '2026-03-09T00:00:00.000Z',
          updated_at: '2026-03-09T00:00:00.000Z'
        }]}
        userRole="super_admin"
        activeAgencyId="agency-1"
        commercials={[]}
        onSaveClient={vi.fn(async () => undefined)}
        onSaveProspect={vi.fn(async () => undefined)}
      />
    );

    const clientIntentRadio = screen.getByRole('radio', { name: /selectionner client/i });
    clientIntentRadio.focus();
    await user.keyboard('{ArrowLeft}');

    expect(screen.getByRole('radio', { name: /selectionner prospect/i })).toHaveAttribute('aria-checked', 'true');

    await user.keyboard('{ArrowRight}');
    expect(clientIntentRadio).toHaveAttribute('aria-checked', 'true');

    const companyKindRadio = screen.getByRole('radio', { name: /selectionner societe/i });
    companyKindRadio.focus();
    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('radio', { name: /selectionner particulier/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('confirms before closing when the form is dirty', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    renderWithProviders(
      <EntityOnboardingDialog
        open
        onOpenChange={onOpenChange}
        agencies={[{
          id: 'agency-1',
          name: 'CIR Bordeaux',
          archived_at: null,
          created_at: '2026-03-09T00:00:00.000Z',
          updated_at: '2026-03-09T00:00:00.000Z'
        }]}
        userRole="super_admin"
        activeAgencyId="agency-1"
        commercials={[]}
        onSaveClient={vi.fn(async () => undefined)}
        onSaveProspect={vi.fn(async () => undefined)}
      />
    );

    await user.click(screen.getByRole('radio', { name: /selectionner prospect/i }));
    await user.click(screen.getByRole('button', { name: /^annuler$/i }));

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^quitter$/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('confirms before closing when local search draft is dirty', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    renderWithProviders(
      <EntityOnboardingDialog
        open
        onOpenChange={onOpenChange}
        agencies={[{
          id: 'agency-1',
          name: 'CIR Bordeaux',
          archived_at: null,
          created_at: '2026-03-09T00:00:00.000Z',
          updated_at: '2026-03-09T00:00:00.000Z'
        }]}
        userRole="super_admin"
        activeAgencyId="agency-1"
        commercials={[]}
        allowedIntents={['client']}
        onSaveClient={vi.fn(async () => undefined)}
        onSaveProspect={vi.fn(async () => undefined)}
      />
    );

    await user.click(screen.getByRole('button', { name: /^continuer$/i }));
    await user.type(screen.getByPlaceholderText(/nom de societe, siren ou siret/i), 'sea');
    await user.click(screen.getByRole('button', { name: /^annuler$/i }));

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
