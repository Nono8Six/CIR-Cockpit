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
      truncated: false,
      conversation_context: null
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
    expect(screen.getByText('Données consultées')).toBeInTheDocument();
    expect(screen.getByText('Synthèse des évolutions')).toBeInTheDocument();
    expect(screen.queryByText('Agrégat des changements')).not.toBeInTheDocument();
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

  it('distingue une preuve consultée d’un outil en échec sans exposer ses instructions internes', async () => {
    vi.mocked(askAiAssistant).mockResolvedValueOnce({
      ok: true,
      request_id: requestId,
      ai_available: true,
      answer: 'Le résumé disponible est incomplet.',
      citations: [{ tool: 'get_diff_summary', label: 'Description interne très longue', ref: {} }],
      tool_trace: [
        { name: 'get_diff_summary', arguments: {}, ok: true, row_count: 1, duration_ms: 40 },
        {
          name: 'execute_readonly_sql',
          arguments: {
            sql: "SELECT COUNT(DISTINCT cat_fab) FROM public.pricing_supplier_segments WHERE marque = 'FESTO'"
          },
          ok: false,
          row_count: null,
          duration_ms: 100
        }
      ],
      usage: null,
      cost: null,
      fallback_reason: null,
      model_id: 'mistralai/mistral-small',
      truncated: false,
      conversation_context: null
    });
    const user = userEvent.setup();

    render(
      <AssistantChatDialog
        open
        onOpenChange={vi.fn()}
        pageContext={{ surface: 'pricing.references', active_tab: 'changes', file_kind: 'segments_grids' }}
        status={{ enabled: true, model_id: 'mistralai/mistral-small', reason: null }}
      />
    );

    await user.click(screen.getByText('Tu peux me dire les changements par rapport au dernier fichier tarif ?'));

    expect(await screen.findByText('Le résumé disponible est incomplet.')).toBeInTheDocument();
    expect(screen.getByText('analyse incomplète')).toBeInTheDocument();
    expect(screen.getByText('Résumé des changements')).toBeInTheDocument();
    expect(screen.getByText('Lecture des données')).toBeInTheDocument();
    expect(screen.getByText('Voir la requête exécutée')).toBeInTheDocument();
    expect(screen.getByText(/WHERE marque = 'FESTO'/)).toBeInTheDocument();
    expect(screen.queryByText('Description interne très longue')).not.toBeInTheDocument();
  });

  it('affiche la métrique et la marque canonique du comptage déterministe', async () => {
    vi.mocked(askAiAssistant).mockResolvedValueOnce({
      ok: true,
      request_id: requestId,
      ai_available: true,
      answer: 'Le snapshot actif contient 673 catégories fabricant (CAT_FAB) distinctes pour la marque FEST, sur 673 segments.',
      citations: [{ tool: 'aggregate_segments', label: 'Comptage', ref: { distinct_cat_fab: 673 } }],
      tool_trace: [{
        name: 'aggregate_segments',
        arguments: { metric: 'distinct_cat_fab', marques: ['FEST'] },
        ok: true,
        row_count: 1,
        duration_ms: 25
      }],
      usage: null,
      cost: null,
      fallback_reason: null,
      model_id: 'mistralai/mistral-small',
      truncated: false,
      conversation_context: null
    });
    const user = userEvent.setup();
    render(
      <AssistantChatDialog
        open
        onOpenChange={vi.fn()}
        pageContext={{ surface: 'pricing.references', active_tab: 'segments', file_kind: 'segments_grids' }}
        status={{ enabled: true, model_id: 'mistralai/mistral-small', reason: null }}
      />
    );

    await user.type(
      screen.getByLabelText("Question pour l'assistant IA"),
      'Combien de familles produit chez FESTO dans CAT_FAB ?'
    );
    await user.click(screen.getByRole('button', { name: 'Envoyer la question' }));

    expect(await screen.findByText(/673 catégories fabricant/)).toBeInTheDocument();
    expect(screen.getByText('Comptage des catégories fabricant')).toBeInTheDocument();
    expect(screen.getByText('Métrique : CAT_FAB distincts · Filtre marque : FEST')).toBeInTheDocument();
  });
});
