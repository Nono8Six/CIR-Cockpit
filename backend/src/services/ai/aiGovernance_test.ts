import { afterEach, test, vi } from "vitest";
import { assertEquals, assertRejects } from "#test/assert";

import type { AiProvider } from "../../../../shared/schemas/ai.schema.ts";
import { testProviderConnection } from "./aiGovernance.ts";

type ProviderConnectionCase = {
  label: string;
  provider: AiProvider;
  baseUrl: string;
  fetchResult: "success" | "redirect";
  expectedFetches: number;
  rejected: boolean;
};

const cases: ProviderConnectionCase[] = [
  {
    label: "accepte la base Mistral canonique",
    provider: "mistral",
    baseUrl: "https://api.mistral.ai/v1",
    fetchResult: "success",
    expectedFetches: 1,
    rejected: false,
  },
  {
    label: "refuse une base etrangere avant fetch",
    provider: "mistral",
    baseUrl: "https://proxy.example/v1",
    fetchResult: "success",
    expectedFetches: 0,
    rejected: true,
  },
  {
    label: "refuse une redirection fournisseur",
    provider: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    fetchResult: "redirect",
    expectedFetches: 1,
    rejected: true,
  },
];

afterEach(() => {
  vi.unstubAllGlobals();
});

test.each(cases)("testProviderConnection $label", async (entry) => {
  const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    if (entry.fetchResult === "redirect") {
      assertEquals(init?.redirect, "error");
      throw new TypeError("Redirect refused");
    }
    return new Response(null, { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);

  const call = () => testProviderConnection(entry.provider, "sk-test", entry.baseUrl);
  if (entry.rejected) {
    await assertRejects(call);
  } else {
    await call();
  }

  assertEquals(fetchMock.mock.calls.length, entry.expectedFetches);
  if (entry.expectedFetches > 0) {
    assertEquals(fetchMock.mock.calls[0]?.[1]?.redirect, "error");
  }
});
