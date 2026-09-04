import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AiUsageEventDialog } from '@/components/admin-ai/AiUsageEventDialog';
import * as ai from '@/services/ai';

vi.mock('@/services/ai');

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const mockDetailEvent = {
  ok: true as const,
  event: {
    id: 'evt-test-12345',
    request_id: 'req-watch-exec-999',
    feature: 'pricing.references.diagnose' as const,
    provider: 'mistral' as const,
    model_id: 'mistral-large-2512',
    model_config_id: 'm-mistral-large',
    prompt_version_id: 'v-prompt-002',
    user_id: 'u-admin-01',
    agency_id: 'ag-bordeaux',
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
    metadata: {
      vertical: 'reference_watch',
      run_id: 'run-diff-8888-abcd',
      finish_reason: 'stop',
      truncated: false,
      client_request_id: 'cli-req-uuid-7777',
      fact_id: ['fact-bonfig-001', 'fact-inno-002', 'fact-ls-003'],
      extra_flag: 'verified_v2',
    },
  },
};

const renderDialog = (props: {
  eventId: string | null;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AiUsageEventDialog
        eventId={props.eventId}
        open={props.open}
        onOpenChange={props.onOpenChange ?? vi.fn()}
      />
    </QueryClientProvider>
  );
};

describe('AiUsageEventDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('affiche l’état de chargement lorsque la requête est en attente', () => {
    // Promise qui ne résout pas immédiatement pour observer le skeleton
    vi.mocked(ai.getAiUsageEventById).mockReturnValue(new Promise(() => {}));

    renderDialog({ eventId: 'evt-test-12345', open: true });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('ai-usage-event-dialog-loading')).toBeInTheDocument();
  });

  it('affiche l’état d’erreur si getAiUsageEventById échoue', async () => {
    vi.mocked(ai.getAiUsageEventById).mockRejectedValue(new Error('Échec réseau'));

    renderDialog({ eventId: 'evt-test-12345', open: true });

    expect(await screen.findByTestId('ai-usage-event-dialog-error')).toBeInTheDocument();
    expect(
      screen.getByText(/Impossible de charger le détail de l’événement d’usage/i)
    ).toBeInTheDocument();
  });

  it('affiche les métadonnées réelles d’exécution dont client_request_id et fact_id', async () => {
    vi.mocked(ai.getAiUsageEventById).mockResolvedValue(mockDetailEvent);

    renderDialog({ eventId: 'evt-test-12345', open: true });

    expect(await screen.findByTestId('ai-usage-event-dialog-loaded')).toBeInTheDocument();

    // 1. Identification & Request ID
    expect(screen.getByText('req-watch-exec-999')).toBeInTheDocument();
    expect(screen.getByText(/Veille des référentiels/i)).toBeInTheDocument();
    expect(screen.getByText('mistral · mistral-large-2512')).toBeInTheDocument();
    expect(screen.getByText('v-prompt-002')).toBeInTheDocument();

    // 2. Tokens & Coûts
    expect(screen.getByText(/16\s?650/i)).toBeInTheDocument(); // total tokens (15400 + 1250)
    expect(screen.getByText(/15\s?400 in · 1\s?250 out · 3\s?200 cache/i)).toBeInTheDocument();
    expect(screen.getByText(/1\s?840 ms/i)).toBeInTheDocument();

    // 3. Métadonnées d'exécution (§3 du plan & contrat d'exécution)
    expect(screen.getByText('reference_watch')).toBeInTheDocument();
    expect(screen.getByText('run-diff-8888-abcd')).toBeInTheDocument();
    expect(screen.getByText('stop')).toBeInTheDocument();
    expect(screen.getByText('Non')).toBeInTheDocument(); // truncated: false -> 'Non'
    expect(screen.getByText('cli-req-uuid-7777')).toBeInTheDocument(); // client_request_id rendu

    // 4. Citations de faits (fact_id)
    expect(screen.getByText('fact-bonfig-001')).toBeInTheDocument();
    expect(screen.getByText('fact-inno-002')).toBeInTheDocument();
    expect(screen.getByText('fact-ls-003')).toBeInTheDocument();
    expect(screen.getByText(/3 fait\(s\)/i)).toBeInTheDocument();
  });

  it('affiche les erreurs d’exécution si présentes dans l’événement', async () => {
    vi.mocked(ai.getAiUsageEventById).mockResolvedValue({
      ok: true,
      event: {
        ...mockDetailEvent.event,
        status: 'error',
        error_code: 'AI_PROVIDER_UNAVAILABLE',
        error_message: 'Mistral API timeout after 30000ms',
      },
    });

    renderDialog({ eventId: 'evt-test-12345', open: true });

    expect(await screen.findByText(/Erreur d’exécution : AI_PROVIDER_UNAVAILABLE/i)).toBeInTheDocument();
    expect(screen.getByText('Mistral API timeout after 30000ms')).toBeInTheDocument();
  });

  it('gère la copie dans le presse-papiers pour client_request_id et request_id', async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);

    vi.mocked(ai.getAiUsageEventById).mockResolvedValue(mockDetailEvent);

    renderDialog({ eventId: 'evt-test-12345', open: true });

    expect(await screen.findByTestId('ai-usage-event-dialog-loaded')).toBeInTheDocument();

    const copyClientReqBtn = screen.getByRole('button', { name: /Copier Client Request ID/i });
    await user.click(copyClientReqBtn);

    expect(writeTextMock).toHaveBeenCalledWith('cli-req-uuid-7777');
  });
});
