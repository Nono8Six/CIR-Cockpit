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
export const OPENROUTER_API_BASE_URL = "https://openrouter.ai/api/v1";

const PROVIDER_BASE_URLS: Record<AiProvider, string> = {
  mistral: MISTRAL_DIRECT_API_BASE_URL,
  openrouter: OPENROUTER_API_BASE_URL,
};

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

export const providerBaseUrl = (provider: AiProvider): string =>
  PROVIDER_BASE_URLS[provider];

export const assertCanonicalProviderEndpoint = (
  provider: AiProvider,
  baseUrl?: string | null,
): string => {
  const expected = providerBaseUrl(provider);
  if (baseUrl === null || baseUrl === undefined) return expected;

  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw httpError(
      400,
      "AI_CONFIG_MISSING",
      `L endpoint ${provider} doit etre exactement ${expected}.`,
    );
  }

  if (
    baseUrl !== expected
    || parsed.protocol !== "https:"
    || parsed.username !== ""
    || parsed.password !== ""
    || parsed.search !== ""
    || parsed.hash !== ""
  ) {
    throw httpError(
      400,
      "AI_CONFIG_MISSING",
      `L endpoint ${provider} doit etre exactement ${expected}.`,
    );
  }
  return expected;
};

export const assertDirectProviderEndpoint = (
  provider: CirDirectProviderId,
  baseUrl?: string | null,
): void => {
  assertCanonicalProviderEndpoint(provider, baseUrl);
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
