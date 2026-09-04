import { httpError } from "../../../middleware/errorHandler.ts";
import type {
  AgentRuntime,
  StructuredRunInput,
  StructuredRunResult,
  StructuredRunUsage,
} from "./agentRuntime.ts";

export type DeterministicRuntimeOptions = {
  output?: unknown | ((input: StructuredRunInput<unknown>) => unknown | Promise<unknown>);
  error?: unknown | ((input: StructuredRunInput<unknown>) => unknown);
  delayMs?: number;
  usage?: StructuredRunUsage;
  finishReason?: string;
};

const DEFAULT_USAGE: StructuredRunUsage = {
  inputTokens: 12,
  outputTokens: 8,
  cachedInputTokens: 0,
  reasoningTokens: 0,
};

const timeoutError = () =>
  httpError(504, "AI_TIMEOUT", "Le modele a depasse le delai autorise.");

const wait = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(timeoutError());
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(timeoutError());
    }, { once: true });
  });

const withAbort = <T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T> => {
  if (signal.aborted) return Promise.reject(timeoutError());
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(timeoutError());
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
};

export const createDeterministicAgentRuntime = (
  options: DeterministicRuntimeOptions = {},
): AgentRuntime => ({
  async runStructured<T>(
    input: StructuredRunInput<T>,
  ): Promise<StructuredRunResult<T>> {
    const startedAt = Date.now();
    const timeout = AbortSignal.timeout(input.timeoutMs);
    const combined = input.abortSignal
      ? AbortSignal.any([input.abortSignal, timeout])
      : timeout;

    if (options.delayMs && options.delayMs > 0) {
      await wait(options.delayMs, combined);
    } else if (combined.aborted) {
      throw httpError(504, "AI_TIMEOUT", "Le modele a depasse le delai autorise.");
    }

    if (options.error !== undefined) {
      const thrown = typeof options.error === "function"
        ? options.error(input as StructuredRunInput<unknown>)
        : options.error;
      throw await withAbort(Promise.resolve(thrown), combined);
    }

    const raw = options.output === undefined
      ? undefined
      : typeof options.output === "function"
      ? await withAbort(
        Promise.resolve(options.output(input as StructuredRunInput<unknown>)),
        combined,
      )
      : options.output;
    const parsed = input.schema.safeParse(raw);
    if (!parsed.success) {
      throw httpError(
        502,
        "AI_RESPONSE_INVALID",
        "La sortie structuree du modele est invalide.",
      );
    }

    return {
      output: parsed.data,
      usage: options.usage ?? DEFAULT_USAGE,
      latencyMs: Date.now() - startedAt,
      finishReason: options.finishReason ?? "stop",
    };
  },
});
