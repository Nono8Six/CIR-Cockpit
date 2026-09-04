import { generateText, Output, type LanguageModel } from "ai";

import { httpError } from "../../../middleware/errorHandler.ts";
import type {
  AgentRuntime,
  StructuredRunInput,
  StructuredRunResult,
} from "./agentRuntime.ts";
import {
  extractStructuredRunUsage,
  mapAiSdkError,
} from "./mapAiSdkError.ts";
import {
  assertDirectProvider,
  defaultCirDirectProviderRegistry,
  type CirDirectProviderRegistry,
} from "./providerRegistry.ts";

export type GenerateStructuredCall = typeof generateText;

export type AiSdkRuntimeOptions = {
  registry?: CirDirectProviderRegistry;
  generateText?: GenerateStructuredCall;
};

const toUsage = (usage: {
  inputTokens?: number;
  outputTokens?: number;
  inputTokenDetails?: { cacheReadTokens?: number };
  outputTokenDetails?: { reasoningTokens?: number };
}) => ({
  inputTokens: usage.inputTokens ?? 0,
  outputTokens: usage.outputTokens ?? 0,
  cachedInputTokens: usage.inputTokenDetails?.cacheReadTokens ?? 0,
  reasoningTokens: usage.outputTokenDetails?.reasoningTokens ?? 0,
});

export const createAiSdkAgentRuntime = (
  options: AiSdkRuntimeOptions = {},
): AgentRuntime => {
  const registry = options.registry ?? defaultCirDirectProviderRegistry;
  const generate = options.generateText ?? generateText;

  return {
    async runStructured<T>(
      input: StructuredRunInput<T>,
    ): Promise<StructuredRunResult<T>> {
      const providerId = assertDirectProvider(input.provider);
      const model = registry.createModel(
        providerId,
        input.credentials,
        input.modelId,
      );
      if (typeof model === "string") {
        throw httpError(
          500,
          "AI_CONFIG_MISSING",
          "Le runtime refuse les identifiants de modele gateway.",
        );
      }

      const startedAt = Date.now();
      try {
        const result = await generate({
          model: model as LanguageModel,
          output: Output.object({
            schema: input.schema,
            name: "cir_structured_output",
          }),
          ...(input.instructions ? { instructions: input.instructions } : {}),
          prompt: input.prompt,
          timeout: input.timeoutMs,
          abortSignal: input.abortSignal,
          maxOutputTokens: input.maxOutputTokens,
          temperature: input.temperature,
          maxRetries: 0,
        });

        if (result.finishReason === "content-filter") {
          throw httpError(
            502,
            "AI_RESPONSE_INVALID",
            "Le fournisseur a filtre le contenu genere.",
          );
        }
        if (result.output == null) {
          throw httpError(
            502,
            "AI_RESPONSE_INVALID",
            "La sortie structuree du modele est vide.",
          );
        }

        return {
          output: result.output,
          usage: toUsage(result.totalUsage),
          latencyMs: Date.now() - startedAt,
          finishReason: result.finishReason,
        };
      } catch (error) {
        const mapped = mapAiSdkError(error);
        const usage = extractStructuredRunUsage(error);
        if (usage) Reflect.set(mapped, "usage", usage);
        throw mapped;
      }
    },
  };
};
