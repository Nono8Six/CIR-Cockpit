import { assert, assertEquals, assertRejects } from "std/assert";

import {
  callMistralWithTools,
  decideMistralRetry,
  getMistralDiagnostic,
  MISTRAL_API_BASE_URL,
  type MistralAdapterDependencies,
  type MistralMessage,
  type MistralToolDefinition,
  parseMistralRetryAfter,
  prepareMistralModelsPreflight,
} from "./mistralAdapter.ts";

const model = {
  model_id: "mistral-large-2512",
  temperature: "0.20",
  max_output_tokens: 2000,
};
const messages: MistralMessage[] = [{ role: "user", content: "Question" }];
const tools: MistralToolDefinition[] = [{
  type: "function",
  function: {
    name: "search_schema",
    description: "Recherche le schema autorise.",
    parameters: { type: "object", properties: {} },
  },
}];
const correlation = {
  requestId: "req-public",
  clientRequestId: "00000000-0000-4000-8000-000000000001",
  assistantRunId: "00000000-0000-4000-8000-000000000002",
};

const successBody = (overrides: Record<string, unknown> = {}) => ({
  id: "cmpl-1",
  object: "chat.completion",
  model: model.model_id,
  choices: [{
    index: 0,
    finish_reason: "stop",
    message: { role: "assistant", content: "Reponse sourcée.", tool_calls: [] },
  }],
  usage: { prompt_tokens: 12, completion_tokens: 5, total_tokens: 17 },
  ...overrides,
});

const response = (
  body: unknown,
  status = 200,
  headers: HeadersInit = { "content-type": "application/json" },
): Response =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers,
  });

const errorCode = (error: unknown): string | undefined =>
  error instanceof Error && typeof Reflect.get(error, "code") === "string"
    ? Reflect.get(error, "code")
    : undefined;

const errorStatus = (error: unknown): number | undefined =>
  error instanceof Error && typeof Reflect.get(error, "status") === "number"
    ? Reflect.get(error, "status")
    : undefined;

const call = (
  fetchImpl: typeof fetch,
  options: {
    signal?: AbortSignal;
    deadlineMs?: number;
    now?: () => number;
    random?: () => number;
    sleep?: MistralAdapterDependencies["sleep"];
    createId?: () => string;
    correlationSuffix?: string;
  } = {},
) => {
  const controller = new AbortController();
  return callMistralWithTools(
    model,
    messages,
    tools,
    "auto",
    "mistral-test-key",
    options.signal ?? controller.signal,
    {
      ...correlation,
      clientRequestId: `${correlation.clientRequestId}${
        options.correlationSuffix ?? ""
      }`,
    },
    options.deadlineMs ?? 10_000,
    {
      fetch: fetchImpl,
      now: options.now ?? (() => 0),
      random: options.random ?? (() => 0),
      sleep: options.sleep ?? (() => Promise.resolve()),
      createId: options.createId ?? (() => "attempt-1"),
    },
  );
};

Deno.test("Mistral preflight prepares GET /v1/models with Bearer token", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const result = await prepareMistralModelsPreflight(
    "secret-test",
    new AbortController().signal,
    (url, init) => {
      capturedUrl = String(url);
      capturedInit = init;
      return Promise.resolve(response({ data: [{ id: model.model_id }] }));
    },
  );
  assertEquals(capturedUrl, `${MISTRAL_API_BASE_URL}/models`);
  assertEquals(capturedInit?.method, "GET");
  assertEquals(
    new Headers(capturedInit?.headers).get("authorization"),
    "Bearer secret-test",
  );
  assertEquals(result.modelIds, [model.model_id]);
});

Deno.test("Mistral sends its minimal REST payload without OpenRouter preferences", async () => {
  let requestBody: Record<string, unknown> = {};
  let requestHeaders = new Headers();
  const result = await call((url, init) => {
    assertEquals(String(url), `${MISTRAL_API_BASE_URL}/chat/completions`);
    requestBody = JSON.parse(String(init?.body));
    requestHeaders = new Headers(init?.headers);
    return Promise.resolve(response(successBody()));
  });
  assertEquals(requestHeaders.get("authorization"), "Bearer mistral-test-key");
  assertEquals(requestBody.parallel_tool_calls, false);
  assertEquals(requestBody.temperature, 0.2);
  assertEquals(requestBody.provider, undefined);
  assertEquals(result.content, "Reponse sourcée.");
  assertEquals(result.inputTokens, 12);
  assertEquals(result.outputTokens, 5);
  assertEquals(result.providerCostAmount, null);
});

