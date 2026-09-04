import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AiRightsBudgetsView } from '@/components/admin-ai/AiRightsBudgetsView';
import * as ai from '@/services/ai';

vi.mock('@/services/ai');

const userId = '11111111-1111-4111-8111-111111111111';
const bordeauxId = '22222222-2222-4222-8222-222222222222';
const lyonId = '33333333-3333-4333-8333-333333333333';
const grantId = '44444444-4444-4444-8444-444444444444';
const userGrantId = '55555555-5555-4555-8555-555555555555';
const quotaId = '66666666-6666-4666-8666-666666666666';
const wildcardQuotaId = '77777777-7777-4777-8777-777777777777';

const liveFeature = 'pricing.references.diagnose' as const;

const aliceBordeaux = {
  user_id: userId,
  display_name: 'Alice Martin',
  email: 'alice@cir.fr',
  role: 'tcs' as const,
  agency_id: bordeauxId,
  agency_name: 'CIR Bordeaux',
  allowed: true,
  origin: 'global' as const,
};

const aliceLyon = {
  ...aliceBordeaux,
  agency_id: lyonId,
  agency_name: 'CIR Lyon',
};

const globalGrant = {
  id: grantId,
  feature: liveFeature,
  scope: 'global' as const,
  target: null,
  allowed: true,
  created_by_name: null,
  updated_by_name: null,
  created_at: '2026-07-11T10:00:00Z',
  updated_at: '2026-07-11T10:00:00Z',
};

const userGrant = {
  ...globalGrant,
  id: userGrantId,
  scope: 'user' as const,
  target: { id: userId, label: 'Alice Martin', email: 'alice@cir.fr' },
  allowed: false,
};

const usageRow = {
  user_id: userId,
  display_name: 'Alice Martin',
  email: 'alice@cir.fr',
  feature: liveFeature,
  calls: 65,
  input_tokens: 1000,
  output_tokens: 200,
  total_tokens: 1200,
  cost_amount: 0.42,
  currency: 'USD',
};

const liveQuota = {
  id: quotaId,
  scope: 'global' as const,
  agency_id: null,
  user_id: null,
  feature: liveFeature,
  enabled: true,
  daily_call_limit: null,
  monthly_call_limit: 100,
  daily_token_limit: 2000,
  monthly_token_limit: 50000,
  daily_cost_limit: 5,
  monthly_cost_limit: 40,
  currency: 'USD',
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-08-16T00:00:00Z',
};

const wildcardQuota = {
  ...liveQuota,
  id: wildcardQuotaId,
  feature: null,
  monthly_call_limit: 200,
  daily_token_limit: null,
  monthly_token_limit: null,
  daily_cost_limit: null,
  monthly_cost_limit: null,
};

const mockSettings = {
  ok: true as const,
  providers: [],
  models: [],
  assignments: [],
  quotas: [liveQuota],
};

const mockSummary = {
  ok: true as const,
  summary: {
    calls: 66,
    successful_calls: 65,
    failed_calls: 1,
    cache_hits: 0,
    input_tokens: 1000,
    output_tokens: 200,
    cached_input_tokens: 50,
    reasoning_tokens: 10,
    cost_amount: 0.42,
    currency: 'USD',
    period_start: '2026-07-17T00:00:00Z',
    period_end: '2026-08-16T00:00:00Z',
    budget_alerts: [],
    quota_usages: [
      {
        quota_id: quotaId,
        scope: 'global' as const,
        feature: liveFeature,
        currency: 'USD',
        daily_calls: 3,
        monthly_calls: 12,
        daily_tokens: 400,
        monthly_tokens: 1800,
        daily_cost: 0.2,
        monthly_cost: 1.1,
      },
    ],
    daily: [],
  },
};

const renderView = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      })}
    >
      <AiRightsBudgetsView />
    </QueryClientProvider>,
  );

