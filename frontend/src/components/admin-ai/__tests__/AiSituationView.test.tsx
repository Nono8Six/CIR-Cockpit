import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AiSituationView } from '@/components/admin-ai/AiSituationView';
import * as ai from '@/services/ai';

vi.mock('@/services/ai');

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const mockSettings = {
  ok: true as const,
  providers: [
    {
      id: 'p-mistral',
      provider: 'mistral' as const,
      label: 'Mistral AI',
      enabled: true,
      has_api_key: true,
      api_key_last4: '9988',
      base_url: null,
      organization_id: null,
      last_test_at: '2026-08-16T10:00:00Z',
      last_test_status: 'success' as const,
      last_error_code: null,
      last_error_message: null,
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-08-16T10:00:00Z',
    },
    {
      id: 'p-openrouter',
      provider: 'openrouter' as const,
      label: 'OpenRouter',
      enabled: false,
      has_api_key: false,
      api_key_last4: null,
      base_url: null,
      organization_id: null,
      last_test_at: null,
      last_test_status: null,
      last_error_code: null,
      last_error_message: null,
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
    },
  ],
  models: [
    {
      id: 'm-mistral-small',
      provider_config_id: 'p-mistral',
      provider: 'mistral' as const,
      model_id: 'mistral-small-latest',
      label: 'Mistral Small Live',
      enabled: true,
      is_default: true,
      currency: 'USD',
      input_price_per_million: 0.2,
      output_price_per_million: 0.6,
      cached_input_price_per_million: null,
      reasoning_price_per_million: null,
      price_effective_at: null,
      max_output_tokens: 2000,
      temperature: 0.2,
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-08-16T10:00:00Z',
    },
    {
      id: 'm-openrouter-fallback',
      provider_config_id: 'p-openrouter',
      provider: 'openrouter' as const,
      model_id: 'anthropic/claude-3-haiku',
      label: 'Claude Haiku Backup',
      enabled: true,
      is_default: true,
      currency: 'USD',
      input_price_per_million: 0.25,
      output_price_per_million: 1.25,
      cached_input_price_per_million: null,
      reasoning_price_per_million: null,
      price_effective_at: null,
      max_output_tokens: 4000,
      temperature: 0.3,
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
    },
  ],
  assignments: [
    {
      feature: 'pricing.references.diagnose' as const,
      model_config_id: 'm-mistral-small',
      created_by: null,
      updated_by: null,
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-16T10:00:00Z',
    },
  ],
  quotas: [
    {
      id: 'q-global',
      scope: 'global' as const,
      agency_id: null,
      user_id: null,
      feature: 'pricing.references.diagnose' as const,
      enabled: true,
      daily_call_limit: null,
      monthly_call_limit: 5000,
      daily_token_limit: null,
      monthly_token_limit: 10000000,
      daily_cost_limit: null,
      monthly_cost_limit: 100,
      currency: 'USD',
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
    },
  ],
};

const mockSummary = {
  ok: true as const,
  summary: {
    calls: 66,
    successful_calls: 65,
    failed_calls: 1,
    cache_hits: 12,
    input_tokens: 120000,
    output_tokens: 45000,
    cached_input_tokens: 30000,
    reasoning_tokens: 0,
    cost_amount: 0.5869,
    currency: 'USD',
    period_start: '2026-07-17T00:00:00Z',
    period_end: '2026-08-16T00:00:00Z',
    budget_alerts: [
      {
        quota_id: 'q-global',
        scope: 'global' as const,
        agency_id: null,
        user_id: null,
        feature: 'pricing.references.diagnose' as const,
        cost_amount: 85,
        cost_limit: 100,
        period: 'month' as const,
        ratio: 0.85,
        level: 'approaching' as const,
        currency: 'USD',
      },
    ],
    quota_usages: [],
    daily: [
      {
        date: '2026-08-16',
        calls: 5,
        errors: 0,
        cache_hits: 0,
        cost_amount: 0.05,
        input_tokens: 10000,
        output_tokens: 2000,
      },
    ],
  },
};

