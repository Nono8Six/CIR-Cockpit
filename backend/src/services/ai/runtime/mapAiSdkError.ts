import {
  APICallError,
  LoadAPIKeyError,
  NoObjectGeneratedError,
  TypeValidationError,
} from "ai";

import { httpError, type HttpError } from "../../../middleware/errorHandler.ts";

const readStatus = (error: unknown): number | undefined => {
  if (typeof error !== "object" || error === null) return undefined;
  const statusCode = Reflect.get(error, "statusCode");
  const status = Reflect.get(error, "status");
  if (typeof statusCode === "number") return statusCode;
  if (typeof status === "number") return status;
  return undefined;
};

const readMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Erreur fournisseur IA.";

export const isTimeoutLikeError = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) return false;
  const name = Reflect.get(error, "name");
  const message = readMessage(error);
  if (name === "TimeoutError" || name === "AbortError") return true;
  if (APICallError.isInstance(error) && (error.statusCode === 408 || error.statusCode === 504)) {
    return true;
  }
  return /timeout|timed out|aborted due to timeout/i.test(message);
};

export const extractStructuredRunUsage = (
  error: unknown,
): {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  reasoningTokens: number;
} | null => {
  if (!NoObjectGeneratedError.isInstance(error) || !error.usage) return null;
  return {
    inputTokens: error.usage.inputTokens ?? 0,
    outputTokens: error.usage.outputTokens ?? 0,
    cachedInputTokens: error.usage.inputTokenDetails?.cacheReadTokens ?? 0,
    reasoningTokens: error.usage.outputTokenDetails?.reasoningTokens ?? 0,
  };
};

export const mapAiSdkError = (error: unknown): HttpError => {
  if (
    typeof error === "object" && error !== null &&
    typeof Reflect.get(error, "status") === "number" &&
    typeof Reflect.get(error, "code") === "string"
  ) {
    return error as HttpError;
  }

  if (isTimeoutLikeError(error)) {
    return httpError(
      504,
      "AI_TIMEOUT",
      "Le modele a depasse le delai autorise.",
    );
  }

  if (NoObjectGeneratedError.isInstance(error) || TypeValidationError.isInstance(error)) {
    return httpError(
      502,
      "AI_RESPONSE_INVALID",
      "La sortie structuree du modele est invalide.",
    );
  }

  if (LoadAPIKeyError.isInstance(error)) {
    return httpError(
      400,
      "AI_CONFIG_MISSING",
      "Cle API fournisseur IA manquante.",
    );
  }

  const status = readStatus(error);
  if (APICallError.isInstance(error) || status !== undefined) {
    if (status === 401 || status === 403) {
      return httpError(
        502,
        "AI_PROVIDER_AUTH_FAILED",
        "Authentification du fournisseur IA refusee.",
      );
    }
    if (status === 402) {
      return httpError(
        502,
        "AI_PROVIDER_BILLING_REQUIRED",
        "Le compte fournisseur IA requiert une intervention administrateur.",
      );
    }
    if (status === 429) {
      return httpError(
        429,
        "AI_PROVIDER_RATE_LIMITED",
        "Quota fournisseur IA atteint. Reessayez plus tard.",
      );
    }
    return httpError(
      503,
      "AI_PROVIDER_UNAVAILABLE",
      "Fournisseur IA indisponible.",
    );
  }

  return httpError(
    502,
    "AI_PROVIDER_CONTRACT_INVALID",
    "La reponse du fournisseur IA est invalide.",
    readMessage(error),
  );
};
