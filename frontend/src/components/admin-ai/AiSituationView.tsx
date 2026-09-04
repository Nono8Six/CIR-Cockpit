import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  KeyRound,
  Radio,
  RefreshCw,
  SlidersHorizontal,
  XCircle,
} from 'lucide-react';

import type { AiModelConfig, AiProvider } from '../../../../shared/schemas/ai.schema';
import { isCirDirectProviderId } from 'shared/constants/ai';
import { Badge } from '@/components/ui/data-display/Badge';
import { Button } from '@/components/ui/inputs/basic/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/feedback/Dialog';
import { Skeleton } from '@/components/ui/feedback/Skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/data-display/Table';
import {
  getAiSettings,
  getAiUsageSummary,
  listAiPrompts,
  listAiUsageEvents,
  testAiProvider,
} from '@/services/ai';
import {
  aiPromptsKey,
  aiSettingsKey,
  aiUsageEventsKey,
  aiUsageSummaryKey,
} from '@/services/query/queryKeys';
import {
  AI_DAYS,
  featureLabels,
  featureSurfaces,
  formatCost,
  formatDate,
  formatNumber,
  SectionState,
} from './aiAdminUi';

import { AiUsageEventDialog } from './AiUsageEventDialog';

type AiSituationViewProps = {
  onNavigate: (view: string) => void;
};

type TestModalState = {
  open: boolean;
  providerLabel: string;
  status: 'success' | 'failed' | 'error';
  message: string;
} | null;

