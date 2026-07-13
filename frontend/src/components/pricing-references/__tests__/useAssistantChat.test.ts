import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAssistantChat } from '@/components/pricing-references/hooks/useAssistantChat';
import { askAiAssistant } from '@/services/ai';
import { handleUiError } from '@/services/errors/handleUiError';

const pageContext = { surface: 'pricing.references' as const, active_tab: 'changements' };

const conversationContext = {
  version: 1 as const,
  surface: 'pricing.references' as const,
  domain: 'pricing_references' as const,
  intent: 'supplier_category_search' as const,
  dimension: 'cat_fab' as const,
  snapshot_id: '4e216bc4-7d82-4eb7-aa20-2cc8316667cc',
  import_id: null,
  filters: {
    requested_terms: ['drive'],
    canonical_terms: ['drive'],
    query_terms: ['drive', 'drives', 'variateur', 'vfd'],
    marques: [],
    mode: 'any' as const
  },
  result_summary: {
    matching_brands: ['ROCK'],
    distinct_brand_count: 1,
    segment_rows: 234
  },
  created_at: '2026-07-13T12:00:00.000Z',
  expires_at: '2026-07-13T12:15:00.000Z'
};

const successfulResponse = (answer: string, context = null as typeof conversationContext | null) => ({
  ok: true as const,
  request_id: crypto.randomUUID(),
  ai_available: true,
  answer,
  citations: [],
  tool_trace: [],
  usage: null,
  cost: null,
  fallback_reason: null,
  model_id: 'mistralai/mistral-small',
  truncated: false,
  conversation_context: context
});

vi.mock('@/services/ai', () => ({
  askAiAssistant: vi.fn()
}));

vi.mock('@/services/errors/handleUiError', () => ({
  handleUiError: vi.fn()
}));

describe('useAssistantChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(askAiAssistant).mockImplementation(async ({ question }) => successfulResponse(`Réponse : ${question}`));
  });

  it('borne à 12 messages l’historique envoyé au service', async () => {
    const { result } = renderHook(() => useAssistantChat(pageContext));

    for (let index = 1; index <= 7; index += 1) {
      await act(async () => {
        await result.current.send(`Question ${index}`);
      });
    }

    const seventhCall = vi.mocked(askAiAssistant).mock.calls[6]?.[0];
    expect(seventhCall?.history).toHaveLength(12);
    expect(seventhCall?.history[0]).toEqual({ role: 'user', content: 'Question 1' });
    expect(seventhCall?.history[11]).toEqual({ role: 'assistant', content: 'Réponse : Question 6' });
  });

  it('réutilise le client_request_id au retry puis en génère un autre au nouvel envoi', async () => {
    vi.mocked(askAiAssistant)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(successfulResponse('Réponse après retry'))
      .mockResolvedValueOnce(successfulResponse('Nouvelle réponse'));
    vi.mocked(handleUiError).mockReturnValue({
      _tag: 'AppError',
      code: 'NETWORK_ERROR',
      message: 'Impossible de joindre le serveur.',
      domain: 'network',
      source: 'network',
      severity: 'error',
      recoveryAction: 'retry',
      retryable: true,
      fingerprint: 'network-error'
    });
    const { result } = renderHook(() => useAssistantChat(pageContext));

    await act(async () => {
      await result.current.send('Première question');
    });
    const firstRequestId = vi.mocked(askAiAssistant).mock.calls[0]?.[0].client_request_id;

    await act(async () => {
      await result.current.retry();
    });
    expect(vi.mocked(askAiAssistant).mock.calls[1]?.[0].client_request_id).toBe(firstRequestId);

    await act(async () => {
      await result.current.send('Deuxième question');
    });
    expect(vi.mocked(askAiAssistant).mock.calls[2]?.[0].client_request_id).not.toBe(firstRequestId);
  });

  it('génère une nouvelle requête pour relancer après une erreur fournisseur confirmée', async () => {
    vi.mocked(askAiAssistant)
      .mockRejectedValueOnce(new Error('Provider returned an empty response'))
      .mockResolvedValueOnce(successfulResponse('Réponse après relance'));
    vi.mocked(handleUiError).mockReturnValue({
      _tag: 'AppError',
      code: 'AI_PROVIDER_UNAVAILABLE',
      message: 'Fournisseur IA indisponible.',
      domain: 'edge',
      source: 'edge',
      severity: 'error',
      recoveryAction: 'retry',
      retryable: true,
      fingerprint: 'provider-unavailable'
    });
    const { result } = renderHook(() => useAssistantChat(pageContext));

    await act(async () => {
      await result.current.send('Question fournisseur');
    });
    const failedRequestId = vi.mocked(askAiAssistant).mock.calls[0]?.[0].client_request_id;

    await act(async () => {
      await result.current.retry();
    });

    expect(vi.mocked(askAiAssistant).mock.calls[1]?.[0].client_request_id).not.toBe(failedRequestId);
  });

  it('transporte uniquement le dernier contexte structuré et le réinitialise', async () => {
    vi.mocked(askAiAssistant)
      .mockResolvedValueOnce(successfulResponse('Recherche trouvée', conversationContext))
      .mockResolvedValueOnce(successfulResponse('ROCK correspond', conversationContext))
      .mockResolvedValueOnce(successfulResponse('Nouvelle recherche'));
    const { result } = renderHook(() => useAssistantChat(pageContext));

    await act(async () => {
      await result.current.send('CAT_FAB avec drive');
    });
    expect(vi.mocked(askAiAssistant).mock.calls[0]?.[0].conversation_context).toBeNull();

    await act(async () => {
      await result.current.send('et ROCK ?');
    });
    expect(vi.mocked(askAiAssistant).mock.calls[1]?.[0].conversation_context).toEqual(conversationContext);

    act(() => result.current.reset());
    await act(async () => {
      await result.current.send('Nouvelle question');
    });
    expect(vi.mocked(askAiAssistant).mock.calls[2]?.[0].conversation_context).toBeNull();
  });
});
