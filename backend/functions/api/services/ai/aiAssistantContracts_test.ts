import { assertEquals, assertRejects } from "std/assert";

import { aiAssistantAskResponseSchema } from "../../../../../shared/schemas/aiAssistant.schema.ts";
import {
  callProviderWithTools,
  type ModelRow,
  type OpenRouterToolDefinition,
  type ProviderRow,
} from "./aiGovernance.ts";
import {
  getAmbiguousFamilyClarification,
  getSegmentCountIntent,
  runAssistantToolLoop,
  selectAssistantTools,
} from "./assistantBroker.ts";

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

  assertEquals(result.answer, "Un import est disponible.");
  assertEquals(result.toolTrace.length, 2);
  assertEquals(result.toolTrace.map((trace) => trace.arguments.page), [1, 2]);
  assertEquals(result.citations.length, 2);
  assertEquals(result.usage.inputTokens, 75);
  assertEquals(requestBodies.length, 2);
  assertEquals(Array.isArray(requestBodies[0].tools), true);
  assertEquals(Array.isArray(requestBodies[1].tools), true);
  assertEquals(requestBodies[0].parallel_tool_calls, undefined);
  assertEquals(requestBodies[1].parallel_tool_calls, undefined);
  assertEquals(requestBodies[0].provider, {
    require_parameters: true,
    allow_fallbacks: false,
    data_collection: "deny",
    zdr: true,
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
