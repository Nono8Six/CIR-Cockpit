import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/__tests__/test-utils';
import EntityOnboardingDialog from '@/components/EntityOnboardingDialog';

const useDirectoryCompanySearchMock = vi.fn();
const useDirectoryPageMock = vi.fn();

vi.mock('@/hooks/useDirectoryCompanySearch', () => ({
  useDirectoryCompanySearch: (...args: unknown[]) => useDirectoryCompanySearchMock(...args)
}));

vi.mock('@/hooks/useDirectoryPage', () => ({
  useDirectoryPage: (...args: unknown[]) => useDirectoryPageMock(...args)
}));

describe('EntityOnboardingDialog', () => {
  beforeEach(() => {
    useDirectoryCompanySearchMock.mockReset();
    useDirectoryPageMock.mockReset();
    useDirectoryCompanySearchMock.mockReturnValue({
      isFetching: false,
      data: { companies: [] }
    });
    useDirectoryPageMock.mockReturnValue({
      isFetching: false,
      data: { rows: [] }
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
    expect(screen.getByRole('textbox', { name: /filtre ville recherche officielle/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /departement/i })).toBeInTheDocument();
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
            is_head_office: true
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
            is_head_office: false
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

    await user.click(screen.getByRole('button', { name: /sarl sea/i }));

    expect(screen.getByRole('button', { name: /33170 gradignan/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /33520 bruges/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /33170 gradignan/i }));
    expect(continueButton).toBeEnabled();
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

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

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

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
