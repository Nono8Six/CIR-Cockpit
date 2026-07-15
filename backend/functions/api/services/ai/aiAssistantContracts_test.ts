import { assertEquals, assertRejects } from "std/assert";

import {
  aiAssistantAskResponseSchema,
  aiAssistantEvidenceFactSchema,
  aiAssistantEvidenceSchema,
  aiAssistantPublicExecutionSchema,
} from "../../../../../shared/schemas/aiAssistant.schema.ts";
import {
  buildOpenRouterProviderPreferences,
  callProviderWithTools,
  type ModelRow,
  type OpenRouterToolDefinition,
  preflightOpenRouterModelEndpoints,
  type ProviderRow,
} from "./aiGovernance.ts";
import {
  getAmbiguousFamilyClarification,
  getSegmentCountIntent,
  runAssistantToolLoop,
  selectAssistantTools,
} from "./assistantBroker.ts";
import { openRouterToolDefinitions } from "./assistantTools.ts";

const provider: ProviderRow = {
  id: "00000000-0000-4000-8000-000000000001",
  provider: "openrouter",
  label: "OpenRouter",
  enabled: true,
  encrypted_api_key: "encrypted",
  api_key_last4: "test",
  api_key_hash: null,
  base_url: "https://openrouter.test/api/v1",
  organization_id: null,
  last_test_status: "success",
  last_test_at: null,
  last_error_code: null,
  last_error_message: null,
  created_by: null,
  updated_by: null,
  created_at: "2026-07-10T00:00:00.000Z",
  updated_at: "2026-07-10T00:00:00.000Z",
};

const model: ModelRow = {
  id: "00000000-0000-4000-8000-000000000002",
  provider_config_id: provider.id,
  provider: "openrouter",
  model_id: "mistralai/mistral-small-3.2-24b-instruct",
  label: "Mistral Small 3.2 24B",
  enabled: true,
  is_default: true,
  currency: "USD",
  input_price_per_million: "0.075",
  output_price_per_million: "0.2",
  cached_input_price_per_million: null,
  reasoning_price_per_million: null,
  price_effective_at: "2026-07-10T00:00:00.000Z",
  max_output_tokens: 2000,
  temperature: "0.2",
  created_by: null,
  updated_by: null,
  created_at: "2026-07-10T00:00:00.000Z",
  updated_at: "2026-07-10T00:00:00.000Z",
};

Deno.test("assistant referentiels clarifies ambiguous family dimensions deterministically", () => {
  const clarification =
    "Souhaitez-vous analyser la famille CIR (FAM/FAM_LIB) ou la catégorie fabricant (CAT_FAB) ?";

  assertEquals(
    getAmbiguousFamilyClarification(
      "Quelles familles ROCKWELL ont augmenté ?",
    ),
    clarification,
  );
  assertEquals(
    getAmbiguousFamilyClarification(
      "Quelles familles de produit ont une baisse de remise ?",
    ),
    clarification,
  );
  assertEquals(
    getAmbiguousFamilyClarification(
      "Quelles familles CIR ont une baisse de remise ?",
    ),
    null,
  );
  assertEquals(
    getAmbiguousFamilyClarification(
      "Quelles catégories fabricant ROCKWELL ont augmenté ?",
    ),
    null,
  );
});

Deno.test("assistant routes known PO intents away from general SQL tools", () => {
  const allTools: OpenRouterToolDefinition[] = [
    ...tools,
    {
      type: "function",
      function: {
        name: "aggregate_segments",
        description: "Compte les categories fabricant.",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: "get_diff_summary",
        description: "Resume les changements.",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: "execute_readonly_sql",
        description: "Execute du SQL.",
        parameters: { type: "object", properties: {} },
      },
    },
  ];
  const selected = selectAssistantTools(
    "Tu peux me dire les changements par rapport au dernier fichier tarif ?",
    allTools,
  );
  assertEquals(selected.map((tool) => tool.function.name), [
    "get_diff_summary",
  ]);
  assertEquals(
    selectAssistantTools("Combien de clients actifs ?", allTools).map((tool) =>
      tool.function.name
    ),
    ["execute_readonly_sql"],
  );
  assertEquals(
    getSegmentCountIntent(
      "Combien il y a des familles produit chez FEST (FESTO) ? dans cat_fab",
    ),
    { metric: "distinct_cat_fab", marques: ["FEST", "FESTO"] },
  );
  assertEquals(
    selectAssistantTools(
      "Combien il y a des familles produit chez FEST (FESTO) ? dans cat_fab",
      allTools,
    ).map((tool) => tool.function.name),
    ["aggregate_segments"],
  );
});

