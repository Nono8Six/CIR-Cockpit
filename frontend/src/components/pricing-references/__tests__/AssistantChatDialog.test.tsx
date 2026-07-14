import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AssistantChatDialog } from "@/components/pricing-references/components/assistant/AssistantChatDialog";
import { askAiAssistant } from "@/services/ai";

const requestId = "00000000-0000-4000-8000-000000000001";
const snapshotId = "4e216bc4-7d82-4eb7-aa20-2cc8316667cc";

vi.mock("@/services/ai", () => ({
  askAiAssistant: vi.fn(),
}));

vi.mock("@/services/errors/handleUiError", () => ({
  handleUiError: vi.fn(),
}));

describe("AssistantChatDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    vi.mocked(askAiAssistant).mockResolvedValue({
      ok: true,
      request_id: requestId,
      ai_available: true,
      answer: "Les remises ont baissé sur :\n- 99 — DIVERS",
      citations: [{
        tool: "aggregate_diffs",
        label: "Agrégat des changements",
        ref: { run_id: requestId },
      }],
      tool_trace: [{
        name: "aggregate_diffs",
        arguments: { direction: "baisse" },
        ok: true,
        row_count: 1,
        duration_ms: 42,
      }],
      evidence: {
        status: "verified",
        intent: "aggregate_diffs",
        dimension: null,
        facts: [{
          label: "Nombre de changements",
          tool: "aggregate_diffs",
          snapshot_id: snapshotId,
          result_field: "total",
          source_value: 99,
          displayed_value: 99,
          derivation: "direct",
        }],
        executions: [{
          tool: "aggregate_diffs",
          ok: true,
          duration_ms: 42,
          row_count: 1,
          snapshot_id: snapshotId,
          requested_filters: { direction: "baisse" },
          canonical_filters: {},
          server_filters: { snapshot_id: snapshotId },
          sql_attempt: null,
          executed_sql: null,
          error_code: null,
        }],
      },
      usage: null,
      cost: null,
      fallback_reason: null,
      model_id: "mistralai/mistral-small",
      truncated: false,
      conversation_context: null,
    });
  });

  it("envoie une question et affiche la réponse ainsi que ses sources", async () => {
    const user = userEvent.setup();
    render(
      <AssistantChatDialog
        open
        onOpenChange={vi.fn()}
        pageContext={{
          surface: "pricing.references",
          active_tab: "segments",
          file_kind: "segments_grids",
        }}
        status={{
          enabled: true,
          model_id: "mistralai/mistral-small",
          reason: null,
        }}
      />,
    );

    await user.type(
      screen.getByLabelText("Question pour l'assistant IA"),
      "Quelles remises ont baissé ?",
    );
    await user.click(
      screen.getByRole("button", { name: "Envoyer la question" }),
    );

    await waitFor(() => {
      expect(askAiAssistant).toHaveBeenCalledWith(expect.objectContaining({
        question: "Quelles remises ont baissé ?",
        history: [],
        page_context: {
          surface: "pricing.references",
          active_tab: "segments",
          file_kind: "segments_grids",
        },
      }));
    });
    expect(await screen.findByText("99 — DIVERS")).toBeInTheDocument();
    expect(screen.getByText("Preuves et diagnostic")).toBeInTheDocument();
    expect(screen.getByText("Résultat vérifié")).toBeInTheDocument();
    expect(screen.queryByText("Agrégat des changements")).not
      .toBeInTheDocument();
  });

  it("explique pourquoi le service est désactivé", () => {
    render(
      <AssistantChatDialog
        open
        onOpenChange={vi.fn()}
        pageContext={{ surface: "pricing.references", active_tab: "anomalies" }}
        status={{
          enabled: false,
          model_id: null,
          reason: "Fournisseur IA inactif.",
        }}
      />,
    );

    expect(screen.getByText("Assistant indisponible")).toBeInTheDocument();
    expect(screen.getByText("Fournisseur IA inactif.")).toBeInTheDocument();
    expect(screen.getByLabelText("Question pour l'assistant IA"))
      .toBeDisabled();
  });

  it("distingue une preuve consultée d’un outil en échec sans exposer ses instructions internes", async () => {
    vi.mocked(askAiAssistant).mockResolvedValueOnce({
      ok: true,
      request_id: requestId,
      ai_available: true,
      answer: "Le résumé disponible est incomplet.",
      citations: [{
        tool: "get_diff_summary",
        label: "Description interne très longue",
        ref: {},
      }],
      tool_trace: [
        {
          name: "get_diff_summary",
          arguments: {},
          ok: true,
          row_count: 1,
          duration_ms: 40,
        },
        {
          name: "execute_readonly_sql",
          arguments: {
            sql:
              "SELECT COUNT(DISTINCT cat_fab) FROM public.pricing_supplier_segments WHERE marque = 'FESTO'",
          },
          ok: false,
          row_count: null,
          duration_ms: 100,
        },
      ],
      evidence: {
        status: "partial",
        intent: "diff_summary",
        dimension: null,
        facts: [{
          label: "Nombre de changements",
          tool: "get_diff_summary",
          snapshot_id: snapshotId,
          result_field: "total",
          source_value: 1,
          displayed_value: 1,
          derivation: "direct",
        }],
        executions: [
          {
            tool: "get_diff_summary",
            ok: true,
            duration_ms: 40,
            row_count: 1,
            snapshot_id: snapshotId,
            requested_filters: {},
            canonical_filters: {},
            server_filters: { snapshot_id: snapshotId },
            sql_attempt: null,
            executed_sql: null,
            error_code: null,
          },
          {
            tool: "execute_readonly_sql",
            ok: false,
            duration_ms: 100,
            row_count: null,
            snapshot_id: snapshotId,
            requested_filters: {},
            canonical_filters: {},
            server_filters: { snapshot_id: snapshotId },
            sql_attempt: 1,
            executed_sql: null,
            error_code: "AI_SQL_REJECTED",
          },
        ],
      },
      usage: null,
      cost: null,
      fallback_reason: null,
      model_id: "mistralai/mistral-small",
      truncated: false,
      conversation_context: null,
    });
    const user = userEvent.setup();

    render(
      <AssistantChatDialog
        open
        onOpenChange={vi.fn()}
        pageContext={{
          surface: "pricing.references",
          active_tab: "changes",
          file_kind: "segments_grids",
        }}
        status={{
          enabled: true,
          model_id: "mistralai/mistral-small",
          reason: null,
        }}
      />,
    );

    await user.click(
      screen.getByText(
        "Tu peux me dire les changements par rapport au dernier fichier tarif ?",
      ),
    );

    expect(await screen.findByText("Le résumé disponible est incomplet."))
      .toBeInTheDocument();
    expect(screen.getByText("Analyse partielle")).toBeInTheDocument();
    expect(screen.getByText("Résumé des changements")).toBeInTheDocument();
    expect(screen.getByText("Lecture des données")).toBeInTheDocument();
    expect(screen.queryByText("Voir le SQL exécuté")).not.toBeInTheDocument();
    expect(screen.queryByText(/WHERE marque = 'FESTO'/)).not
      .toBeInTheDocument();
    expect(screen.queryByText("Description interne très longue")).not
      .toBeInTheDocument();
  });

  it("affiche la métrique et la marque canonique du comptage déterministe", async () => {
    vi.mocked(askAiAssistant).mockResolvedValueOnce({
      ok: true,
      request_id: requestId,
      ai_available: true,
      answer:
        "Le snapshot actif contient 673 catégories fabricant (CAT_FAB) distinctes pour la marque FEST, sur 673 segments.",
      citations: [{
        tool: "aggregate_segments",
        label: "Comptage",
        ref: { distinct_cat_fab: 673 },
      }],
      tool_trace: [{
        name: "aggregate_segments",
        arguments: { metric: "distinct_cat_fab", marques: ["FEST"] },
        ok: true,
        row_count: 1,
        duration_ms: 25,
      }],
      evidence: {
        status: "verified",
        intent: "segment_count",
        dimension: "cat_fab",
        facts: [{
          label: "Nombre de catégories fabricant distinctes",
          tool: "aggregate_segments",
          snapshot_id: snapshotId,
          result_field: "distinct_cat_fab",
          source_value: 673,
          displayed_value: 673,
          derivation: "direct",
        }],
        executions: [{
          tool: "aggregate_segments",
          ok: true,
          duration_ms: 25,
          row_count: 1,
          snapshot_id: snapshotId,
          requested_filters: { marques: ["FEST"] },
          canonical_filters: { marques: ["FEST"] },
          server_filters: { snapshot_id: snapshotId },
          sql_attempt: null,
          executed_sql: null,
          error_code: null,
        }],
      },
      usage: null,
      cost: null,
      fallback_reason: null,
      model_id: "mistralai/mistral-small",
      truncated: false,
      conversation_context: null,
    });
    const user = userEvent.setup();
    render(
      <AssistantChatDialog
        open
        onOpenChange={vi.fn()}
        pageContext={{
          surface: "pricing.references",
          active_tab: "segments",
          file_kind: "segments_grids",
        }}
        status={{
          enabled: true,
          model_id: "mistralai/mistral-small",
          reason: null,
        }}
      />,
    );

    await user.type(
      screen.getByLabelText("Question pour l'assistant IA"),
      "Combien de familles produit chez FESTO dans CAT_FAB ?",
    );
    await user.click(
      screen.getByRole("button", { name: "Envoyer la question" }),
    );

    expect(await screen.findByText(/673 catégories fabricant/))
      .toBeInTheDocument();
    expect(screen.getByText("Comptage des catégories fabricant"))
      .toBeInTheDocument();
    expect(screen.getByText("Nombre de catégories fabricant distinctes"))
      .toBeInTheDocument();
    expect(screen.getByText(/Filtres demandés : FEST/)).toBeInTheDocument();
  });
});
