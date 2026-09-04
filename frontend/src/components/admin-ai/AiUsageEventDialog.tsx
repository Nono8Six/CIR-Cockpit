import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  Database,
  Layers,
  Sparkles,
  XCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui/data-display/Badge';
import { Button } from '@/components/ui/inputs/basic/Button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/feedback/Dialog';
import { Skeleton } from '@/components/ui/feedback/Skeleton';
import { getAiUsageEventById } from '@/services/ai';
import { aiUsageEventDetailKey } from '@/services/query/queryKeys';
import {
  featureLabels,
  featureSurfaces,
  formatCost,
  formatDate,
  formatNumber,
  SectionState,
} from './aiAdminUi';

export type AiUsageEventDialogProps = {
  eventId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Dialog d'inspection détaillée d'un événement d'usage IA avec chargement dédié des métadonnées.
 * Réutilisable dans la vue Situation et le Journal d'exécution (Phase 4).
 * @param props Propriétés du composant (eventId, open, onOpenChange)
 * @returns Composant Dialog d'inspection
 */
export const AiUsageEventDialog = ({
  eventId,
  open,
  onOpenChange,
}: AiUsageEventDialogProps) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const eventQuery = useQuery({
    queryKey: aiUsageEventDetailKey(eventId),
    queryFn: () => (eventId ? getAiUsageEventById({ id: eventId }) : Promise.reject(new Error('ID manquant'))),
    enabled: Boolean(open && eventId),
  });

  const handleCopy = (text: string, key: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const event = eventQuery.data?.event;
  const metadata = (event?.metadata ?? {}) as Record<string, unknown>;

  const vertical = typeof metadata.vertical === 'string' ? metadata.vertical : null;
  const runId = typeof metadata.run_id === 'string' ? metadata.run_id : null;
  const finishReason = typeof metadata.finish_reason === 'string' ? metadata.finish_reason : null;
  const truncated = typeof metadata.truncated === 'boolean' ? metadata.truncated : null;
  const clientRequestId = typeof metadata.client_request_id === 'string' ? metadata.client_request_id : null;
  const factIds = Array.isArray(metadata.fact_id)
    ? (metadata.fact_id.filter((f): f is string => typeof f === 'string'))
    : null;

  const otherMetadataKeys = Object.keys(metadata).filter(
    (k) => !['vertical', 'run_id', 'finish_reason', 'truncated', 'client_request_id', 'fact_id'].includes(k)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="ai-usage-event-dialog">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <DialogTitle className="text-base font-semibold">
              Détail de l’événement d’usage
            </DialogTitle>
            {event ? (
              <Badge
                variant={
                  event.status === 'success'
                    ? 'success'
                    : event.status === 'error'
                      ? 'destructive'
                      : event.status === 'blocked'
                        ? 'warning'
                        : 'outline'
                }
              >
                {event.status === 'success' && <CheckCircle2 className="mr-1 size-3" aria-hidden="true" />}
                {event.status === 'error' && <XCircle className="mr-1 size-3" aria-hidden="true" />}
                {event.status === 'blocked' && <AlertTriangle className="mr-1 size-3" aria-hidden="true" />}
                {event.status}
              </Badge>
            ) : null}
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Inspection technique, consommation de tokens et métadonnées d’exécution.
          </DialogDescription>
        </DialogHeader>

        {eventQuery.isPending ? (
          <div className="space-y-4 py-3" data-testid="ai-usage-event-dialog-loading">
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-16 rounded-lg skeleton-shimmer" />
              <Skeleton className="h-16 rounded-lg skeleton-shimmer" />
            </div>
            <Skeleton className="h-24 rounded-lg skeleton-shimmer" />
            <Skeleton className="h-32 rounded-lg skeleton-shimmer" />
          </div>
        ) : eventQuery.isError || !event ? (
          <div className="py-4" data-testid="ai-usage-event-dialog-error">
            <SectionState>
              Impossible de charger le détail de l’événement d’usage. Veuillez réessayer.
            </SectionState>
          </div>
        ) : (
          <div className="space-y-5 py-2 text-xs" data-testid="ai-usage-event-dialog-loaded">
            {/* 1. Identification de la requête */}
            <div className="rounded-lg border border-border bg-surface-1/40 p-4">
              <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                <div className="flex items-center gap-2">
                  <Bot className="size-4 text-primary" aria-hidden="true" />
                  <span className="font-semibold text-foreground">
                    {featureLabels[event.feature] ?? event.feature}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {formatDate(event.created_at)}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {featureSurfaces[event.feature]}
              </p>

              <div className="mt-3 grid gap-2.5 sm:grid-cols-2 font-mono text-[11px]">
                <div className="flex items-center justify-between gap-2 rounded bg-card px-2.5 py-1.5 border border-border/60">
                  <span className="text-muted-foreground">Request ID :</span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="truncate text-foreground font-semibold" title={event.request_id}>
                      {event.request_id}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-5 shrink-0"
                      aria-label="Copier Request ID"
                      onClick={() => handleCopy(event.request_id, 'request_id')}
                    >
                      {copiedKey === 'request_id' ? (
                        <Check className="size-3 text-success" aria-hidden="true" />
                      ) : (
                        <Copy className="size-3" aria-hidden="true" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 rounded bg-card px-2.5 py-1.5 border border-border/60">
                  <span className="text-muted-foreground">Modèle :</span>
                  <span className="truncate text-foreground font-semibold" title={`${event.provider} / ${event.model_id}`}>
                    {event.provider} · {event.model_id}
                  </span>
                </div>
              </div>

              {event.prompt_version_id ? (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Version de prompt liée : <span className="font-mono text-foreground">{event.prompt_version_id}</span>
                </p>
              ) : null}
            </div>

            {/* 2. Métriques d'exécution et coûts */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Coins className="size-3.5" aria-hidden="true" />
                  <span className="text-[11px] font-medium">Coût & Devise</span>
                </div>
                <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                  {formatCost.format(event.cost_amount ?? 0)}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Layers className="size-3.5" aria-hidden="true" />
                  <span className="text-[11px] font-medium">Tokens consommés</span>
                </div>
                <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                  {formatNumber.format(event.input_tokens + event.output_tokens)}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {formatNumber.format(event.input_tokens)} in · {formatNumber.format(event.output_tokens)} out
                  {event.cached_input_tokens > 0 ? ` · ${formatNumber.format(event.cached_input_tokens)} cache` : ''}
                  {event.reasoning_tokens > 0 ? ` · ${formatNumber.format(event.reasoning_tokens)} rsn` : ''}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="size-3.5" aria-hidden="true" />
                  <span className="text-[11px] font-medium">Latence</span>
                </div>
                <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                  {event.latency_ms !== null ? `${formatNumber.format(event.latency_ms)} ms` : '—'}
                </p>
                {event.cache_hit ? (
                  <Badge variant="outline" className="mt-0.5 text-[11px]">
                    Cache hit
                  </Badge>
                ) : null}
              </div>
            </div>

            {/* 3. Erreurs éventuelles */}
            {event.error_code || event.error_message ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3.5 text-foreground">
                <div className="flex items-center gap-2 font-semibold text-destructive">
                  <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                  <span>Erreur d’exécution : {event.error_code ?? 'Erreur inconnue'}</span>
                </div>
                {event.error_message ? (
                  <p className="mt-1 text-xs text-muted-foreground">{event.error_message}</p>
                ) : null}
              </div>
            ) : null}

            {/* 4. Métadonnées d'exécution (metadata) */}
            <div className="space-y-2.5 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                <Database className="size-4 text-primary" aria-hidden="true" />
                <h4 className="font-semibold text-foreground">Métadonnées de l’exécution</h4>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground">Vertical métier</p>
                  <p className="mt-0.5 font-mono text-xs font-semibold text-foreground">
                    {vertical ?? '—'}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-medium text-muted-foreground">Motif de fin (finish_reason)</p>
                  <p className="mt-0.5 font-mono text-xs text-foreground">
                    {finishReason ?? '—'}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-medium text-muted-foreground">Tronqué (truncated)</p>
                  <p className="mt-0.5 text-xs text-foreground">
                    {truncated === null ? '—' : truncated ? 'Oui' : 'Non'}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-medium text-muted-foreground">Run ID</p>
                  <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-foreground">
                    <span className="truncate">{runId ?? '—'}</span>
                    {runId ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-4 shrink-0"
                        aria-label="Copier Run ID"
                        onClick={() => handleCopy(runId, 'run_id')}
                      >
                        {copiedKey === 'run_id' ? (
                          <Check className="size-2.5 text-success" aria-hidden="true" />
                        ) : (
                          <Copy className="size-2.5" aria-hidden="true" />
                        )}
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <p className="text-[11px] font-medium text-muted-foreground">Client Request ID</p>
                  <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-foreground">
                    <span className="truncate font-semibold">{clientRequestId ?? '—'}</span>
                    {clientRequestId ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-4 shrink-0"
                        aria-label="Copier Client Request ID"
                        onClick={() => handleCopy(clientRequestId, 'client_request_id')}
                      >
                        {copiedKey === 'client_request_id' ? (
                          <Check className="size-2.5 text-success" aria-hidden="true" />
                        ) : (
                          <Copy className="size-2.5" aria-hidden="true" />
                        )}
                      </Button>
                    ) : null}
                  </div>
                </div>

                {/* Citations de faits (fact_id) */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-medium text-muted-foreground">
                      Faits sources cités (fact_id) : {factIds ? `${factIds.length} fait(s)` : 'Aucun'}
                    </p>
                  </div>
                  {factIds && factIds.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {factIds.map((fid) => (
                        <Badge
                          key={fid}
                          variant="outline"
                          className="font-mono text-[11px] font-normal"
                        >
                          <Sparkles className="mr-1 size-2.5 text-primary" aria-hidden="true" />
                          {fid}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-0.5 text-xs text-muted-foreground">Aucun fait cité dans ce run.</p>
                  )}
                </div>

                {/* Autres métadonnées arbitraires */}
                {otherMetadataKeys.length > 0 ? (
                  <div className="sm:col-span-2 border-t border-border/60 pt-2">
                    <p className="text-[11px] font-medium text-muted-foreground mb-1">
                      Autres propriétés
                    </p>
                    <div className="rounded bg-surface-1 p-2 font-mono text-[11px] text-foreground overflow-x-auto">
                      <pre>{JSON.stringify(Object.fromEntries(otherMetadataKeys.map((k) => [k, metadata[k]])), null, 2)}</pre>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="border-t border-border/60 pt-3">
          <DialogClose asChild>
            <Button size="sm" variant="outline">
              Fermer
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
