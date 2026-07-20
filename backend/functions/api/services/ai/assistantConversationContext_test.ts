import { assertEquals } from "std/assert";

import {
  aiAssistantAskInputSchema,
  type AiAssistantConversationContext,
  aiAssistantConversationContextSchema,
} from "../../../../../shared/schemas/aiAssistant.schema.ts";
import {
  ASSISTANT_CONTEXT_TTL_MS,
  buildAssistantConversationContext,
  buildPendingClarificationContext,
  getConversationAwareDeterministicIntent,
  getUnsupportedPendingClarificationAnswer,
  isAssistantConversationContextUsable,
  parseProductSemanticResultFollowup,
} from "./assistantBroker.ts";
import { parseAssistantReferenceIntent } from "./assistantIntentRouting.ts";

const snapshotId = "4e216bc4-7d82-4eb7-aa20-2cc8316667cc";
const now = Date.parse("2026-07-13T12:00:00.000Z");
const context = {
  version: 1 as const,
  kind: "result" as const,
  surface: "pricing.references" as const,
  domain: "pricing_references" as const,
  intent: "supplier_category_search" as const,
  dimension: "cat_fab" as const,
  snapshot_id: snapshotId,
  import_id: null,
  filters: {
    requested_terms: ["variateur", "drive"],
    canonical_terms: ["variateur", "drive"],
    query_terms: ["variateur", "drive", "drives", "vfd"],
    marques: [],
    mode: "any" as const,
  },
  result_summary: {
    matching_brands: ["BONF", "FEST", "ROCK", "SIEM"],
    distinct_brand_count: 4,
    segment_rows: 240,
  },
  created_at: new Date(now).toISOString(),
  expires_at: new Date(now + ASSISTANT_CONTEXT_TTL_MS).toISOString(),
};

Deno.test("P3 contrat conversationnel strict et borne", () => {
  assertEquals(
    aiAssistantConversationContextSchema.safeParse(context).success,
    true,
  );
  assertEquals(
    aiAssistantConversationContextSchema.safeParse({
      ...context,
      prompt: "secret",
    }).success,
    false,
  );
  assertEquals(
    aiAssistantAskInputSchema.safeParse({
      client_request_id: crypto.randomUUID(),
      question: "et ROCK ?",
      history: [],
      page_context: {
        surface: "pricing.references",
        target_snapshot_id: snapshotId,
      },
      conversation_context: context,
    }).success,
    true,
  );
});

Deno.test("une relance produit qualifiee est comprise sans dictionnaire metier", () => {
  assertEquals(
    parseProductSemanticResultFollowup("c'est laquelle dans PHOE ?"),
    { brand: "PHOE", mode: "detail" },
  );
  assertEquals(
    parseProductSemanticResultFollowup("combien pour SKF ?"),
    { brand: "SKF", mode: "count" },
  );
  assertEquals(
    parseProductSemanticResultFollowup("et ROCK ?"),
    { brand: "ROCK", mode: "summary" },
  );
  assertEquals(
    parseProductSemanticResultFollowup("et les moteurs electriques ?"),
    null,
  );
});

Deno.test("le contexte produit qualifie est strict, borne et lie au snapshot", () => {
  const productContext = {
    version: 1 as const,
    kind: "product_semantic_result" as const,
    surface: "pricing.references" as const,
    domain: "pricing_references" as const,
    intent: "product_semantic_search" as const,
    concept: "produit industriel quelconque",
    snapshot_id: snapshotId,
    source_client_request_id: "11111111-1111-4111-8111-111111111111",
    accepted_selections: [{
      kind: "classification_scope" as const,
      cir_path: "MEGA > FAMILLE > SOUS-FAMILLE",
    }],
    result_summary: {
      matching_brands: ["MARQ"],
      distinct_brand_count: 1,
      distinct_brand_cat_fab: 12,
    },
    import_id: null,
    created_at: new Date(now).toISOString(),
    expires_at: new Date(now + ASSISTANT_CONTEXT_TTL_MS).toISOString(),
  };
  assertEquals(
    aiAssistantConversationContextSchema.safeParse(productContext).success,
    true,
  );
  assertEquals(
    aiAssistantConversationContextSchema.safeParse({
      ...productContext,
      accepted_selections: Array.from(
        { length: 81 },
        (_, index) => ({
          kind: "classification_scope",
          cir_path: `MEGA > FAMILLE > GROUPE ${index}`,
        }),
      ),
    }).success,
    false,
  );
  assertEquals(
    isAssistantConversationContextUsable(
      productContext,
      { surface: "pricing.references", target_snapshot_id: snapshotId },
      now + 1,
    ),
    true,
  );
  assertEquals(
    isAssistantConversationContextUsable(
      productContext,
      {
        surface: "pricing.references",
        target_snapshot_id: crypto.randomUUID(),
      },
      now + 1,
    ),
    false,
  );
});

Deno.test("P3 herite marque et comptage seulement depuis un contexte coherent", () => {
  const pageContext = {
    surface: "pricing.references" as const,
    target_snapshot_id: snapshotId,
  };
  assertEquals(
    getConversationAwareDeterministicIntent(
      "et SIEMENS ?",
      context,
      pageContext,
      now + 1,
    ),
    {
      tool: "check_brand_matches",
      args: {
        marque: "SIEMENS",
        terms: ["variateur", "drive"],
        dimension: "cat_fab",
        mode: "any",
      },
    },
  );
  assertEquals(
    getConversationAwareDeterministicIntent(
      "combien parmi celles-là ?",
      context,
      pageContext,
      now + 1,
    ),
    {
      tool: "count_supplier_brands",
      args: { marques: ["BONF", "FEST", "ROCK", "SIEM"] },
    },
  );
});