Deno.test("assistant maps an OpenRouter empty response to a dedicated safe error", async () => {
  const controller = new AbortController();
  const error = await assertRejects(
    () =>
      callProviderWithTools(
        provider,
        model,
        [{ role: "user", content: "Resume les changements." }],
        tools,
        "auto",
        "test-key",
        controller.signal,
        () =>
          Promise.resolve(
            new Response(
              JSON.stringify({
                error: { message: "Provider returned an empty response" },
              }),
              { status: 200, headers: { "content-type": "application/json" } },
            ),
          ),
      ),
    Error,
    "Le fournisseur IA n a pas termine la reponse.",
  );
  assertEquals(Reflect.get(error, "code"), "AI_PROVIDER_EMPTY_RESPONSE");
  assertEquals(error.message.includes("Provider returned"), false);
});

Deno.test("assistant normalise un appel outil OpenRouter marque stop", async () => {
  const controller = new AbortController();
  const response = await callProviderWithTools(
    provider,
    model,
    [{ role: "user", content: "Liste les imports." }],
    tools,
    "auto",
    "test-key",
    controller.signal,
    () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            id: "gen-glm-tool-stop",
            model: model.model_id,
            provider: "Novita",
            choices: [{
              finish_reason: "stop",
              native_finish_reason: "stop",
              message: {
                role: "assistant",
                content: null,
                tool_calls: [{
                  id: "call-glm-1",
                  type: "function",
                  function: { name: "list_imports", arguments: '{"page":1}' },
                }],
              },
            }],
            usage: {
              prompt_tokens: 30,
              completion_tokens: 8,
              prompt_tokens_details: { cached_tokens: 0 },
              completion_tokens_details: { reasoning_tokens: 0 },
              cost: 0.00001,
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
  );

  assertEquals(response.finishReason, "tool_calls");
  assertEquals(response.nativeFinishReason, "stop");
  assertEquals(response.toolCalls.length, 1);
});

const tools: OpenRouterToolDefinition[] = [{
  type: "function",
  function: {
    name: "list_imports",
    description: "Liste les imports.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
}];

Deno.test("assistant contract runs one mocked provider tool round then returns a strict response", async () => {
  const requestBodies: Array<Record<string, unknown>> = [];
  let callIndex = 0;
  const fetchMock: typeof fetch = (_input, init) => {
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    requestBodies.push(body);
    callIndex += 1;
    const payload = callIndex === 1
      ? {
        id: "gen-tool-1",
        model: model.model_id,
        provider: "DeepInfra",
        choices: [{
          finish_reason: "tool_calls",
          native_finish_reason: "tool_calls",
          message: {
            role: "assistant",
            content: null,
            tool_calls: [{
              id: "call-1",
              type: "function",
              function: { name: "list_imports", arguments: '{"page":1}' },
            }, {
              id: "call-2",
              type: "function",
              function: { name: "list_imports", arguments: '{"page":2}' },
            }],
          },
        }],
        usage: {
          prompt_tokens: 30,
          completion_tokens: 8,
          total_tokens: 38,
          prompt_tokens_details: { cached_tokens: 0 },
          completion_tokens_details: { reasoning_tokens: 0 },
          cost: 0.00001,
        },
      }
      : {
        id: "gen-final-2",
        model: model.model_id,
        provider: "DeepInfra",
        choices: [{
          finish_reason: "stop",
          native_finish_reason: "stop",
          message: {
            role: "assistant",
            content: "Un import est disponible.",
            tool_calls: [],
          },
        }],
        usage: {
          prompt_tokens: 45,
          completion_tokens: 7,
          total_tokens: 52,
          prompt_tokens_details: { cached_tokens: 0 },
          completion_tokens_details: { reasoning_tokens: 0 },
          cost: 0.00002,
        },
      };
    return Promise.resolve(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
  };
  const controller = new AbortController();
  const result = await runAssistantToolLoop(
    [{ role: "system", content: "Reponds en francais." }, {
      role: "user",
      content: "Liste les imports.",
    }],
    tools,
    (messages, currentTools, toolChoice) =>
      callProviderWithTools(
        provider,
        model,
        messages,
        currentTools,
        toolChoice,
        "test-key",
        controller.signal,
        fetchMock,
      ),
    (_name, args) =>
      Promise.resolve({
        output: {
          ok: true,
          page: args.page,
          total: 1,
          rows: [{ id: "00000000-0000-4000-8000-000000000003" }],
        },
        rowCount: 1,
      }),
  );

  assertEquals(
    result.answer.includes("Aucun résultat métier vérifiable"),
    true,
  );
  assertEquals(result.toolTrace.length, 2);
  assertEquals(result.toolTrace.map((trace) => trace.arguments.page), [1, 2]);
  assertEquals(result.citations.length, 0);
  assertEquals(result.evidence.status, "failed");
  assertEquals(result.usage.inputTokens, 75);
  assertEquals(requestBodies.length, 2);
  assertEquals(Array.isArray(requestBodies[0].tools), true);
  assertEquals(Array.isArray(requestBodies[1].tools), true);
  assertEquals(requestBodies[0].parallel_tool_calls, undefined);
  assertEquals(requestBodies[1].parallel_tool_calls, undefined);
  assertEquals(requestBodies[0].provider, {
    require_parameters: true,
    zdr: true,
    data_collection: "deny",
    allow_fallbacks: true,
    sort: "price",
    max_price: { prompt: 0.075, completion: 0.2 },
  });

  const response = aiAssistantAskResponseSchema.safeParse({
    ok: true,
    request_id: "req-test",
    ai_available: true,
    answer: result.answer,
    citations: result.citations,
    tool_trace: result.toolTrace,
    usage: {
      provider: "openrouter",
      model_id: result.servedModelId,
      input_tokens: result.usage.inputTokens,
      output_tokens: result.usage.outputTokens,
      cached_input_tokens: result.usage.cachedInputTokens,
      reasoning_tokens: result.usage.reasoningTokens,
    },
    cost: { amount: 0.00003, currency: "USD", priced: true },
    fallback_reason: null,
    model_id: result.servedModelId,
    truncated: result.truncated,
  });
  assertEquals(response.success, true);
});

Deno.test("OpenRouter impose ZDR sans collecte et permet de pinner un endpoint", () => {
  assertEquals(
    buildOpenRouterProviderPreferences(model, {
      AI_OPENROUTER_PROVIDER_ORDER: "deepinfra/fp8",
      AI_OPENROUTER_ALLOW_FALLBACKS: "false",
    }),
    {
      require_parameters: true,
      zdr: true,
      data_collection: "deny",
      allow_fallbacks: false,
      order: ["deepinfra/fp8"],
      max_price: { prompt: 0.075, completion: 0.2 },
    },
  );
  assertEquals(
    buildOpenRouterProviderPreferences({
      input_price_per_million: 0.075,
      output_price_per_million: 0.2,
    }, {}),
    {
      require_parameters: true,
      zdr: true,
      data_collection: "deny",
      allow_fallbacks: true,
      sort: "price",
      max_price: { prompt: 0.075, completion: 0.2 },
    },
  );
});

Deno.test("P6 preflight distingue endpoint compatible et endpoint filtre par le cout", async () => {
  const result = await preflightOpenRouterModelEndpoints(
    provider,
    model,
    "test-key",
    () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            data: {
              endpoints: [{
                name: "DeepInfra | Mistral",
                provider_name: "DeepInfra",
                tag: "deepinfra/fp8",
                supported_parameters: ["tools", "temperature"],
                pricing: { prompt: "0.000000075", completion: "0.0000002" },
              }, {
                name: "Mistral | Mistral",
                provider_name: "Mistral",
                tag: "mistral",
                supported_parameters: ["tools"],
                pricing: { prompt: "0.0000001", completion: "0.0000003" },
              }],
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
  );
  assertEquals(result.eligibleProviderTags, ["deepinfra/fp8"]);
  assertEquals(result.endpoints[1].rejectionReasons, [
    "prix_prompt_superieur_au_plafond",
    "prix_completion_superieur_au_plafond",
  ]);
});

Deno.test("P6 recupere apres outil inconnu et arguments invalides sans les executer", async () => {
  let round = 0;
  const result = await runAssistantToolLoop(
    [{ role: "user", content: "Liste les imports." }],
    tools,
    () => {
      round += 1;
      const call = round === 1
        ? { name: "search_imports", arguments: "{}" }
        : round === 2
        ? { name: "list_imports", arguments: "pas-du-json" }
        : { name: "list_imports", arguments: '{"page":1}' };
      return Promise.resolve({
        text: "",
        inputTokens: 10,
        outputTokens: 3,
        cachedInputTokens: 0,
        reasoningTokens: 0,
        providerCostAmount: 0.00001,
        generationId: crypto.randomUUID(),
        modelId: "evaluation/offline",
        provider: "offline",
        finishReason: round <= 3 ? "tool_calls" : "stop",
        nativeFinishReason: round <= 3 ? "tool_calls" : "stop",
        content: round <= 3 ? null : "Un import est disponible.",
        toolCalls: round <= 3
          ? [{
            id: crypto.randomUUID(),
            type: "function" as const,
            function: call,
          }]
          : [],
      });
    },
    () =>
      Promise.resolve({
        output: { ok: true, page: 1, total: 1, rows: [] },
        rowCount: 0,
      }),
  );
  assertEquals(result.toolTrace.map((trace) => trace.executed), [
    false,
    false,
    true,
  ]);
  assertEquals(result.toolTrace.map((trace) => trace.blocked_reason), [
    "tool_not_allowed",
    "invalid_json",
    null,
  ]);
});

Deno.test("P5 valide le compte derive d une liste de huit marques", () => {
  const fact = {
    label: "Nombre de marques correspondantes",
    tool: "search_supplier_categories",
    snapshot_id: "4e216bc4-7d82-4eb7-aa20-2cc8316667cc",
    result_field: "matching_brands",
    source_value: [
      "BONF",
      "FEST",
      "LERO",
      "OPTI",
      "PARK",
      "REXR",
      "ROCK",
      "SIEM",
    ],
    displayed_value: 8,
    derivation: "count" as const,
  };
  assertEquals(aiAssistantEvidenceFactSchema.safeParse(fact).success, true);
  assertEquals(
    aiAssistantEvidenceFactSchema.safeParse({ ...fact, displayed_value: 7 })
      .success,
    false,
  );
  assertEquals(
    aiAssistantEvidenceFactSchema.safeParse({ ...fact, snapshot_id: null })
      .success,
    false,
  );
});

Deno.test("P5 distingue verified partial et failed", () => {
  const execution = {
    tool: "count_supplier_brands",
    ok: true,
    duration_ms: 12,
    row_count: 1,
    snapshot_id: "4e216bc4-7d82-4eb7-aa20-2cc8316667cc",
    requested_filters: {},
    canonical_filters: {},
    server_filters: {},
    sql_attempt: null,
    executed_sql: null,
    error_code: null,
  };
  const fact = {
    label: "Marques",
    tool: "count_supplier_brands",
    snapshot_id: execution.snapshot_id,
    result_field: "distinct_brand_count",
    source_value: 140,
    displayed_value: 140,
    derivation: "direct" as const,
  };
  assertEquals(
    aiAssistantEvidenceSchema.safeParse({
      status: "verified",
      intent: "brand_count",
      dimension: "brand",
      facts: [fact],
      executions: [execution],
    }).success,
    true,
  );
  assertEquals(
    aiAssistantEvidenceSchema.safeParse({
      status: "partial",
      intent: "brand_count",
      dimension: "brand",
      facts: [fact],
      executions: [execution, {
        ...execution,
        ok: false,
        error_code: "AI_TOOL_EXECUTION_FAILED",
      }],
    }).success,
    true,
  );
  assertEquals(
    aiAssistantEvidenceSchema.safeParse({
      status: "failed",
      intent: "brand_count",
      dimension: "brand",
      facts: [],
      executions: [{
        ...execution,
        ok: false,
        error_code: "AI_TOOL_EXECUTION_FAILED",
      }],
    }).success,
    true,
  );
  assertEquals(
    aiAssistantEvidenceSchema.safeParse({
      status: "verified",
      intent: "brand_count",
      dimension: "brand",
      facts: [],
      executions: [execution],
    }).success,
    false,
  );
});

Deno.test("P5 ne publie que le SQL fallback execute", () => {
  const base = {
    tool: "execute_readonly_sql",
    ok: true,
    duration_ms: 20,
    row_count: 1,
    snapshot_id: "4e216bc4-7d82-4eb7-aa20-2cc8316667cc",
    requested_filters: {},
    canonical_filters: {},
    server_filters: { snapshot_id: "4e216bc4-7d82-4eb7-aa20-2cc8316667cc" },
    sql_attempt: 1,
    executed_sql:
      "select count(*) from pricing_supplier_segments where snapshot_id = '4e216bc4-7d82-4eb7-aa20-2cc8316667cc'",
    error_code: null,
  };
  assertEquals(aiAssistantPublicExecutionSchema.safeParse(base).success, true);
  assertEquals(
    aiAssistantPublicExecutionSchema.safeParse({
      ...base,
      ok: false,
      error_code: "AI_SQL_REJECTED",
    }).success,
    false,
  );
  assertEquals(
    aiAssistantPublicExecutionSchema.safeParse({
      ...base,
      tool: "aggregate_segments",
    }).success,
    false,
  );
  assertEquals(
    aiAssistantPublicExecutionSchema.safeParse({
      ...base,
      system_prompt: "secret",
    }).success,
    false,
  );
  assertEquals(
    aiAssistantPublicExecutionSchema.safeParse({
      ...base,
      executed_sql: "x".repeat(12001),
    }).success,
    false,
  );
});

Deno.test("P6 prouve une localisation de schema et conclut sans second appel fragile", async () => {
  let round = 0;
  const result = await runAssistantToolLoop(
    [{ role: "user", content: "Où sont stockées les remises ?" }],
    openRouterToolDefinitions.filter((tool) =>
      tool.function.name === "search_schema"
    ),
    (_messages, _tools, toolChoice) => {
      round += 1;
      return Promise.resolve({
        text: "",
        inputTokens: 10,
        outputTokens: 5,
        cachedInputTokens: 0,
        reasoningTokens: 0,
        providerCostAmount: 0.001,
        generationId: crypto.randomUUID(),
        modelId: "evaluation/offline",
        provider: "offline",
        finishReason: toolChoice === "none" ? "stop" : "tool_calls",
        nativeFinishReason: toolChoice === "none" ? "stop" : "tool_calls",
        content: toolChoice === "none"
          ? "Les remises sont exposées dans ai_v_purchase_terms_active.remise_ha_pct."
          : null,
        toolCalls: toolChoice === "none" ? [] : [{
          id: crypto.randomUUID(),
          type: "function" as const,
          function: {
            name: "search_schema",
            arguments: JSON.stringify({ terms: ["remise"] }),
          },
        }],
      });
    },
    () =>
      Promise.resolve({
        output: {
          ok: true,
          snapshot_id: "4e216bc4-7d82-4eb7-aa20-2cc8316667cc",
          terms: ["remise"],
          total_columns: 1,
          table_names: ["ai_v_purchase_terms_active"],
          column_names: ["ai_v_purchase_terms_active.remise_ha_pct"],
          tables: [],
        },
        rowCount: 1,
      }),
  );

  assertEquals(round, 1);
  assertEquals(result.evidence.status, "verified");
  assertEquals(result.citations.length, 1);
  assertEquals(
    result.answer,
    "Tables pertinentes : ai_v_purchase_terms_active. Colonnes pertinentes : ai_v_purchase_terms_active.remise_ha_pct.",
  );
});

Deno.test("P6 prouve les cellules primitives d un resultat SQL borne", async () => {
  let round = 0;
  const result = await runAssistantToolLoop(
    [{ role: "user", content: "Top remises FEST" }],
    openRouterToolDefinitions.filter((tool) =>
      tool.function.name === "execute_readonly_sql"
    ),
    (_messages, _tools, _toolChoice) => {
      round += 1;
      return Promise.resolve({
        text: "",
        inputTokens: 10,
        outputTokens: 5,
        cachedInputTokens: 0,
        reasoningTokens: 0,
        providerCostAmount: 0.001,
        generationId: crypto.randomUUID(),
        modelId: "evaluation/offline",
        provider: "offline",
        finishReason: round === 2 ? "stop" : "tool_calls",
        nativeFinishReason: round === 2 ? "stop" : "tool_calls",
        content: round === 2 ? "Le top est A à 42 %." : null,
        toolCalls: round === 2 ? [] : [{
          id: crypto.randomUUID(),
          type: "function" as const,
          function: {
            name: "execute_readonly_sql",
            arguments: JSON.stringify({
              sql:
                "select cat_fab, remise_ha_pct from public.ai_v_purchase_terms_active where marque = 'FEST' limit 1",
              purpose: "Classer les remises FEST",
            }),
          },
        }],
      });
    },
    () =>
      Promise.resolve({
        output: {
          ok: true,
          snapshot_id: "4e216bc4-7d82-4eb7-aa20-2cc8316667cc",
          columns: ["cat_fab", "remise_ha_pct"],
          rows: [{ cat_fab: "A", remise_ha_pct: 42 }],
          truncated: false,
          execution_ms: 1,
        },
        rowCount: 1,
      }),
  );

  assertEquals(round, 2);
  assertEquals(result.evidence.status, "verified");
  assertEquals(result.evidence.facts.length, 2);
  assertEquals(result.answer, "Le top est A à 42 %.");
});

Deno.test("P6 remplace une conclusion provider non prouvee par les faits structures", async () => {
  let round = 0;
  const result = await runAssistantToolLoop(
    [{ role: "user", content: "Trie par une colonne financière brute." }],
    openRouterToolDefinitions.filter((tool) =>
      ["search_schema", "execute_readonly_sql"].includes(tool.function.name)
    ),
    () => {
      round += 1;
      return Promise.resolve({
        text: "",
        inputTokens: 10,
        outputTokens: 5,
        cachedInputTokens: 0,
        reasoningTokens: 0,
        providerCostAmount: 0.001,
        generationId: crypto.randomUUID(),
        modelId: "evaluation/offline",
        provider: "offline",
        finishReason: round === 2 ? "stop" : "tool_calls",
        nativeFinishReason: round === 2 ? "stop" : "tool_calls",
        content: round === 2
          ? "Requête SQL exécutée : le résultat financier est 999."
          : null,
        toolCalls: round === 2 ? [] : [{
          id: crypto.randomUUID(),
          type: "function" as const,
          function: {
            name: "search_schema",
            arguments: JSON.stringify({ terms: ["remise_ha"] }),
          },
        }],
      });
    },
    () =>
      Promise.resolve({
        output: {
          ok: true,
          snapshot_id: "4e216bc4-7d82-4eb7-aa20-2cc8316667cc",
          terms: ["remise_ha"],
          total_columns: 1,
          table_names: ["ai_v_purchase_terms_active"],
          column_names: ["ai_v_purchase_terms_active.remise_ha_pct"],
          tables: [],
        },
        rowCount: 1,
      }),
  );

  assertEquals(result.evidence.status, "verified");
  assertEquals(result.answer.includes("999"), false);
  assertEquals(result.answer.includes("SQL exécutée"), false);
  assertEquals(result.answer.includes("Résultat vérifié"), true);
});

Deno.test("P6 rend le classement de remise borne depuis la sortie validee", async () => {
  let calls = 0;
  const result = await runAssistantToolLoop(
    [{ role: "user", content: "Top 3 CAT_FAB de FEST par remise d'achat" }],
    openRouterToolDefinitions.filter((tool) =>
      tool.function.name === "rank_purchase_terms"
    ),
    () => {
      calls += 1;
      return Promise.resolve({
        text: "",
        inputTokens: 10,
        outputTokens: 5,
        cachedInputTokens: 0,
        reasoningTokens: 0,
        providerCostAmount: 0.001,
        generationId: crypto.randomUUID(),
        modelId: "evaluation/offline",
        provider: "offline",
        finishReason: "tool_calls",
        nativeFinishReason: "tool_calls",
        content: null,
        toolCalls: [{
          id: crypto.randomUUID(),
          type: "function" as const,
          function: {
            name: "rank_purchase_terms",
            arguments: JSON.stringify({ marque: "FEST", limit: 3 }),
          },
        }],
      });
    },
    () =>
      Promise.resolve({
        output: {
          ok: true,
          data: {
            snapshot_id: "4e216bc4-7d82-4eb7-aa20-2cc8316667cc",
            marque: "FEST",
            metric: "remise_ha_pct",
            direction: "desc",
            top_cat_fab: ["A", "B", "C"],
            top_remise_pct: [83.333, 80, 75.5],
            rows: [
              { cat_fab: "A", cat_fab_l: "Alpha", remise_ha_pct: 83.333 },
              { cat_fab: "B", cat_fab_l: null, remise_ha_pct: 80 },
              { cat_fab: "C", cat_fab_l: "Charlie", remise_ha_pct: 75.5 },
            ],
          },
        },
        rowCount: 3,
      }),
  );

  assertEquals(calls, 1);
  assertEquals(result.evidence.status, "verified");
  assertEquals(result.citations.length, 1);
  assertEquals(
    result.answer,
    "Top 3 CAT_FAB de FEST par remise d'achat : 1. A — Alpha : 83,333 % ; 2. B : 80 % ; 3. C — Charlie : 75,5 %.",
  );
});