Deno.test("Mistral accepts string and text segment content", async () => {
  const stringResult = await call(
    () => Promise.resolve(response(successBody())),
    {
      correlationSuffix: "-string",
    },
  );
  const segmentResult = await call(() =>
    Promise.resolve(response(successBody({
      choices: [{
        finish_reason: "stop",
        message: {
          role: "assistant",
          content: [{ type: "text", text: "Premier" }, {
            type: "text",
            text: "Second",
          }],
        },
      }],
    }))), { correlationSuffix: "-segments" });
  assertEquals(stringResult.content, "Reponse sourcée.");
  assertEquals(segmentResult.content, "Premier\nSecond");
});

Deno.test("Mistral parses tool calls and preserves tool_call_id on reinjection", async () => {
  const bodies: Array<Record<string, unknown>> = [];
  let round = 0;
  const fetchImpl: typeof fetch = (_url, init) => {
    bodies.push(JSON.parse(String(init?.body)));
    round += 1;
    return Promise.resolve(response(
      round === 1
        ? successBody({
          choices: [{
            finish_reason: "tool_calls",
            message: {
              role: "assistant",
              content: null,
              tool_calls: [{
                id: "call-exact",
                type: "function",
                function: {
                  name: "search_schema",
                  arguments: '{"terms":["FEST"]}',
                },
              }],
            },
          }],
        })
        : successBody(),
    ));
  };
  const first = await call(fetchImpl, { correlationSuffix: "-tool-1" });
  assertEquals(first.finishReason, "tool_calls");
  assertEquals(first.toolCalls[0].id, "call-exact");
  const reinjected: MistralMessage[] = [
    ...messages,
    { role: "assistant", content: first.content, tool_calls: first.toolCalls },
    {
      role: "tool",
      name: "search_schema",
      tool_call_id: first.toolCalls[0].id,
      content: '{"ok":true}',
    },
  ];
  await callMistralWithTools(
    model,
    reinjected,
    tools,
    "auto",
    "key",
    new AbortController().signal,
    {
      ...correlation,
      clientRequestId: `${correlation.clientRequestId}-tool-2`,
    },
    10_000,
    { fetch: fetchImpl, now: () => 0, createId: () => `attempt-${round + 1}` },
  );
  const sentMessages = bodies[1].messages as Array<Record<string, unknown>>;
  assertEquals(sentMessages.at(-1)?.tool_call_id, "call-exact");
});

Deno.test("Mistral supports successive tool calls before a final response", async () => {
  const fixtures = ["one", "two"].map((id) =>
    successBody({
      choices: [{
        finish_reason: "tool_calls",
        message: {
          role: "assistant",
          content: null,
          tool_calls: [{
            id,
            type: "function",
            function: {
              name: "search_schema",
              arguments: `{\"round\":\"${id}\"}`,
            },
          }],
        },
      }],
    })
  );
  fixtures.push(successBody());
  const history = [...messages];
  for (let index = 0; index < fixtures.length; index += 1) {
    const result = await callMistralWithTools(
      model,
      history,
      tools,
      "auto",
      "key",
      new AbortController().signal,
      {
        ...correlation,
        clientRequestId: `${correlation.clientRequestId}-successive-${index}`,
      },
      10_000,
      { fetch: () => Promise.resolve(response(fixtures[index])), now: () => 0 },
    );
    if (result.toolCalls.length > 0) {
      history.push({
        role: "assistant",
        content: null,
        tool_calls: result.toolCalls,
      });
      history.push({
        role: "tool",
        tool_call_id: result.toolCalls[0].id,
        name: result.toolCalls[0].function.name,
        content: '{"ok":true}',
      });
    } else {
      assertEquals(result.content, "Reponse sourcée.");
    }
  }
});

Deno.test("Mistral normalizes complete, partial and absent usage", async () => {
  const complete = await call(() => Promise.resolve(response(successBody())), {
    correlationSuffix: "-usage-full",
  });
  const partial = await call(() =>
    Promise.resolve(response(successBody({
      usage: { prompt_tokens: 8 },
    }))), { correlationSuffix: "-usage-partial" });
  const absent = await call(
    () => Promise.resolve(response(successBody({ usage: undefined }))),
    { correlationSuffix: "-usage-none" },
  );
  assertEquals(complete.usageEstimated, false);
  assertEquals(partial.inputTokens, 8);
  assertEquals(partial.outputTokens > 0, true);
  assertEquals(partial.usageEstimated, true);
  assertEquals(absent.inputTokens > 0, true);
  assertEquals(absent.outputTokens > 0, true);
  assertEquals(absent.usageEstimated, true);
});

