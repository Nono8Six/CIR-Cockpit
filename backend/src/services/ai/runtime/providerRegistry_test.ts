import { test } from "vitest";
import { assertEquals, assertThrows } from "#test/assert";

import {
  assertDirectProvider,
  assertDirectProviderEndpoint,
  createCirDirectProviderRegistry,
  isCirDirectProviderId,
} from "./providerRegistry.ts";

test("the CIR registry starts with mistral as the only direct provider", () => {
  const registry = createCirDirectProviderRegistry();
  assertEquals(registry.ids(), ["mistral"]);
  assertEquals(registry.has("mistral"), true);
  assertEquals(registry.has("openrouter"), false);
  assertEquals(isCirDirectProviderId("openrouter"), false);
});

test("the CIR registry rejects OpenRouter and gateway-style providers", () => {
  const error = assertThrows(
    () => assertDirectProvider("openrouter"),
    Error,
    "provider AI SDK direct",
  );
  assertEquals(Reflect.get(error, "code"), "AI_CONFIG_MISSING");
});

test("adding another direct factory does not require rewriting the vertical", () => {
  const created: string[] = [];
  const registry = createCirDirectProviderRegistry({
    mistral: (credentials, modelId) => {
      created.push(`${credentials.apiKey}:${modelId}`);
      return {
        specificationVersion: "v4",
        provider: "mistral.chat",
        modelId,
      } as never;
    },
  });
  const model = registry.createModel("mistral", { apiKey: "sk-test" }, "mistral-small-latest");
  assertEquals(created, ["sk-test:mistral-small-latest"]);
  assertEquals(typeof model === "string", false);
});

test("a custom or gateway base URL is rejected before createMistral", () => {
  const error = assertThrows(
    () =>
      assertDirectProviderEndpoint("mistral", "https://openrouter.ai/api/v1"),
    Error,
    "exactement https://api.mistral.ai/v1",
  );
  assertEquals(Reflect.get(error, "code"), "AI_CONFIG_MISSING");
  const factoryError = assertThrows(
    () =>
      createCirDirectProviderRegistry().createModel(
        "mistral",
        { apiKey: "sk-test", baseUrl: "https://proxy.example/v1" },
        "mistral-small-latest",
      ),
    Error,
    "exactement https://api.mistral.ai/v1",
  );
  assertEquals(Reflect.get(factoryError, "code"), "AI_CONFIG_MISSING");
});

test("the CIR registry never returns a gateway model string", () => {
  const registry = createCirDirectProviderRegistry({
    mistral: (_credentials, modelId) =>
      ({
        specificationVersion: "v4",
        provider: "mistral.chat",
        modelId,
      }) as never,
  });
  const model = registry.createModel("mistral", { apiKey: "sk-test" }, "mistral-large-latest");
  assertEquals(typeof model, "object");
});
