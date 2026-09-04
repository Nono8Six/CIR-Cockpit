import { test } from "vitest";
import { APICallError, NoObjectGeneratedError } from "ai";
import { assertEquals } from "#test/assert";

import { isTimeoutLikeError, mapAiSdkError } from "./mapAiSdkError.ts";

test("maps NoObjectGeneratedError to AI_RESPONSE_INVALID", () => {
  const error = new NoObjectGeneratedError({
    text: "{",
    response: { id: "r1", modelId: "mistral-small-latest", timestamp: new Date() },
    usage: {
      inputTokens: 4,
      outputTokens: 1,
      inputTokenDetails: {
        noCacheTokens: 4,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      },
      outputTokenDetails: { textTokens: 1, reasoningTokens: 0 },
      totalTokens: 5,
    },
    finishReason: "stop",
  });
  const mapped = mapAiSdkError(error);
  assertEquals(mapped.code, "AI_RESPONSE_INVALID");
  assertEquals(mapped.status, 502);
});

test("maps HTTP 408 and abort names to AI_TIMEOUT", () => {
  const timeout = new Error("The operation was aborted due to timeout");
  timeout.name = "TimeoutError";
  assertEquals(isTimeoutLikeError(timeout), true);
  assertEquals(mapAiSdkError(timeout).code, "AI_TIMEOUT");

  const apiTimeout = new APICallError({
    message: "Gateway timeout",
    url: "https://api.mistral.ai/v1/chat/completions",
    requestBodyValues: {},
    statusCode: 408,
    responseHeaders: {},
    responseBody: "",
    isRetryable: false,
  });
  assertEquals(mapAiSdkError(apiTimeout).code, "AI_TIMEOUT");
});

test("maps provider auth, billing, rate-limit and unavailability", () => {
  const auth = new APICallError({
    message: "unauthorized",
    url: "https://api.mistral.ai/v1/chat/completions",
    requestBodyValues: {},
    statusCode: 401,
    responseHeaders: {},
    responseBody: "",
    isRetryable: false,
  });
  assertEquals(mapAiSdkError(auth).code, "AI_PROVIDER_AUTH_FAILED");

  const billing = new APICallError({
    message: "payment required",
    url: "https://api.mistral.ai/v1/chat/completions",
    requestBodyValues: {},
    statusCode: 402,
    responseHeaders: {},
    responseBody: "",
    isRetryable: false,
  });
  assertEquals(mapAiSdkError(billing).code, "AI_PROVIDER_BILLING_REQUIRED");

  const limited = new APICallError({
    message: "too many requests",
    url: "https://api.mistral.ai/v1/chat/completions",
    requestBodyValues: {},
    statusCode: 429,
    responseHeaders: {},
    responseBody: "",
    isRetryable: true,
  });
  assertEquals(mapAiSdkError(limited).code, "AI_PROVIDER_RATE_LIMITED");

  const down = new APICallError({
    message: "unavailable",
    url: "https://api.mistral.ai/v1/chat/completions",
    requestBodyValues: {},
    statusCode: 503,
    responseHeaders: {},
    responseBody: "",
    isRetryable: true,
  });
  assertEquals(mapAiSdkError(down).code, "AI_PROVIDER_UNAVAILABLE");
});