Deno.test("Retry-After accepts delta seconds and HTTP dates within the public bound", () => {
  assertEquals(parseMistralRetryAfter("2", 0), 2000);
  assertEquals(
    parseMistralRetryAfter(new Date(3_000).toUTCString(), 1_000),
    2000,
  );
  for (
    const invalid of [null, "", "-1", "NaN", "Infinity", "301", "invalid-date"]
  ) {
    assertEquals(parseMistralRetryAfter(invalid, 0), undefined);
  }
});

Deno.test("Mistral retry policy is pure, bounded and limited to one retry", () => {
  const base = {
    category: "unavailable" as const,
    externalStatus: 503,
    hasHttpResponse: true,
    attempt: 0,
    remainingMs: 10_000,
    knownCostOrTokens: false,
    signalAborted: false,
  };
  assertEquals(decideMistralRetry(base, () => 0.5), {
    retry: true,
    delayMs: 625,
    reason: "transient",
  });
  assertEquals(
    decideMistralRetry({ ...base, attempt: 1 }, () => 0).retry,
    false,
  );
  assertEquals(
    decideMistralRetry({ ...base, remainingMs: 500 }, () => 0).reason,
    "budget_exhausted",
  );
  assertEquals(
    decideMistralRetry({ ...base, category: "timeout" }, () => 0).retry,
    false,
  );
  assertEquals(
    decideMistralRetry({ ...base, category: "contract" }, () => 0).retry,
    false,
  );
});

for (
  const [status, code, publicStatus] of [
    [400, "AI_PROVIDER_CONTRACT_INVALID", 502],
    [401, "AI_PROVIDER_AUTH_FAILED", 502],
    [402, "AI_PROVIDER_BILLING_REQUIRED", 502],
    [403, "AI_PROVIDER_AUTH_FAILED", 502],
    [404, "AI_PROVIDER_CONTRACT_INVALID", 502],
    [409, "AI_PROVIDER_CONTRACT_INVALID", 502],
    [422, "AI_PROVIDER_CONTRACT_INVALID", 502],
    [504, "AI_TIMEOUT", 504],
  ] as const
) {
  Deno.test(`Mistral maps HTTP ${status} to ${code} without automatic retry`, async () => {
    let calls = 0;
    const caught = await call(() => {
      calls += 1;
      return Promise.resolve(
        response(
          {
            object: "error",
            message: "secret provider body",
            type: "invalid_request_error",
            param: "model",
            code: "provider_code",
          },
          status,
          { "x-request-id": "mistral-external-id" },
        ),
      );
    }, { correlationSuffix: `-http-${status}` }).catch((error) => error);
    assertEquals(errorCode(caught), code);
    assertEquals(errorStatus(caught), publicStatus);
    assertEquals(calls, 1);
    const diag = getMistralDiagnostic(caught);
    assertEquals(diag?.providerRequestId, "mistral-external-id");
    assertEquals(diag?.providerCode, "provider_code");
    assertEquals(
      JSON.stringify(caught).includes("secret provider body"),
      false,
    );
  });
}

for (const status of [500, 502, 503] as const) {
  Deno.test(`Mistral retries HTTP ${status} once and then returns unavailable`, async () => {
    let calls = 0;
    const caught = await call(() => {
      calls += 1;
      return Promise.resolve(
        response({ object: "error", type: "server_error" }, status),
      );
    }, { correlationSuffix: `-retry-${status}` }).catch((error) => error);
    assertEquals(errorCode(caught), "AI_PROVIDER_UNAVAILABLE");
    assertEquals(calls, 2);
  });
}

Deno.test("Mistral retries 429 without Retry-After with deterministic jitter", async () => {
  const delays: number[] = [];
  let calls = 0;
  const result = await call(() => {
    calls += 1;
    return Promise.resolve(
      calls === 1
        ? response({ object: "error", type: "rate_limit_error" }, 429)
        : response(successBody()),
    );
  }, {
    correlationSuffix: "-429-fallback",
    random: () => 0.4,
    sleep: (delay) => {
      delays.push(delay);
      return Promise.resolve();
    },
  });
  assertEquals(calls, 2);
  assertEquals(delays, [1100]);
  assertEquals(result.retryCount, 1);
});