Deno.test("P3 refuse expiration et changement de snapshot", () => {
  assertEquals(
    isAssistantConversationContextUsable(context, {
      surface: "pricing.references",
    }, now + ASSISTANT_CONTEXT_TTL_MS),
    false,
  );
  assertEquals(
    isAssistantConversationContextUsable(
      context,
      {
        surface: "pricing.references",
        target_snapshot_id: crypto.randomUUID(),
      },
      now + 1,
    ),
    false,
  );
  assertEquals(
    isAssistantConversationContextUsable(
      context,
      { surface: "pricing.references", import_id: crypto.randomUUID() },
      now + 1,
    ),
    false,
  );
  assertEquals(
    getConversationAwareDeterministicIntent(
      "et ROCK ?",
      context,
      {
        surface: "pricing.references",
        target_snapshot_id: crypto.randomUUID(),
      },
      now + 1,
    ),
    null,
  );
});

Deno.test("P3 une nouvelle intention explicite remplace le contexte", () => {
  assertEquals(
    getConversationAwareDeterministicIntent(
      "Il y a combien de marques distinctes ?",
      context,
      { surface: "pricing.references", target_snapshot_id: snapshotId },
      now + 1,
    ),
    { tool: "count_supplier_brands", args: {} },
  );
  assertEquals(
    getConversationAwareDeterministicIntent(
      "Combien de clients actifs dans le CRM ?",
      context,
      { surface: "pricing.references", target_snapshot_id: snapshotId },
      now + 1,
    ),
    null,
  );
});

Deno.test("P3 construit un resume borne sans trace brute ni SQL", () => {
  const built = buildAssistantConversationContext(
    {
      tool: "search_supplier_categories",
      args: { terms: ["drive"], mode: "any" },
    },
    {
      snapshot_id: snapshotId,
      requested_terms: ["drive"],
      canonical_terms: ["drive"],
      query_terms: ["drive", "drives", "variateur", "vfd"],
      marques: [],
      matching_brands: ["ROCK", "SIEM"],
      distinct_brand_count: 2,
      segment_rows: 235,
      sql: "select secret",
      tool_trace: [{ name: "execute_readonly_sql" }],
    },
    null,
    {},
    now,
  );
  assertEquals(built, {
    ...context,
    filters: {
      requested_terms: ["drive"],
      canonical_terms: ["drive"],
      query_terms: ["drive", "drives", "variateur", "vfd"],
      marques: [],
      mode: "any",
    },
    result_summary: {
      matching_brands: ["ROCK", "SIEM"],
      distinct_brand_count: 2,
      segment_rows: 235,
    },
  });
  assertEquals(JSON.stringify(built).includes("select secret"), false);
  assertEquals(JSON.stringify(built).includes("execute_readonly_sql"), false);
});

Deno.test("P3-bis represente une clarification en attente sans resultat invente", () => {
  const pending = {
    version: 1 as const,
    kind: "pending_clarification" as const,
    surface: "pricing.references" as const,
    domain: "pricing_references" as const,
    intent: "supplier_category_search" as const,
    requested_terms: ["variateurs", "drives"],
    options: ["cat_fab", "fam_cir"] as const,
    import_id: null,
    target_snapshot_id: snapshotId,
    created_at: new Date(now).toISOString(),
    expires_at: new Date(now + ASSISTANT_CONTEXT_TTL_MS).toISOString(),
  };
  assertEquals(
    aiAssistantConversationContextSchema.safeParse(pending).success,
    true,
  );
  assertEquals(
    getConversationAwareDeterministicIntent(
      "cat_fab",
      pending as unknown as AiAssistantConversationContext,
      { surface: "pricing.references", target_snapshot_id: snapshotId },
      now + 1,
    ),
    {
      tool: "search_supplier_categories",
      args: { terms: ["variateurs", "drives"], mode: "any" },
    },
  );
  assertEquals(
    getConversationAwareDeterministicIntent(
      "Combien de clients actifs ?",
      pending as unknown as AiAssistantConversationContext,
      { surface: "pricing.references", target_snapshot_id: snapshotId },
      now + 1,
    ),
    null,
  );
});

Deno.test("P3-bis une recherche produit ouverte ne cree plus une clarification legacy", () => {
  const pageContext = {
    surface: "pricing.references" as const,
    target_snapshot_id: snapshotId,
  };
  const parsed = parseAssistantReferenceIntent(
    "Quelles marques ont des familles de produits avec des variateurs ou drives ?",
  );
  const pending = buildPendingClarificationContext(parsed, pageContext, now);
  assertEquals(parsed.kind, "product_semantic_search");
  assertEquals(pending, null);
});

Deno.test("P3-bis conserve la clarification de dimension sans concept produit", () => {
  const pageContext = {
    surface: "pricing.references" as const,
    target_snapshot_id: snapshotId,
  };
  const pending = buildPendingClarificationContext(
    parseAssistantReferenceIntent("Familles"),
    pageContext,
    now,
  );
  assertEquals(
    pending,
    null,
  );
  assertEquals(
    getUnsupportedPendingClarificationAnswer(
      "Combien de clients actifs ?",
      pending,
      pageContext,
      now + 1,
    ),
    null,
  );
});