export const AiSituationView = ({ onNavigate }: AiSituationViewProps) => {
  const client = useQueryClient();
  const [testModal, setTestModal] = useState<TestModalState>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const settings = useQuery({
    queryKey: aiSettingsKey(),
    queryFn: getAiSettings,
  });

  const usage = useQuery({
    queryKey: aiUsageSummaryKey(AI_DAYS),
    queryFn: () => getAiUsageSummary({ days: AI_DAYS }),
  });

  const prompts = useQuery({
    queryKey: aiPromptsKey(),
    queryFn: () => listAiPrompts(),
  });

  const events = useQuery({
    queryKey: aiUsageEventsKey(1, 5),
    queryFn: () => listAiUsageEvents({ page: 1, page_size: 5 }),
  });

  const testMutation = useMutation({
    mutationFn: (providerName: AiProvider) => testAiProvider({ provider: providerName }),
    onSuccess: (res, providerName) => {
      void client.invalidateQueries({ queryKey: aiSettingsKey() });
      const prov = settings.data?.providers.find((p) => p.provider === providerName);
      setTestModal({
        open: true,
        providerLabel: prov?.label ?? providerName,
        status: res.status,
        message: res.message,
      });
    },
    onError: (error, providerName) => {
      const prov = settings.data?.providers.find((p) => p.provider === providerName);
      setTestModal({
        open: true,
        providerLabel: prov?.label ?? providerName,
        status: 'error',
        message: error instanceof Error ? error.message : 'Erreur de communication avec le serveur.',
      });
    },
  });

  if (settings.isPending || usage.isPending || prompts.isPending || events.isPending) {
    return (
      <div className="space-y-6" data-testid="ai-situation-view-loading">
        <Skeleton className="h-40 w-full rounded-xl skeleton-shimmer" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28 rounded-xl skeleton-shimmer" />
          <Skeleton className="h-28 rounded-xl skeleton-shimmer" />
          <Skeleton className="h-28 rounded-xl skeleton-shimmer" />
          <Skeleton className="h-28 rounded-xl skeleton-shimmer" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl skeleton-shimmer" />
      </div>
    );
  }

  if (settings.isError || usage.isError || prompts.isError || events.isError) {
    return (
      <SectionState>
        La synthèse de gouvernance IA n’a pas pu être chargée. Actualisez la page ou vérifiez les autorisations.
      </SectionState>
    );
  }

  const liveFeature = 'pricing.references.diagnose' as const;
  const livePromptTemplate = prompts.data.prompts.find((p) => p.feature === liveFeature);
  const livePublishedPrompt =
    livePromptTemplate?.published_version ??
    livePromptTemplate?.versions.find((v) => v.status === 'published');
  const liveQuota =
    settings.data.quotas.find((q) => q.feature === liveFeature && q.enabled) ??
    settings.data.quotas.find((q) => q.feature === null && q.enabled);

  // Résolution canonique du runtime (backend/src/services/ai/aiRunContext.ts:305-341)
  const liveAssignment = settings.data.assignments.find((a) => a.feature === liveFeature);
  let liveResolvedModel: AiModelConfig | null = null;
  let isDirectlyAssigned = false;

  if (liveAssignment) {
    const candidate = settings.data.models.find(
      (m) => m.id === liveAssignment.model_config_id && m.enabled
    );
    if (candidate && isCirDirectProviderId(candidate.provider)) {
      liveResolvedModel = candidate;
      isDirectlyAssigned = true;
    } else {
      liveResolvedModel = null;
      isDirectlyAssigned = false;
    }
  } else {
    const directCandidates = settings.data.models.filter(
      (m) => m.enabled && isCirDirectProviderId(m.provider)
    );
    liveResolvedModel = directCandidates.find((m) => m.is_default) ?? directCandidates[0] ?? null;
    isDirectlyAssigned = false;
  }

  // Le fournisseur de référence est strictement celui du modèle résolu, jamais un repli arbitraire sur providers[0]
  const referenceProvider = liveResolvedModel
    ? settings.data.providers.find((p) => p.provider === liveResolvedModel.provider) ?? null
    : null;

  const isKeyPresent = Boolean(referenceProvider?.has_api_key && referenceProvider?.enabled);
  const isPromptPublished = Boolean(livePublishedPrompt);
  const isLiveReady = Boolean(liveResolvedModel && isKeyPresent && isPromptPublished);

  const summary = usage.data.summary;
  const latestEvents = events.data.events;

  return (
    <div className="space-y-6" data-testid="ai-situation-view">
      {/* Bandeau d'alerte budget */}
      {summary.budget_alerts.length > 0 ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-xs text-foreground"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="size-4 shrink-0 text-warning-strong mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold text-warning-strong">Budget IA à surveiller</p>
              <p className="mt-0.5 text-muted-foreground">
                {summary.budget_alerts.length} seuil{summary.budget_alerts.length > 1 ? 's' : ''} de coût atteint
                {summary.budget_alerts.length > 1 ? 's' : ''} à au moins 80 %. Consultez les quotas applicables.
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => onNavigate('droits')}>
            Voir les seuils
          </Button>
        </div>
      ) : null}

      {/* Cartes Situation : Fournisseur & Vertical Live */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Carte 1 : Fournisseur de référence */}
        <section
          className="rounded-lg border border-border bg-card p-5"
          data-testid="ai-situation-reference-provider"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Fournisseur de référence
              </p>
              <h3 className="text-base font-semibold text-foreground">
                {referenceProvider?.label ?? (liveResolvedModel ? liveResolvedModel.provider : 'Non résolu')}
              </h3>
            </div>
            <Badge variant={referenceProvider?.enabled ? 'success' : 'destructive'}>
              {referenceProvider?.enabled ? 'Actif' : 'Inactif'}
            </Badge>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Clé d’accès API</p>
              <div className="mt-1 flex items-center gap-1.5 font-mono text-xs text-foreground">
                <KeyRound className="size-3.5 text-muted-foreground" aria-hidden="true" />
                <span>
                  {referenceProvider
                    ? referenceProvider.has_api_key
                      ? `••••${referenceProvider.api_key_last4 ?? ''}`
                      : 'Absente'
                    : '—'}
                </span>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-medium text-muted-foreground">Dernier test</p>
              <p className="mt-1 text-xs text-foreground">
                {referenceProvider?.last_test_at ? formatDate(referenceProvider.last_test_at) : 'Jamais'}
              </p>
              {referenceProvider?.last_test_status ? (
                <p className="text-[11px] text-muted-foreground">
                  Statut :{' '}
                  <span
                    className={
                      referenceProvider.last_test_status === 'success'
                        ? 'text-success font-medium'
                        : 'text-destructive font-medium'
                    }
                  >
                    {referenceProvider.last_test_status === 'success' ? 'Succès' : 'Échec'}
                  </span>
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
            <p className="text-[11px] text-muted-foreground">
              {liveResolvedModel
                ? 'Utilisé par le vertical live pour exécuter les runs.'
                : 'Aucun modèle direct résolu.'}
            </p>
            <Button
              size="sm"
              variant="outline"
              disabled={!referenceProvider || testMutation.isPending}
              onClick={() => {
                if (referenceProvider) {
                  testMutation.mutate(referenceProvider.provider);
                }
              }}
            >
              {testMutation.isPending ? (
                <RefreshCw className="mr-1.5 size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Radio className="mr-1.5 size-3.5" aria-hidden="true" />
              )}
              Tester la connexion
            </Button>
          </div>
        </section>

        {/* Carte 2 : Vertical live */}
        <section
          className="rounded-lg border border-border bg-card p-5"
          data-testid="ai-situation-live-vertical"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Bot className="size-4 text-primary" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-semibold text-foreground">{featureLabels[liveFeature]}</h3>
                <p className="text-[11px] text-muted-foreground">{featureSurfaces[liveFeature]}</p>
              </div>
            </div>
            <Badge variant={isLiveReady ? 'success' : 'destructive'}>
              {isLiveReady ? 'Prêt pour un run' : 'Incomplète'}
            </Badge>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3 text-xs">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground">Modèle résolu</p>
              <p className="mt-1 truncate font-medium text-foreground" title={liveResolvedModel?.label ?? 'Non résolu'}>
                {liveResolvedModel?.label ?? 'Non résolu'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {liveResolvedModel
                  ? isDirectlyAssigned
                    ? 'Assigné directement'
                    : 'Modèle de repli direct'
                  : liveAssignment
                    ? 'Affectation non directe ou inactive'
                    : 'Aucun modèle direct actif'}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground">Prompt publié</p>
              <p className="mt-1 font-medium text-foreground">
                {livePublishedPrompt ? `Version ${livePublishedPrompt.version}` : 'Aucun'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {livePromptTemplate ? `${livePromptTemplate.versions.length} versions` : 'Non initialisé'}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground">Plafond mensuel</p>
              <p className="mt-1 font-mono text-xs tabular-nums text-foreground">
                {liveQuota?.monthly_call_limit ? `${formatNumber.format(liveQuota.monthly_call_limit)} appels` : 'Illimité'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {liveQuota ? `Périmètre ${liveQuota.scope}` : 'Aucun quota'}
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
            <p className="text-[11px] text-muted-foreground">
              Capacité pivot de la plateforme CIR Cockpit.
            </p>
            <Button size="sm" variant="ghost" onClick={() => onNavigate('capacites')}>
              <SlidersHorizontal className="mr-1.5 size-3.5" aria-hidden="true" />
              Gérer l’affectation
            </Button>
          </div>
        </section>
      </div>

      {/* Synthèse de consommation sur 30 jours */}
      <section className="rounded-lg border border-border bg-card p-5" data-testid="ai-situation-summary">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Synthèse d’activité (30 jours)</h3>
            <p className="text-xs text-muted-foreground">
              Données de télémétrie consolidées sur les appels réels. Les tokens sont présentés décomposés.
            </p>
          </div>
          <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
            Coût total : {formatCost.format(summary.cost_amount)}
          </span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border-t border-border pt-3">
            <p className="text-[11px] font-medium text-muted-foreground">Appels totaux</p>
            <p className="mt-1 text-base font-semibold tabular-nums text-foreground">
              {formatNumber.format(summary.calls)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {formatNumber.format(summary.successful_calls)} réussis
            </p>
          </div>

          <div className="border-t border-border pt-3">
            <p className="text-[11px] font-medium text-muted-foreground">Échecs</p>
            <p
              className={`mt-1 text-base font-semibold tabular-nums ${
                summary.failed_calls > 0 ? 'text-destructive' : 'text-foreground'
              }`}
            >
              {formatNumber.format(summary.failed_calls)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {summary.failed_calls > 0 ? 'Appels en anomalie' : 'Aucune anomalie'}
            </p>
          </div>

          <div className="border-t border-border pt-3">
            <p className="text-[11px] font-medium text-muted-foreground">Tokens Entrée / Sortie</p>
            <p className="mt-1 font-mono text-xs tabular-nums text-foreground">
              {formatNumber.format(summary.input_tokens)} in · {formatNumber.format(summary.output_tokens)} out
            </p>
            <p className="text-[11px] text-muted-foreground">Consommation directe</p>
          </div>

          <div className="border-t border-border pt-3">
            <p className="text-[11px] font-medium text-muted-foreground">Cache & Raisonnement</p>
            <p className="mt-1 font-mono text-xs tabular-nums text-foreground">
              {formatNumber.format(summary.cached_input_tokens)} cache · {formatNumber.format(summary.reasoning_tokens)} rsn
            </p>
            <p className="text-[11px] text-muted-foreground">Optimisations d’exécution</p>
          </div>
        </div>
      </section>

      {/* Derniers événements */}
      <section className="space-y-3" data-testid="ai-situation-latest-events">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Derniers événements</h3>
            <p className="text-xs text-muted-foreground">
              Les 5 derniers runs exécutés. Cliquez sur une ligne pour inspecter les métadonnées.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => onNavigate('journal')}>
            Accéder au journal
          </Button>
        </div>

        {latestEvents.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <Table>
              <TableHeader className="bg-surface-1">
                <TableRow>
                  <TableHead className="w-[170px] text-xs">Date</TableHead>
                  <TableHead className="text-xs">Capacité</TableHead>
                  <TableHead className="text-xs">Modèle</TableHead>
                  <TableHead className="text-xs">Statut</TableHead>
                  <TableHead className="text-right text-xs">Coût</TableHead>
                  <TableHead className="text-right text-xs">Latence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latestEvents.map((event) => (
                  <TableRow
                    key={event.id}
                    className="cursor-pointer transition-colors hover:bg-surface-1/60"
                    onClick={() => setSelectedEventId(event.id)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedEventId(event.id);
                      }
                    }}
                  >
                    <TableCell className="whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground">
                      {formatDate(event.created_at)}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-foreground">
                      {featureLabels[event.feature] ?? event.feature}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {event.model_id}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          event.status === 'success'
                            ? 'success'
                            : event.status === 'error' || event.status === 'blocked'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {event.status === 'success'
                          ? 'Succès'
                          : event.status === 'error'
                            ? 'Erreur'
                            : event.status === 'blocked'
                              ? 'Bloqué'
                              : 'Cache'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums text-foreground">
                      {formatCost.format(event.cost_amount ?? 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">
                      {event.latency_ms !== null ? `${event.latency_ms} ms` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <SectionState>Aucun événement récent enregistré.</SectionState>
        )}
      </section>

      {/* Dialog de résultat du test fournisseur */}
      <Dialog
        open={Boolean(testModal?.open)}
        onOpenChange={(open) => {
          if (!open) setTestModal(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              {testModal?.status === 'success' ? (
                <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
              ) : (
                <XCircle className="size-5 text-destructive" aria-hidden="true" />
              )}
              Test de connexion — {testModal?.providerLabel}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Résultat renvoyé par le fournisseur après vérification directe de la clé API.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-border bg-surface-1 p-4 text-xs">
            <p className="font-medium text-foreground">
              Statut :{' '}
              <span
                className={
                  testModal?.status === 'success'
                    ? 'text-success font-semibold'
                    : 'text-destructive font-semibold'
                }
              >
                {testModal?.status === 'success' ? 'Succès (200 OK)' : 'Échec du test'}
              </span>
            </p>
            <p className="mt-2 text-muted-foreground break-words">{testModal?.message}</p>
          </div>

          <DialogFooter>
            <Button size="sm" onClick={() => setTestModal(null)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog d'inspection d'un événement via composant réutilisable avec métadonnées */}
      <AiUsageEventDialog
        eventId={selectedEventId}
        open={Boolean(selectedEventId)}
        onOpenChange={(open) => {
          if (!open) setSelectedEventId(null);
        }}
      />
    </div>
  );
};