Deno.test("Mistral honors valid Retry-After and exposes it when budget is too short", async () => {
  const delays: number[] = [];
  let calls = 0;
  await call(() => {
    calls += 1;
    return Promise.resolve(
      calls === 1
        ? response({ object: "error" }, 429, { "retry-after": "2" })
        : response(successBody()),
    );
  }, {
    correlationSuffix: "-429-valid",
    sleep: (delay) => {
      delays.push(delay);
      return Promise.resolve();
    },
  });
  assertEquals(delays, [2000]);

  const caught = await call(
    () =>
      Promise.resolve(
        response({ object: "error" }, 429, { "retry-after": "2" }),
      ),
    { correlationSuffix: "-429-budget", deadlineMs: 1500 },
  ).catch((error) => error);
  assertEquals(errorCode(caught), "AI_PROVIDER_RATE_LIMITED");
  assertEquals(Reflect.get(caught, "retryAfterMs"), 2000);
});

Deno.test("Mistral ignores invalid or over-bound Retry-After consistently", async () => {
  for (const value of ["invalid", "301"]) {
    const delays: number[] = [];
    let calls = 0;
    await call(() => {
      calls += 1;
      return Promise.resolve(
        calls === 1
          ? response({ object: "error" }, 429, { "retry-after": value })
          : response(successBody()),
      );
    }, {
      correlationSuffix: `-invalid-retry-${value}`,
      sleep: (delay) => {
        delays.push(delay);
        return Promise.resolve();
      },
    });
    assertEquals(delays, [1000]);
  }
});

Deno.test("Mistral does not retry a network rejection without proof that sending was safe", async () => {
  let calls = 0;
  const caught = await call(() => {
    calls += 1;
    return Promise.reject(new TypeError("network details"));
  }, { correlationSuffix: "-network" }).catch((error) => error);
  assertEquals(errorCode(caught), "AI_PROVIDER_UNAVAILABLE");
  assertEquals(calls, 1);
  assertEquals(
    getMistralDiagnostic(caught)?.cause,
    "transport_without_response",
  );
});

Deno.test("Mistral distinguishes abort before send and abort during fetch", async () => {
  const beforeController = new AbortController();
  beforeController.abort();
  let calls = 0;
  const before = await call(() => {
    calls += 1;
    return Promise.resolve(response(successBody()));
  }, { signal: beforeController.signal, correlationSuffix: "-abort-before" })
    .catch((error) => error);
  assertEquals(errorCode(before), "AI_TIMEOUT");
  assertEquals(calls, 0);
  assertEquals(getMistralDiagnostic(before)?.cause, "aborted_before_send");

  const duringController = new AbortController();
  const during = await call((_url, _init) => {
    duringController.abort();
    return Promise.reject(new DOMException("aborted", "AbortError"));
  }, { signal: duringController.signal, correlationSuffix: "-abort-during" })
    .catch((error) => error);
  assertEquals(errorCode(during), "AI_TIMEOUT");
  assertEquals(
    getMistralDiagnostic(during)?.cause,
    "abort_after_send_possible",
  );
});

Deno.test("Mistral cancellation during backoff stops before a second fetch", async () => {
  const controller = new AbortController();
  let calls = 0;
  const caught = await call(() => {
    calls += 1;
    return Promise.resolve(response({ object: "error" }, 503));
  }, {
    signal: controller.signal,
    correlationSuffix: "-abort-backoff",
    sleep: () => {
      controller.abort();
      return Promise.reject(new DOMException("aborted", "AbortError"));
    },
  }).catch((error) => error);
  assertEquals(errorCode(caught), "AI_TIMEOUT");
  assertEquals(calls, 1);
  assertEquals(getMistralDiagnostic(caught)?.cause, "aborted_during_backoff");
});

