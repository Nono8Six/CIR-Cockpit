import { assertEquals } from "std/assert";

import {
  aiAssistantAskInputSchema,
  aiAssistantConversationContextSchema,
} from "../../../../../shared/schemas/aiAssistant.schema.ts";
import {
  ASSISTANT_CONTEXT_TTL_MS,
  buildAssistantConversationContext,
  getConversationAwareDeterministicIntent,
  isAssistantConversationContextUsable,
} from "./assistantBroker.ts";

const snapshotId = "4e216bc4-7d82-4eb7-aa20-2cc8316667cc";
const now = Date.parse("2026-07-13T12:00:00.000Z");
const context = {
  version: 1 as const,
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
