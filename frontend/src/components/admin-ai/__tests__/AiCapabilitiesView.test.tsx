import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AiCapabilitiesView } from '@/components/admin-ai/AiCapabilitiesView';
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
      enabled: true,
      has_api_key: true,
      api_key_last4: '1122',
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
      label: 'Mistral Small',
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
      id: 'm-openrouter-default',
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
    {
      id: 'm-mistral-large',
      provider_config_id: 'p-mistral',
      provider: 'mistral' as const,
      model_id: 'mistral-large-latest',
      label: 'Mistral Large Pro',
      enabled: true,
      is_default: false,
      currency: 'USD',
      input_price_per_million: 2.0,
      output_price_per_million: 6.0,
      cached_input_price_per_million: null,
      reasoning_price_per_million: null,
      price_effective_at: null,
      max_output_tokens: 8000,
      temperature: 0.15,
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
  quotas: [],
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
        body: 'Prompt watch v2',
        change_note: 'v2',
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

const mockUsage = {
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
    budget_alerts: [],
    quota_usages: [],
    daily: [],
  },
};

const renderCapabilities = () => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AiCapabilitiesView />
    </QueryClientProvider>
  );
};

describe('AiCapabilitiesView', () => {
  beforeEach(() => {
    vi.mocked(ai.getAiSettings).mockResolvedValue(mockSettings);
    vi.mocked(ai.listAiPrompts).mockResolvedValue(mockPrompts);
    vi.mocked(ai.getAiUsageSummary).mockResolvedValue(mockUsage);
    vi.mocked(ai.saveAiFeatureAssignment).mockResolvedValue({
      ok: true,
      assignment: {
        feature: 'pricing.references.diagnose',
        model_config_id: 'm-mistral-large',
        created_by: null,
        updated_by: null,
        created_at: '2026-08-16T00:00:00Z',
        updated_at: '2026-08-16T00:00:00Z',
      },
    });
    vi.mocked(ai.saveAiModel).mockResolvedValue({
      ok: true,
      model: mockSettings.models[0],
    });
    vi.mocked(ai.deleteAiModel).mockResolvedValue({
      ok: true,
      deleted_id: 'm-mistral-large',
    });
  });

  it('affiche les quatre capacités avec leur état et les deux défauts provider', async () => {
    renderCapabilities();

    expect(await screen.findByText('Veille des référentiels')).toBeInTheDocument();
    expect(screen.getByText('Diagnostic classification')).toBeInTheDocument();
    expect(screen.getByText('Diagnostic segments')).toBeInTheDocument();
    expect(screen.getByText('Chat référentiels')).toBeInTheDocument();

    // Vérifie que les deux modèles par défaut affichent tous les deux le badge
    const defaultBadges = screen.getAllByText('Défaut provider');
    expect(defaultBadges).toHaveLength(2);
  });

  it('permet d’affecter un modèle et d’enregistrer la mutation', async () => {
    const user = userEvent.setup();
    renderCapabilities();

    const assignBtn = await screen.findByTestId('btn-assign-pricing.references.diagnose');
    await user.click(assignBtn);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Affecter un modèle/i)).toBeInTheDocument();

    const saveBtn = screen.getByRole('button', { name: 'Enregistrer l’affectation' });
    await user.click(saveBtn);

    expect(ai.saveAiFeatureAssignment).toHaveBeenCalledWith({
      feature: 'pricing.references.diagnose',
      model_config_id: 'm-mistral-small',
    });
  });

  it('permet de revenir au repli (model_config_id: null)', async () => {
    const user = userEvent.setup();
    renderCapabilities();

    const assignBtn = await screen.findByTestId('btn-assign-pricing.references.diagnose');
    await user.click(assignBtn);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    // Ouvre le Select Radix
    const selectTrigger = screen.getByRole('combobox');
    await user.click(selectTrigger);

    // Sélectionne l'option de repli
    const fallbackOption = await screen.findByText(/Revenir au repli/i);
    await user.click(fallbackOption);

    const saveBtn = screen.getByRole('button', { name: 'Enregistrer l’affectation' });
    await user.click(saveBtn);

    expect(ai.saveAiFeatureAssignment).toHaveBeenCalledWith({
      feature: 'pricing.references.diagnose',
      model_config_id: null,
    });
  });

  it('ouvre le formulaire d’ajout de modèle avec libellé et identifiant neutres', async () => {
    const user = userEvent.setup();
    renderCapabilities();

    const addBtn = await screen.findByTestId('btn-add-model');
    await user.click(addBtn);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/Identifiant du modèle/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Identifiant OpenRouter/i)).not.toBeInTheDocument();
  });

  it('bloque la suppression d’un modèle portant is_default', async () => {
    renderCapabilities();

    await screen.findAllByText('Mistral Small');
    const deleteSmallBtn = screen.getByRole('button', { name: 'Supprimer Mistral Small' });
    expect(deleteSmallBtn).toBeDisabled();

    const deleteLargeBtn = screen.getByRole('button', { name: 'Supprimer Mistral Large Pro' });
    expect(deleteLargeBtn).toBeEnabled();
  });

  it('affiche Incomplète et Affectation non directe si le modèle assigné est sur un provider non direct', async () => {
    vi.mocked(ai.getAiSettings).mockResolvedValue({
      ...mockSettings,
      assignments: [
        {
          feature: 'pricing.references.diagnose',
          model_config_id: 'm-openrouter-default',
          created_by: null,
          updated_by: null,
          created_at: '2026-08-01T00:00:00Z',
          updated_at: '2026-08-16T10:00:00Z',
        },
      ],
    });

    renderCapabilities();

    expect(await screen.findByText('Affectation non directe ou inactive')).toBeInTheDocument();
    // Le statut de la capacité n'est pas Live mais Incomplète
    const liveBadges = screen.queryAllByText('Live');
    expect(liveBadges).toHaveLength(0);
  });
});
