import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AssistantChatDialog } from '@/components/pricing-references/components/assistant/AssistantChatDialog';
import { askAiAssistant } from '@/services/ai';

const requestId = '00000000-0000-4000-8000-000000000001';

vi.mock('@/services/ai', () => ({
  askAiAssistant: vi.fn()
}));

vi.mock('@/services/errors/handleUiError', () => ({
  handleUiError: vi.fn()
}));

describe('AssistantChatDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    vi.mocked(askAiAssistant).mockResolvedValue({
      ok: true,
      request_id: requestId,
      ai_available: true,
      answer: 'Les remises ont baissé sur :\n- 99 — DIVERS',
      citations: [{ tool: 'aggregate_diffs', label: 'Agrégat des changements', ref: { run_id: requestId } }],
      tool_trace: [{
        name: 'aggregate_diffs',
        arguments: { direction: 'baisse' },
        ok: true,
        row_count: 1,
        duration_ms: 42
      }],
      usage: null,
      cost: null,
      fallback_reason: null,
      model_id: 'mistralai/mistral-small',
      truncated: false
    });
  });

  it('envoie une question et affiche la réponse ainsi que ses sources', async () => {
    const user = userEvent.setup();
    render(
      <AssistantChatDialog
        open
        onOpenChange={vi.fn()}
        pageContext={{ surface: 'pricing.references', active_tab: 'segments', file_kind: 'segments_grids' }}
        status={{ enabled: true, model_id: 'mistralai/mistral-small', reason: null }}
      />
    );

    await user.type(screen.getByLabelText("Question pour l'assistant IA"), 'Quelles remises ont baissé ?');
    await user.click(screen.getByRole('button', { name: 'Envoyer la question' }));

    await waitFor(() => {
      expect(askAiAssistant).toHaveBeenCalledWith(expect.objectContaining({
        question: 'Quelles remises ont baissé ?',
        history: [],
        page_context: {
          surface: 'pricing.references',
          active_tab: 'segments',
          file_kind: 'segments_grids'
        }
      }));
    });
    expect(await screen.findByText('99 — DIVERS')).toBeInTheDocument();
    expect(screen.getByText('Sources')).toBeInTheDocument();
    expect(screen.getByText('aggregate_diffs')).toBeInTheDocument();
    expect(screen.getByText('Agrégat des changements')).toBeInTheDocument();
  });

  it('explique pourquoi le service est désactivé', () => {
    render(
      <AssistantChatDialog
        open
        onOpenChange={vi.fn()}
        pageContext={{ surface: 'pricing.references', active_tab: 'anomalies' }}
        status={{ enabled: false, model_id: null, reason: 'Fournisseur IA inactif.' }}
      />
    );

    expect(screen.getByText('Assistant indisponible')).toBeInTheDocument();
    expect(screen.getByText('Fournisseur IA inactif.')).toBeInTheDocument();
    expect(screen.getByLabelText("Question pour l'assistant IA")).toBeDisabled();
  });
});
