import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AiJournalView } from '@/components/admin-ai/AiJournalView';
import * as adminUsers from '@/services/admin/getAdminUsers';
import * as agencies from '@/services/agency/getAgencies';
import * as ai from '@/services/ai';
import type { Agency } from '@/types';

vi.mock('@/services/ai');
vi.mock('@/services/admin/getAdminUsers');
vi.mock('@/services/agency/getAgencies');

const userId = '11111111-1111-4111-8111-111111111111';
const agencyId = '22222222-2222-4222-8222-222222222222';
const eventId = '88888888-8888-4888-8888-888888888888';

const watchEvent = {
  id: eventId,
  request_id: 'req-watch-exec-999',
  feature: 'pricing.references.diagnose' as const,
  provider: 'mistral' as const,
  model_id: 'mistral-large-2512',
  model_config_id: 'm-mistral-large',
  prompt_version_id: 'v-prompt-002',
  user_id: userId,
  agency_id: agencyId,
  input_tokens: 15400,
  output_tokens: 1250,
  cached_input_tokens: 3200,
  reasoning_tokens: 0,
  cost_amount: 0.0452,
  currency: 'USD',
  cache_hit: false,
  status: 'success' as const,
  error_code: null,
  error_message: null,
  latency_ms: 1840,
  created_at: '2026-08-16T14:30:00Z',
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
    budget_alerts: [],
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

const mockUsers = [
  {
    id: userId,
    email: 'alice@cir.fr',
    display_name: 'Alice Martin',
    first_name: 'Alice',
    last_name: 'Martin',
    role: 'tcs' as const,
    archived_at: null,
    created_at: '2026-02-10T10:00:00.000Z',
    memberships: [{ agency_id: agencyId, agency_name: 'CIR Bordeaux' }],
  },
];

const mockAgencies = [{ id: agencyId, name: 'CIR Bordeaux' }] as Agency[];

const renderView = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      })}
    >
      <AiJournalView />
    </QueryClientProvider>,
  );

describe('AiJournalView', () => {
  beforeEach(() => {
    vi.mocked(ai.getAiUsageSummary).mockResolvedValue(mockSummary);
    vi.mocked(ai.listAiUsageEvents).mockResolvedValue({
      ok: true,
      events: [watchEvent],
      page: 1,
      page_size: 25,
      total: 26,
    });
    vi.mocked(ai.getAiUsageEventById).mockResolvedValue({
      ok: true,
      event: {
        ...watchEvent,
        metadata: {
          vertical: 'reference_watch',
          run_id: 'run-diff-8888-abcd',
          finish_reason: 'stop',
          truncated: false,
          client_request_id: 'cli-req-uuid-7777',
          fact_id: ['fact-bonfig-001'],
        },
      },
    });
    vi.mocked(adminUsers.getAdminUsers).mockResolvedValue(mockUsers);
    vi.mocked(agencies.getAgencies).mockResolvedValue(mockAgencies);
  });

  it('pagine et filtre côté serveur en utilisant total, sans résoudre les noms via une capacité', async () => {
    const user = userEvent.setup();
    renderView();

    expect(await screen.findByText('Alice Martin')).toBeInTheDocument();
    expect(screen.getByText('CIR Bordeaux')).toBeInTheDocument();
    expect(screen.getByText('Succès')).toBeInTheDocument();
    expect(screen.getByTestId('ai-journal-total')).toHaveTextContent(/26 événements · page 1 \/ 2/);

    expect(ai.listAiUsageEvents).toHaveBeenCalledWith({ page: 1, page_size: 25 });
    expect(ai.getAiMembersAccessOverview).not.toHaveBeenCalled();
    expect(adminUsers.getAdminUsers).toHaveBeenCalled();
    expect(agencies.getAgencies).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Suivant' }));
    await waitFor(() => {
      expect(ai.listAiUsageEvents).toHaveBeenCalledWith({ page: 2, page_size: 25 });
    });

    await user.click(screen.getByRole('combobox', { name: 'Filtrer par statut' }));
    await user.click(await screen.findByRole('option', { name: 'Erreur' }));
    await waitFor(() => {
      expect(ai.listAiUsageEvents).toHaveBeenCalledWith({
        page: 1,
        page_size: 25,
        status: 'error',
      });
    });
  });

  it('ouvre le Dialog partagé sur un run watch avec tokens décomposés, coût, latence et metadata.vertical', async () => {
    const user = userEvent.setup();
    renderView();

    await screen.findByText('Alice Martin');
    await user.click(screen.getByTestId(`ai-journal-row-${eventId}`));

    const dialog = await screen.findByTestId('ai-usage-event-dialog-loaded');
    expect(ai.getAiUsageEventById).toHaveBeenCalledWith({ id: eventId });
    expect(within(dialog).getByText('req-watch-exec-999')).toBeInTheDocument();
    expect(within(dialog).getByText(/15\s?400 in · 1\s?250 out · 3\s?200 cache/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/1\s?840 ms/i)).toBeInTheDocument();
    expect(within(dialog).getByText('reference_watch')).toBeInTheDocument();
    expect(within(dialog).getByText('cli-req-uuid-7777')).toBeInTheDocument();
  });
});