describe('AiRightsBudgetsView', () => {
  beforeEach(() => {
    vi.mocked(ai.getAiMembersAccessOverview).mockResolvedValue({
      ok: true,
      members: [aliceBordeaux],
    });
    vi.mocked(ai.listAiAccess).mockResolvedValue({ ok: true, grants: [globalGrant] });
    vi.mocked(ai.getAiUsageByMember).mockResolvedValue({
      ok: true,
      period_start: '2026-07-17T00:00:00Z',
      period_end: '2026-08-16T00:00:00Z',
      members: [usageRow],
    });
    vi.mocked(ai.getAiSettings).mockResolvedValue(mockSettings);
    vi.mocked(ai.getAiUsageSummary).mockResolvedValue(mockSummary);
    vi.mocked(ai.saveAiAccess).mockResolvedValue({ ok: true, grant: null });
    vi.mocked(ai.deleteAiAccess).mockResolvedValue({ ok: true, grant: null });
    vi.mocked(ai.createAiQuota).mockResolvedValue({ ok: true, quota: wildcardQuota });
    vi.mocked(ai.saveAiQuota).mockResolvedValue({ ok: true, quota: liveQuota });
    vi.mocked(ai.deleteAiQuota).mockResolvedValue({ ok: true, deleted_id: quotaId });
  });

  it('prend la capacité live par défaut et affiche le rôle libellé', async () => {
    renderView();

    expect(await screen.findByText('Alice Martin')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Capacité' })).toHaveTextContent('Veille des référentiels');
    expect(screen.queryByRole('combobox', { name: 'Capacité' })).not.toHaveTextContent('Chat référentiels');
    expect(screen.getByText(/TCS/)).toBeInTheDocument();
    expect(ai.getAiMembersAccessOverview).toHaveBeenCalledWith({ feature: liveFeature });
  });

  it('n’affiche la consommation d’un membre multi-agences qu’une seule fois', async () => {
    vi.mocked(ai.getAiMembersAccessOverview).mockResolvedValue({
      ok: true,
      members: [aliceBordeaux, aliceLyon],
    });

    renderView();

    expect(await screen.findByTestId(`ai-member-row-${userId}`)).toBeInTheDocument();
    expect(screen.getAllByText('CIR Bordeaux').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CIR Lyon').length).toBeGreaterThan(0);
    expect(screen.getAllByText('65 appels')).toHaveLength(1);
    expect(screen.getAllByTestId(`ai-member-row-${userId}`)).toHaveLength(1);
  });

  it('exige une confirmation avant de poser un override membre', async () => {
    const user = userEvent.setup();
    renderView();

    await screen.findByText('Alice Martin');
    await user.click(screen.getByRole('switch', { name: 'Accès de Alice Martin' }));

    expect(ai.saveAiAccess).not.toHaveBeenCalled();
    expect(await screen.findByText('Bloquer cet accès membre ?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirmer' }));

    await waitFor(() => {
      expect(ai.saveAiAccess).toHaveBeenCalledWith(
        { feature: liveFeature, scope: 'user', user_id: userId, allowed: false },
        expect.anything(),
      );
    });
  });

  it('revient à la règle héritée et affiche ensuite l’origine agence', async () => {
    const user = userEvent.setup();
    vi.mocked(ai.getAiMembersAccessOverview).mockResolvedValue({
      ok: true,
      members: [{ ...aliceBordeaux, origin: 'user', allowed: false }],
    });
    vi.mocked(ai.listAiAccess).mockResolvedValue({
      ok: true,
      grants: [globalGrant, userGrant],
    });
    vi.mocked(ai.deleteAiAccess).mockImplementation(async () => {
      vi.mocked(ai.getAiMembersAccessOverview).mockResolvedValue({
        ok: true,
        members: [{ ...aliceBordeaux, origin: 'agency', allowed: true }],
      });
      vi.mocked(ai.listAiAccess).mockResolvedValue({ ok: true, grants: [globalGrant] });
      return { ok: true, grant: null };
    });

    renderView();

    expect(await screen.findByRole('button', { name: 'Revenir à la règle héritée' })).toBeInTheDocument();
    expect(screen.getAllByText('Membre').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Revenir à la règle héritée' }));
    expect(await screen.findByText('Revenir à la règle héritée ?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmer' }));

    await waitFor(() => {
      expect(ai.deleteAiAccess).toHaveBeenCalledWith(
        { feature: liveFeature, scope: 'user', user_id: userId },
        expect.anything(),
      );
    });
    expect(await screen.findByText(/TCS · Agence/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revenir à la règle héritée' })).not.toBeInTheDocument();
  });

  it('crée une politique wildcard et expose les plafonds quotidiens du schéma', async () => {
    const user = userEvent.setup();
    renderView();

    await screen.findByText('Alice Martin');
    await user.click(screen.getByRole('button', { name: /Créer/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Tokens / jour civil')).toBeInTheDocument();
    expect(screen.getByLabelText('Coût / jour civil (USD)')).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: 'Capacité de la politique' }));
    await user.click(await screen.findByRole('option', { name: 'Toutes les capacités' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer le quota' }));

    await waitFor(() => {
      expect(ai.createAiQuota).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'global',
          feature: null,
          daily_token_limit: null,
          daily_cost_limit: null,
          currency: 'USD',
        }),
      );
    });
  });

  it('affiche une politique wildcard et joint les jauges sur quota_usages', async () => {
    vi.mocked(ai.getAiSettings).mockResolvedValue({
      ...mockSettings,
      quotas: [liveQuota, wildcardQuota],
    });

    renderView();

    expect(await screen.findByText('Toutes les capacités')).toBeInTheDocument();
    const gauges = await screen.findByTestId(`ai-quota-gauges-${quotaId}`);
    expect(within(gauges).getByText('12 / 100')).toBeInTheDocument();
    expect(within(gauges).getByText('400 / 2 000')).toBeInTheDocument();
    expect(within(gauges).getByText(/Appels · mois civil/)).toBeInTheDocument();
    expect(within(gauges).getByText(/Tokens · jour civil/)).toBeInTheDocument();
    expect(within(gauges).queryByText('65 appels')).not.toBeInTheDocument();
  });

  it('supprime une politique via AlertDialog plutôt que window.confirm', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm');
    renderView();

    await screen.findByLabelText('Supprimer la politique de quota Global');
    await user.click(screen.getByLabelText('Supprimer la politique de quota Global'));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(await screen.findByText('Supprimer cette politique de quota ?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Supprimer' }));

    await waitFor(() => {
      expect(ai.deleteAiQuota).toHaveBeenCalledWith({ id: quotaId }, expect.anything());
    });
    confirmSpy.mockRestore();
  });
});
