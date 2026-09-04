import type { AiProvider } from "../schemas/ai.schema.ts";

export const CIR_DIRECT_PROVIDER_IDS = ["mistral"] as const satisfies readonly AiProvider[];

export type CirDirectProviderId = (typeof CIR_DIRECT_PROVIDER_IDS)[number];

export const isCirDirectProviderId = (
  provider: string,
): provider is CirDirectProviderId =>
  (CIR_DIRECT_PROVIDER_IDS as readonly string[]).includes(provider);
