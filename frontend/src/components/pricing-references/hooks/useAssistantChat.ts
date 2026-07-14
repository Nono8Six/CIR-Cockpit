import { useCallback, useRef, useState } from "react";

import type {
  AiAssistantCitation,
  AiAssistantConversationContext,
  AiAssistantEvidence,
  AiAssistantMessage,
  AiAssistantPageContext,
  AiAssistantToolCallTrace,
} from "../../../../../shared/schemas/aiAssistant.schema";

import { askAiAssistant } from "@/services/ai";
import { type AppError, createAppError } from "@/services/errors/AppError";
import { handleUiError } from "@/services/errors/handleUiError";

const MAX_HISTORY_MESSAGES = 12;

export type AssistantChatMessage = AiAssistantMessage & {
  id: string;
  citations: AiAssistantCitation[];
  toolTrace: AiAssistantToolCallTrace[];
  evidence: AiAssistantEvidence;
};

type PendingAssistantRequest = {
  clientRequestId: string;
  conversationContext: AiAssistantConversationContext | null;
  history: AiAssistantMessage[];
  question: string;
};

const createUserMessage = (question: string): AssistantChatMessage => ({
  id: crypto.randomUUID(),
  role: "user",
  content: question,
  citations: [],
  toolTrace: [],
  evidence: {
    status: "failed",
    intent: "user_message",
    dimension: null,
    facts: [],
    executions: [],
  },
});

export const useAssistantChat = (pageContext: AiAssistantPageContext) => {
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const failedRequestRef = useRef<PendingAssistantRequest | null>(null);
  const conversationContextRef = useRef<AiAssistantConversationContext | null>(
    null,
  );

  const execute = useCallback(async (
    request: PendingAssistantRequest,
    appendUserMessage: boolean,
  ) => {
    setPending(true);
    setError(null);
    if (appendUserMessage) {
      setMessages((
        current,
      ) => [...current, createUserMessage(request.question)]);
    }

    try {
      const response = await askAiAssistant({
        client_request_id: request.clientRequestId,
        question: request.question,
        history: request.history,
        page_context: pageContext,
        conversation_context: request.conversationContext,
      });

      if (!response.ai_available || !response.answer) {
        throw createAppError({
          code: "AI_PROVIDER_UNAVAILABLE",
          message: response.fallback_reason ??
            "L'assistant IA est indisponible.",
          source: "edge",
          retryable: true,
        });
      }

      failedRequestRef.current = null;
      conversationContextRef.current = response.conversation_context;
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.answer ?? "",
        citations: response.citations,
        toolTrace: response.tool_trace,
        evidence: response.evidence,
      }]);
    } catch (caughtError) {
      failedRequestRef.current = request;
      const appError = handleUiError(
        caughtError,
        "Impossible d'obtenir une reponse de l'assistant IA.",
        { feature: "assistant.referentiels" },
      );
      setError(appError);
    } finally {
      setPending(false);
    }
  }, [pageContext]);

  const send = useCallback(async (rawQuestion: string) => {
    const question = rawQuestion.trim();
    if (!question || pending) return;

    const history = messages
      .slice(-MAX_HISTORY_MESSAGES)
      .map(({ role, content }) => ({ role, content }));
    await execute({
      clientRequestId: crypto.randomUUID(),
      conversationContext: conversationContextRef.current,
      history,
      question,
    }, true);
  }, [execute, messages, pending]);

  const retry = useCallback(async () => {
    if (pending || error?.retryable === false || !failedRequestRef.current) return;
    const failedRequest = failedRequestRef.current;
    await execute({
      ...failedRequest,
      clientRequestId: error?.domain === "network"
        ? failedRequest.clientRequestId
        : crypto.randomUUID(),
    }, false);
  }, [error?.domain, execute, pending]);

  const reset = useCallback(() => {
    failedRequestRef.current = null;
    conversationContextRef.current = null;
    setMessages([]);
    setError(null);
    setPending(false);
  }, []);

  return {
    messages,
    pending,
    error,
    canRetry: failedRequestRef.current !== null && error?.retryable !== false,
    send,
    retry,
    reset,
  };
};
