import { test } from "vitest";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { z } from "zod/v4";
import { assertEquals, assertRejects } from "#test/assert";

import { createAiSdkAgentRuntime } from "./aiSdkRuntime.ts";
import { createDeterministicAgentRuntime } from "./deterministicRuntime.ts";
import { createCirDirectProviderRegistry } from "./providerRegistry.ts";

const resultSchema = z.strictObject({
  summary: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

const validOutput = { summary: "RAS", confidence: 0.4 };

const mockUsage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 20, text: 20, reasoning: undefined },
};

test("deterministic runtime returns a valid structured object", async () => {
  const runtime = createDeterministicAgentRuntime({ output: validOutput });
  const result = await runtime.runStructured({
    provider: "mistral",
    modelId: "mistral-small-latest",
    credentials: { apiKey: "test" },
    prompt: "facts",
    schema: resultSchema,
    timeoutMs: 1_000,
  });
  assertEquals(result.output, validOutput);
  assertEquals(result.finishReason, "stop");
});

test("deterministic runtime rejects an invalid structured object", async () => {
  const runtime = createDeterministicAgentRuntime({
    output: { summary: "broken" } as never,
  });
  const error = await assertRejects(() =>
    runtime.runStructured({
      provider: "mistral",
      modelId: "mistral-small-latest",
      credentials: { apiKey: "test" },
      prompt: "facts",
      schema: resultSchema,
      timeoutMs: 1_000,
    })
  );
  assertEquals(Reflect.get(error, "code"), "AI_RESPONSE_INVALID");
});

test("deterministic runtime times out an async output that exceeds the budget", async () => {
  const runtime = createDeterministicAgentRuntime({
    output: () =>
      new Promise((resolve) => {
        setTimeout(() => resolve(validOutput), 50);
      }),
  });
  const error = await assertRejects(() =>
    runtime.runStructured({
      provider: "mistral",
      modelId: "mistral-small-latest",
      credentials: { apiKey: "test" },
      prompt: "facts",
      schema: resultSchema,
      timeoutMs: 5,
    })
  );
  assertEquals(Reflect.get(error, "code"), "AI_TIMEOUT");
});

test("deterministic runtime times out when the delay exceeds the budget", async () => {
  const runtime = createDeterministicAgentRuntime({
    output: validOutput,
    delayMs: 50,
  });
  const error = await assertRejects(() =>
    runtime.runStructured({
      provider: "mistral",
      modelId: "mistral-small-latest",
      credentials: { apiKey: "test" },
      prompt: "facts",
      schema: resultSchema,
      timeoutMs: 5,
    })
  );
  assertEquals(Reflect.get(error, "code"), "AI_TIMEOUT");
});

test("AI SDK adapter uses generateText + Output.object on a direct model instance", async () => {
  const seen: unknown[] = [];
  const runtime = createAiSdkAgentRuntime({
    registry: createCirDirectProviderRegistry({
      mistral: (_credentials, modelId) =>
        new MockLanguageModelV4({
          provider: "mistral.chat",
          modelId,
          doGenerate: async () => ({
            content: [{ type: "text", text: JSON.stringify(validOutput) }],
            finishReason: { unified: "stop", raw: undefined },
            usage: mockUsage,
            warnings: [],
          }),
        }),
    }),
    generateText: async (options) => {
      seen.push({
        modelType: typeof options.model,
        hasOutput: Boolean(options.output),
        timeout: options.timeout,
      });
      return generateText(options);
    },
  });

  const result = await runtime.runStructured({
    provider: "mistral",
    modelId: "mistral-small-latest",
    credentials: { apiKey: "sk-test" },
    prompt: "Generate a diagnosis.",
    schema: resultSchema,
    timeoutMs: 2_000,
  });

  assertEquals(result.output, validOutput);
  assertEquals(result.usage.inputTokens, 10);
  assertEquals(result.usage.outputTokens, 20);
  assertEquals(seen[0], {
    modelType: "object",
    hasOutput: true,
    timeout: 2_000,
  });
});

test("AI SDK adapter maps an invalid structured payload without house JSON parsing", async () => {
  const runtime = createAiSdkAgentRuntime({
    registry: createCirDirectProviderRegistry({
      mistral: () =>
        new MockLanguageModelV4({
          doGenerate: async () => ({
            content: [{ type: "text", text: "not-json" }],
            finishReason: { unified: "stop", raw: undefined },
            usage: mockUsage,
            warnings: [],
          }),
        }),
    }),
  });

  const error = await assertRejects(() =>
    runtime.runStructured({
      provider: "mistral",
      modelId: "mistral-small-latest",
      credentials: { apiKey: "sk-test" },
      prompt: "Generate a diagnosis.",
      schema: resultSchema,
      timeoutMs: 2_000,
    })
  );
  assertEquals(Reflect.get(error, "code"), "AI_RESPONSE_INVALID");
  assertEquals(NoObjectGeneratedError.isInstance(error), false);
});

test("AI SDK adapter refuses OpenRouter instead of building a gateway model", async () => {
  const runtime = createAiSdkAgentRuntime();
  const error = await assertRejects(() =>
    runtime.runStructured({
      provider: "openrouter",
      modelId: "openai/gpt-4.1",
      credentials: { apiKey: "sk-test" },
      prompt: "x",
      schema: resultSchema,
      timeoutMs: 1_000,
    })
  );
  assertEquals(Reflect.get(error, "code"), "AI_CONFIG_MISSING");
});

test("Output.object is the official structured-output specification", () => {
  const spec = Output.object({ schema: resultSchema });
  assertEquals(typeof spec, "object");
});