for (
  const [name, fixture, code] of [
    ["malformed JSON", "{broken", "AI_PROVIDER_CONTRACT_INVALID"],
    ["HTML body", "<html>failure</html>", "AI_PROVIDER_CONTRACT_INVALID"],
    ["empty body", "", "AI_PROVIDER_EMPTY_RESPONSE"],
    [
      "empty choices",
      { ...successBody(), choices: [] },
      "AI_PROVIDER_EMPTY_RESPONSE",
    ],
    ["missing message", {
      ...successBody(),
      choices: [{ finish_reason: "stop" }],
    }, "AI_PROVIDER_CONTRACT_INVALID"],
    ["unsupported content", {
      ...successBody(),
      choices: [{
        finish_reason: "stop",
        message: {
          role: "assistant",
          content: [{ type: "image", image: "x" }],
        },
      }],
    }, "AI_PROVIDER_CONTRACT_INVALID"],
    ["malformed tool_calls", {
      ...successBody(),
      choices: [{
        finish_reason: "tool_calls",
        message: {
          role: "assistant",
          content: null,
          tool_calls: [{ id: "x" }],
        },
      }],
    }, "AI_PROVIDER_CONTRACT_INVALID"],
    ["invalid tool arguments", {
      ...successBody(),
      choices: [{
        finish_reason: "tool_calls",
        message: {
          role: "assistant",
          content: null,
          tool_calls: [{
            id: "x",
            type: "function",
            function: { name: "search_schema", arguments: "not-json" },
          }],
        },
      }],
    }, "AI_TOOL_ARGUMENTS_INVALID"],
    ["unknown finish reason", {
      ...successBody(),
      choices: [{
        finish_reason: "future_reason",
        message: { role: "assistant", content: "text" },
      }],
    }, "AI_PROVIDER_CONTRACT_INVALID"],
    ["missing finish reason", {
      ...successBody(),
      choices: [{ message: { role: "assistant", content: "text" } }],
    }, "AI_PROVIDER_CONTRACT_INVALID"],
    [
      "different served model",
      successBody({ model: "mistral-large-latest" }),
      "AI_PROVIDER_CONTRACT_INVALID",
    ],
  ] as const
) {
  Deno.test(`Mistral rejects ${name} without plausible fallback`, async () => {
    const caught = await call(() => Promise.resolve(response(fixture)), {
      correlationSuffix: `-contract-${name}`,
    }).catch((error) => error);
    assertEquals(errorCode(caught), code);
  });
}

Deno.test("Mistral rejects unusable business finish reasons without provider retry", async () => {
  for (const finishReason of ["content_filter", "error"]) {
    let calls = 0;
    const caught = await call(() => {
      calls += 1;
      return Promise.resolve(response(successBody({
        choices: [{
          finish_reason: finishReason,
          message: { role: "assistant", content: "blocked" },
        }],
      })));
    }, { correlationSuffix: `-finish-${finishReason}` }).catch((error) =>
      error
    );
    assertEquals(errorCode(caught), "AI_RESPONSE_INVALID");
    assertEquals(calls, 1);
  }
});

Deno.test("Mistral prevents two concurrent calls for one client_request_id", async () => {
  let resolveFirst: ((value: Response) => void) | undefined;
  const pending = new Promise<Response>((resolve) => {
    resolveFirst = resolve;
  });
  const first = call(() => pending, { correlationSuffix: "-concurrent" });
  const second = await call(() => Promise.resolve(response(successBody())), {
    correlationSuffix: "-concurrent",
  }).catch((error) => error);
  assertEquals(errorCode(second), "CONFLICT");
  resolveFirst?.(response(successBody()));
  await first;
});

Deno.test("Mistral public errors never contain provider canaries", async () => {
  const canaries = [
    "Bearer secret-token",
    "sk-mistral-fake",
    "raw-provider-body",
    "stack: private-stack",
    "<html>private</html>",
    "external-request-secret",
    "sensitive-param",
  ];
  const caught = await call(() =>
    Promise.resolve(response(
      {
        object: "error",
        message: canaries.join(" | "),
        type: "invalid_request_error",
        param: "sensitive-param",
        code: "raw-provider-body",
      },
      400,
      { "x-request-id": "external-request-secret" },
    )), {
    correlationSuffix: "-redaction",
  }).catch((error) => error);
  const publicProjection = JSON.stringify({
    code: errorCode(caught),
    status: errorStatus(caught),
    message: caught instanceof Error ? caught.message : "",
    details: caught instanceof Error
      ? Reflect.get(caught, "details")
      : undefined,
  });
  for (const canary of canaries) {
    assertEquals(publicProjection.includes(canary), false);
  }
  const diag = getMistralDiagnostic(caught);
  assertEquals(diag?.providerRequestId, "external-request-secret");
  assertEquals(diag?.providerParam, "sensitive-param");
  assert(diag?.attemptId);
});

Deno.test("Mistral failed retry remains bounded to two total attempts", async () => {
  let calls = 0;
  const caught = await call(() => {
    calls += 1;
    return Promise.resolve(response({ object: "error" }, 503));
  }, { correlationSuffix: "-failed-retry" }).catch((error) => error);
  assertRejects(() => Promise.reject(caught));
  assertEquals(calls, 2);
});