const mockPrompts = {
  ok: true as const,
  prompts: [
    {
      id: 'tpl-1',
      feature: 'pricing.references.diagnose' as const,
      label: 'Veille des référentiels',
      description: 'Synthèse sourcée',
      allowed_variables: [],
      archived_at: null,
      archived_by: null,
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-08-16T00:00:00Z',
      versions: [],
      draft_version: null,
      published_version: {
        id: 'ver-2',
        template_id: 'tpl-1',
        version: 2,
        status: 'published' as const,
        body: 'Système prompt watch v2',
        change_note: 'Initial release',
        created_by: null,
        published_by: null,
        published_at: '2026-08-01T00:00:00Z',
        created_at: '2026-08-01T00:00:00Z',
      },
      usage: {
        calls: 66,
        successful_calls: 65,
        failed_calls: 1,
        calls_last_30_days: 66,
        total_tokens: 195000,
        cost_amount: 0.5869,
        currency: 'USD' as const,
        last_used_at: '2026-08-16T11:11:00Z',
      },
    },
  ],
};

const mockEvents = {
  ok: true as const,
  total: 1,
  page: 1,
  page_size: 5,
  events: [
    {
      id: 'event-123',
      request_id: 'req-watch-live-001',
      feature: 'pricing.references.diagnose' as const,
      provider: 'mistral' as const,
      model_id: 'mistral-small-latest',
      model_config_id: 'm-mistral-small',
      prompt_version_id: 'ver-2',
      input_tokens: 20000,
      output_tokens: 4277,
      cached_input_tokens: 0,
      reasoning_tokens: 0,
      cost_amount: 0.0132,
      currency: 'USD',
      cache_hit: false,
      status: 'success' as const,
      error_code: null,
      error_message: null,
      latency_ms: 1250,
      created_at: '2026-08-16T11:11:00Z',
      user_id: 'usr-1',
      agency_id: 'agn-1',
      metadata: {
        vertical: 'reference_watch',
        run_id: 'run-888',
        finish_reason: 'stop',
        truncated: false,
        client_request_id: 'cli-req-999',
        fact_id: ['fact-1', 'fact-2'],
      },
    },
  ],
};

const renderSituation = (onNavigate = vi.fn()) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AiSituationView onNavigate={onNavigate} />
    </QueryClientProvider>
  );
};

