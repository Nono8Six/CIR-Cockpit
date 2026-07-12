import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, RefreshCw, Send, Sparkles } from 'lucide-react';

import type {
  AiAssistantPageContext,
  AiAssistantStatusResponse
} from '../../../../../../shared/schemas/aiAssistant.schema';

import { Badge } from '@/components/ui/data-display/Badge';
import { ScrollArea } from '@/components/ui/data-display/ScrollArea';
import { Button } from '@/components/ui/inputs/basic/Button';
import { Textarea } from '@/components/ui/inputs/basic/Textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/feedback/Dialog';
import { cn } from '@/lib/utils';

import { useAssistantChat } from '../../hooks/useAssistantChat';
import { AssistantMessageContent } from './AssistantMessageContent';
import { AssistantSources } from './AssistantSources';

const STARTER_QUESTIONS = [
  'Quelles sont les familles chez ROCKWELL qui ont augmenté par rapport au dernier fichier tarif ?',
  'Quelles sont les familles de produit dont les remises ont baissé ?',
  'Tu peux me dire les changements par rapport au dernier fichier tarif ?',
  'Aide-moi à corriger les anomalies sur le fichier Segment.'
] as const;

interface AssistantChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageContext: AiAssistantPageContext;
  status?: AiAssistantStatusResponse;
  statusLoading?: boolean;
  statusError?: boolean;
}

export const AssistantChatDialog = ({
  open,
  onOpenChange,
  pageContext,
  status,
  statusLoading = false,
  statusError = false
}: AssistantChatDialogProps) => {
  const [draft, setDraft] = useState('');
  const endMarkerRef = useRef<HTMLDivElement>(null);
  const { messages, pending, error, canRetry, send, retry, reset } = useAssistantChat(pageContext);
  const disabledReason = useMemo(() => {
    if (statusError) return "Impossible de vérifier la disponibilité de l'assistant.";
    if (status?.enabled === false) return status.reason ?? "L'assistant IA n'est pas activé.";
    return null;
  }, [status, statusError]);

  useEffect(() => {
    endMarkerRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [messages, pending, error]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setDraft('');
      reset();
    }
    onOpenChange(nextOpen);
  };

  const submitQuestion = async (question: string) => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || pending || disabledReason) return;
    setDraft('');
    await send(trimmedQuestion);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="grid h-[min(720px,calc(100dvh-32px))] w-[calc(100vw-24px)] max-w-[760px] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden border-border bg-card p-0 shadow-soft"
        overlayClassName="bg-foreground/25 backdrop-blur-[1px]"
        data-testid="assistant-chat-dialog"
      >
        <DialogHeader className="border-b border-border-subtle px-5 py-4 pr-14 text-left">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Sparkles className="size-3.5" aria-hidden="true" />
            </span>
            <DialogTitle className="text-sm font-semibold">Assistant IA CIR</DialogTitle>
            {status?.model_id ? (
              <Badge variant="ghost" className="max-w-52 truncate px-1.5 font-mono text-[10px] font-normal">
                {status.model_id}
              </Badge>
            ) : null}
          </div>
          <DialogDescription className="text-[11px] leading-snug">
            Interrogez les données CIR autorisées, avec le contexte de la page affichée.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="min-h-0 bg-surface-1/45">
          <div className="flex min-h-full flex-col px-5 py-4" aria-live="polite">
            {statusLoading ? (
              <div className="m-auto flex items-center gap-2 text-xs text-muted-foreground">
                <span className="skeleton-shimmer size-4 rounded-full" aria-hidden="true" />
                Vérification de l&apos;assistant…
              </div>
            ) : null}

            {!statusLoading && disabledReason ? (
              <div className="m-auto max-w-sm text-center">
                <span className="mx-auto mb-3 flex size-9 items-center justify-center rounded-lg border border-warning/25 bg-warning/10 text-warning">
                  <AlertCircle className="size-4" aria-hidden="true" />
                </span>
                <p className="text-sm font-semibold text-foreground">Assistant indisponible</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{disabledReason}</p>
              </div>
            ) : null}

            {!statusLoading && !disabledReason && messages.length === 0 ? (
              <div className="m-auto w-full max-w-xl space-y-4">
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">Que souhaitez-vous analyser ?</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Le contexte de l&apos;onglet et de l&apos;import sélectionné est transmis automatiquement.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {STARTER_QUESTIONS.map((question) => (
                    <button
                      key={question}
                      type="button"
                      className="rounded-lg border border-border bg-card px-3 py-2.5 text-left text-xs leading-snug text-foreground transition-colors hover:border-primary/30 hover:bg-primary/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45"
                      onClick={() => void submitQuestion(question)}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[88%] rounded-lg border px-3 py-2.5',
                        message.role === 'user'
                          ? 'border-primary bg-primary text-xs leading-relaxed text-primary-foreground'
                          : 'border-border bg-card'
                      )}
                    >
                      {message.role === 'assistant' ? (
                        <>
                          <AssistantMessageContent content={message.content} />
                          <AssistantSources message={message} />
                        </>
                      ) : message.content}
                    </div>
                  </div>
                ))}

                {pending ? (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-xs text-muted-foreground">
                      <span className="skeleton-shimmer size-4 rounded-full" aria-hidden="true" />
                      L&apos;assistant analyse…
                    </div>
                  </div>
                ) : null}

                {error ? (
                  <div role="alert" className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground">{error.message}</p>
                        {canRetry ? (
                          <Button type="button" variant="ghost" size="dataRow" className="mt-1 -ml-2" onClick={() => void retry()}>
                            <RefreshCw className="size-3" aria-hidden="true" />
                            Réessayer
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            <div ref={endMarkerRef} aria-hidden="true" />
          </div>
        </ScrollArea>

        <form
          className="border-t border-border-subtle bg-card p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submitQuestion(draft);
          }}
        >
          <div className="flex items-end gap-2">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void submitQuestion(draft);
                }
              }}
              aria-label="Question pour l'assistant IA"
              placeholder={disabledReason ? 'Assistant indisponible' : 'Posez une question sur les données CIR…'}
              disabled={pending || statusLoading || Boolean(disabledReason)}
              maxLength={2000}
              rows={2}
              className="min-h-[56px] resize-none border-border bg-background px-3 py-2 text-xs shadow-none"
            />
            <Button
              type="submit"
              size="icon"
              className="shrink-0"
              disabled={!draft.trim() || pending || statusLoading || Boolean(disabledReason)}
              aria-label="Envoyer la question"
            >
              <Send className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            Entrée pour envoyer, Maj+Entrée pour une nouvelle ligne.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};
