import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAssistantChat } from '@/components/pricing-references/hooks/useAssistantChat';
import { askAiAssistant } from '@/services/ai';
import { handleUiError } from '@/services/errors/handleUiError';

const pageContext = { surface: 'pricing.references' as const, active_tab: 'changements' };

const successfulResponse = (answer: string) => ({
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
  truncated: false
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
});
