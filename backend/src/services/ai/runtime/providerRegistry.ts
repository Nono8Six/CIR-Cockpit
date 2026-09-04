import { createMistral } from "@ai-sdk/mistral";
import type { LanguageModel } from "ai";

import type { AiProvider } from "../../../../../shared/schemas/ai.schema.ts";
import {
  CIR_DIRECT_PROVIDER_IDS,
  type CirDirectProviderId,
  isCirDirectProviderId,
} from "../../../../../shared/constants/ai.ts";
import { httpError } from "../../../middleware/errorHandler.ts";
import type { AgentRuntimeCredentials } from "./agentRuntime.ts";

export {
  CIR_DIRECT_PROVIDER_IDS,
  type CirDirectProviderId,
  isCirDirectProviderId,
};
export const MISTRAL_DIRECT_API_BASE_URL = "https://api.mistral.ai/v1";

export type CirDirectProviderFactory = (
  credentials: AgentRuntimeCredentials,
  modelId: string,
) => LanguageModel;

export type CirDirectProviderRegistry = {
  ids: () => readonly CirDirectProviderId[];
  has: (provider: string) => provider is CirDirectProviderId;
  createModel: (
    provider: CirDirectProviderId,
    credentials: AgentRuntimeCredentials,
    modelId: string,
  ) => LanguageModel;
};

const requireApiKey = (credentials: AgentRuntimeCredentials): string => {
  const apiKey = credentials.apiKey.trim();
  if (!apiKey) {
    throw httpError(
      400,
      "AI_CONFIG_MISSING",
      "Cle API fournisseur IA manquante.",
    );
  }
  return apiKey;
};

const normalizeEndpoint = (value: string): string =>
  value.trim().replace(/\/+$/, "").toLowerCase();

export const assertDirectProviderEndpoint = (
  provider: CirDirectProviderId,
  baseUrl?: string | null,
): void => {
  if (!baseUrl) return;
  if (
    provider === "mistral" &&
    normalizeEndpoint(baseUrl) !==
      normalizeEndpoint(MISTRAL_DIRECT_API_BASE_URL)
  ) {
    throw httpError(
      400,
      "AI_CONFIG_MISSING",
      "L endpoint configure n est pas l API directe Mistral.",
    );
  }
};

const createMistralModel: CirDirectProviderFactory = (credentials, modelId) => {
  const apiKey = requireApiKey(credentials);
  assertDirectProviderEndpoint("mistral", credentials.baseUrl);
  return createMistral({ apiKey })(modelId);
};

const DEFAULT_FACTORIES: Record<CirDirectProviderId, CirDirectProviderFactory> =
  {
    mistral: createMistralModel,
  };

export const createCirDirectProviderRegistry = (
  overrides: Partial<Record<CirDirectProviderId, CirDirectProviderFactory>> =
    {},
): CirDirectProviderRegistry => {
  const factories = { ...DEFAULT_FACTORIES, ...overrides };
  return {
    ids: () => CIR_DIRECT_PROVIDER_IDS,
    has: isCirDirectProviderId,
    createModel: (provider, credentials, modelId) => {
      const factory = factories[provider];
      if (!factory) {
        throw httpError(
          400,
          "AI_CONFIG_MISSING",
          `Provider direct ${provider} non enregistre.`,
        );
      }
      return factory(credentials, modelId);
    },
  };
};

export const defaultCirDirectProviderRegistry = createCirDirectProviderRegistry();

export const assertDirectProvider = (
  provider: AiProvider,
): CirDirectProviderId => {
  if (!isCirDirectProviderId(provider)) {
    throw httpError(
      400,
      "AI_CONFIG_MISSING",
      "Ce vertical exige un provider AI SDK direct. OpenRouter et les identifiants gateway ne sont pas autorises.",
    );
  }
  return provider;
};
