import type { z } from "zod/v4";

import type { AiProvider } from "../../../../../shared/schemas/ai.schema.ts";

export type AgentRuntimeCredentials = {
  apiKey: string;
  baseUrl?: string | null;
};

export type StructuredRunUsage = {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  reasoningTokens: number;
};

export type StructuredRunInput<T> = {
  provider: AiProvider;
  modelId: string;
  credentials: AgentRuntimeCredentials;
  instructions?: string;
  prompt: string;
  schema: z.ZodType<T>;
  timeoutMs: number;
  maxOutputTokens?: number;
  temperature?: number;
  abortSignal?: AbortSignal;
};

export type StructuredRunResult<T> = {
  output: T;
  usage: StructuredRunUsage;
  latencyMs: number;
  finishReason: string;
};

export interface AgentRuntime {
  runStructured<T>(input: StructuredRunInput<T>): Promise<StructuredRunResult<T>>;
}
