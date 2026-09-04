import { test } from "vitest";
import { assertEquals, assertRejects } from "#test/assert";

import type { DbClient } from "../../types.ts";
import {
  computeAiCost,
  persistAiOutcome,
  quotaExceededMessage,
} from "./aiRunContext.ts";

test("computeAiCost prices uncached input, cached input, output and reasoning separately", () => {
  const cost = computeAiCost({
    currency: "USD",
    inputPricePerMillion: 1,
    outputPricePerMillion: 2,
    cachedInputPricePerMillion: 0.1,
    reasoningPricePerMillion: 3,
  }, {
    inputTokens: 1_000_000,
    outputTokens: 500_000,
    cachedInputTokens: 200_000,
    reasoningTokens: 100_000,
  });
  assertEquals(cost, {
    amount: 1.92,
    currency: "USD",
    priced: true,
  });
});

test("computeAiCost does not bill reasoning twice when no reasoning price exists", () => {
  const cost = computeAiCost({
    currency: "USD",
    inputPricePerMillion: 1,
    outputPricePerMillion: 2,
    cachedInputPricePerMillion: 0.1,
    reasoningPricePerMillion: null,
  }, {
    inputTokens: 1_000_000,
    outputTokens: 500_000,
    cachedInputTokens: 200_000,
    reasoningTokens: 100_000,
  });
  assertEquals(cost, {
    amount: 1.82,
    currency: "USD",
    priced: true,
  });
});

test("computeAiCost stays unpriced when model prices are missing", () => {
  const cost = computeAiCost({
    currency: "USD",
    inputPricePerMillion: null,
    outputPricePerMillion: 2,
    cachedInputPricePerMillion: null,
    reasoningPricePerMillion: null,
  }, {
    inputTokens: 10,
    outputTokens: 5,
    cachedInputTokens: 0,
    reasoningTokens: 0,
  });
  assertEquals(cost, { amount: null, currency: "USD", priced: false });
});

test("quotaExceededMessage covers calls, tokens and cost limits", () => {
  const usage = {
    daily_calls: 10,
    monthly_calls: 10,
    daily_tokens: 100,
    monthly_tokens: 100,
    daily_cost: 1,
    monthly_cost: 1,
  };
  assertEquals(
    quotaExceededMessage({
      daily_call_limit: 10,
      monthly_call_limit: null,
      daily_token_limit: null,
      monthly_token_limit: null,
      daily_cost_limit: null,
      monthly_cost_limit: null,
    }, usage),
    "Quota quotidien d appels IA atteint.",
  );
  assertEquals(
    quotaExceededMessage({
      daily_call_limit: 20,
      monthly_call_limit: null,
      daily_token_limit: 50,
      monthly_token_limit: null,
      daily_cost_limit: null,
      monthly_cost_limit: null,
    }, usage),
    "Quota quotidien de tokens IA atteint.",
  );
  assertEquals(
    quotaExceededMessage({
      daily_call_limit: 20,
      monthly_call_limit: null,
      daily_token_limit: 200,
      monthly_token_limit: null,
      daily_cost_limit: 1,
      monthly_cost_limit: null,
    }, usage),
    "Quota quotidien de cout IA atteint.",
  );
  assertEquals(
    quotaExceededMessage({
      daily_call_limit: 20,
      monthly_call_limit: 20,
      daily_token_limit: 200,
      monthly_token_limit: 200,
      daily_cost_limit: 2,
      monthly_cost_limit: 2,
    }, usage),
    null,
  );
});

const persistedOutcome = {
  usage: {
    requestId: "req-persist-1",
    feature: "pricing.references.diagnose" as const,
    provider: "mistral" as const,
    modelId: "mistral-small-latest",
    modelConfigId: "11111111-1111-4111-8111-111111111111",
    promptVersionId: "22222222-2222-4222-8222-222222222222",
    userId: "33333333-3333-4333-8333-333333333333",
    agencyId: null,
    usage: {
      inputTokens: 12,
      outputTokens: 8,
      cachedInputTokens: 0,
      reasoningTokens: 0,
    },
    costAmount: 0.001,
    currency: "USD",
    status: "success" as const,
    errorCode: null,
    errorMessage: null,
    latencyMs: 25,
  },
  finalization: {
    reservationId: "44444444-4444-4444-8444-444444444444",
    status: "success" as const,
    actualTokens: 20,
    actualCost: 0.001,
    response: { ok: true },
    errorCode: null,
    errorMessage: null,
  },
};

const persistenceDb = (updatedIds: string[], calls: string[]): DbClient => ({
  transaction: async (operation: (tx: unknown) => Promise<unknown>) => {
    calls.push("transaction");
    const tx = {
      insert: () => ({
        values: async () => {
          calls.push("usage");
        },
      }),
      update: () => ({
        set: () => ({
          where: () => ({
            returning: async () => {
              calls.push("reservation");
              return updatedIds.map((id) => ({ id }));
            },
          }),
        }),
      }),
    };
    return operation(tx);
  },
} as DbClient);

test("persistAiOutcome writes usage and finalizes the reservation in one transaction", async () => {
  const calls: string[] = [];
  await persistAiOutcome(
    persistenceDb([persistedOutcome.finalization.reservationId], calls),
    persistedOutcome,
  );
  assertEquals(calls, ["transaction", "usage", "reservation"]);
});

test("persistAiOutcome rejects a reservation that is no longer reserved", async () => {
  const error = await assertRejects(() =>
    persistAiOutcome(persistenceDb([], []), persistedOutcome)
  );
  assertEquals(Reflect.get(error, "code"), "CONFLICT");
});