describe('AiSituationView', () => {
  beforeEach(() => {
    vi.mocked(ai.getAiSettings).mockResolvedValue(mockSettings);
    vi.mocked(ai.getAiUsageSummary).mockResolvedValue(mockSummary);
    vi.mocked(ai.listAiPrompts).mockResolvedValue(mockPrompts);
    vi.mocked(ai.listAiUsageEvents).mockResolvedValue(mockEvents);
    vi.mocked(ai.getAiUsageEventById).mockResolvedValue({
      ok: true,
      event: {
        ...mockEvents.events[0],
        metadata: {
          vertical: 'reference_watch',
          run_id: 'run-live-001',
          finish_reason: 'stop',
          truncated: false,
          client_request_id: 'cli-req-001',
          fact_id: ['fact-1', 'fact-2'],
        },
      },
    });
  });

  it('nomme le fournisseur et le modèle réellement résolus pour le vertical live', async () => {
    renderSituation();

    expect(await screen.findByRole('heading', { name: 'Mistral AI' })).toBeInTheDocument();
    expect(screen.getByText('••••9988')).toBeInTheDocument();
    expect(screen.getByText('Mistral Small Live')).toBeInTheDocument();
    expect(screen.getByText(/Assigné directement/i)).toBeInTheDocument();
    expect(screen.getByText('Version 2')).toBeInTheDocument();
    expect(screen.getByText('Prêt pour un run')).toBeInTheDocument();
  });

  it('affiche les tokens décomposés et le coût de la synthèse 30 jours', async () => {
    renderSituation();

    expect(await screen.findByText('66')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // 1 échec
    expect(screen.getByText(/120\s?000 in · 45\s?000 out/i)).toBeInTheDocument();
    expect(screen.getByText(/30\s?000 cache · 0 rsn/i)).toBeInTheDocument();
  });

  it('affiche le bandeau de budget alert et navigue vers droits', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    renderSituation(onNavigate);

    expect(await screen.findByText(/Budget IA à surveiller/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voir les seuils' }));
    expect(onNavigate).toHaveBeenCalledWith('droits');
  });

  it('permet de tester la connexion du fournisseur sur place et ouvre un Dialog', async () => {
    const user = userEvent.setup();
    vi.mocked(ai.testAiProvider).mockResolvedValue({
      ok: true,
      provider: 'mistral',
      status: 'success',
      message: 'Test réussi (200 OK), clé valide.',
    });

    renderSituation();

    const testBtn = await screen.findByRole('button', { name: /Tester la connexion/i });
    await user.click(testBtn);

    expect(ai.testAiProvider).toHaveBeenCalledWith({ provider: 'mistral' });
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Test de connexion — Mistral AI/i)).toBeInTheDocument();
    expect(screen.getByText(/Test réussi \(200 OK\), clé valide\./i)).toBeInTheDocument();
  });

  it('résout le modèle de repli is_default direct lorsqu’aucune affectation n’existe', async () => {
    vi.mocked(ai.getAiSettings).mockResolvedValue({
      ...mockSettings,
      assignments: [],
    });
    renderSituation();

    expect(await screen.findByRole('heading', { name: 'Mistral AI' })).toBeInTheDocument();
    expect(screen.getByText('Mistral Small Live')).toBeInTheDocument();
    expect(screen.getByText('Modèle de repli direct')).toBeInTheDocument();
    expect(screen.getByText('Prêt pour un run')).toBeInTheDocument();
  });

  it('résout le premier modèle direct actif si aucun modèle is_default n’existe', async () => {
    vi.mocked(ai.getAiSettings).mockResolvedValue({
      ...mockSettings,
      assignments: [],
      models: [
        {
          ...mockSettings.models[0],
          is_default: false,
          label: 'Mistral Unique Direct',
        },
      ],
    });
    renderSituation();

    expect(await screen.findByRole('heading', { name: 'Mistral AI' })).toBeInTheDocument();
    expect(screen.getByText('Mistral Unique Direct')).toBeInTheDocument();
    expect(screen.getByText('Modèle de repli direct')).toBeInTheDocument();
    expect(screen.getByText('Prêt pour un run')).toBeInTheDocument();
  });

  it('affiche Incomplète et Fournisseur Non résolu si aucun modèle direct n’est actif', async () => {
    vi.mocked(ai.getAiSettings).mockResolvedValue({
      ...mockSettings,
      assignments: [],
      models: [
        {
          ...mockSettings.models[1], // openrouter
          enabled: true,
          is_default: true,
        },
      ],
    });
    renderSituation();

    expect(await screen.findByRole('heading', { name: 'Non résolu' })).toBeInTheDocument();
    expect(screen.getByText('Aucun modèle direct actif')).toBeInTheDocument();
    expect(screen.getByText('Incomplète')).toBeInTheDocument();
  });

  it('refuse d’afficher Live si le modèle assigné pointe sur un provider non direct', async () => {
    vi.mocked(ai.getAiSettings).mockResolvedValue({
      ...mockSettings,
      assignments: [
        {
          feature: 'pricing.references.diagnose',
          model_config_id: 'm-openrouter-fallback',
          created_by: null,
          updated_by: null,
          created_at: '2026-08-01T00:00:00Z',
          updated_at: '2026-08-16T10:00:00Z',
        },
      ],
    });
    renderSituation();

    expect(await screen.findByRole('heading', { name: 'Non résolu' })).toBeInTheDocument();
    expect(screen.getByText('Affectation non directe ou inactive')).toBeInTheDocument();
    expect(screen.getByText('Incomplète')).toBeInTheDocument();
    expect(screen.queryByText('Prêt pour un run')).not.toBeInTheDocument();
  });

  it('ouvre l’inspecteur de métadonnées au clic sur un événement récent', async () => {
    const user = userEvent.setup();
    renderSituation();

    const eventRow = await screen.findByText('mistral-small-latest');
    await user.click(eventRow);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Détail de l’événement d’usage')).toBeInTheDocument();
    expect(screen.getByText('req-watch-live-001')).toBeInTheDocument();
    expect(screen.getByText(/mistral · mistral-small-latest/i)).toBeInTheDocument();
    expect(screen.getByText('cli-req-001')).toBeInTheDocument();
    expect(screen.getByText('fact-1')).toBeInTheDocument();
  });
});
