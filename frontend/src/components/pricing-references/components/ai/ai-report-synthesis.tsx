import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Bot, ChevronDown, ChevronUp, History, Sparkles } from 'lucide-react';

import type {
  PricingReferenceDiagnoseResponse,
  PricingReferenceFileKind,
  PricingReferenceHealthReport
} from '../../../../../../shared/schemas/pricing/references.schema';

import { Badge } from '@/components/ui/data-display/Badge';
import { Button } from '@/components/ui/inputs/basic/Button';
import { diagnosePricingReference } from '@/services/pricingReferences';
import { getAiSettings } from '@/services/ai';
import { handleUiError } from '@/services/errors/handleUiError';
import { aiSettingsKey, pricingReferencesRootKey } from '@/services/query/queryKeys';

interface AiReportSynthesisProps {
  report: PricingReferenceHealthReport;
  importId?: string | null;
  fileType: PricingReferenceFileKind;
  onClose?: () => void;
}

const costFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 4,
  maximumFractionDigits: 4
});

const severityVariant = (severity: string): 'destructive' | 'warning' | 'secondary' =>
  severity === 'bloquante' || severity === 'haute'
    ? 'destructive'
    : severity === 'moyenne'
      ? 'warning'
      : 'secondary';

const formatCost = (diagnosis: PricingReferenceDiagnoseResponse | null): string => {
  if (!diagnosis?.cost) return '-';
  if (!diagnosis.cost.priced || diagnosis.cost.amount === null) return 'Barème à compléter';
  return costFormatter.format(diagnosis.cost.amount);
};

/**
 * Premium AI Synthesis Panel for reference diagnostics.
 * Replaces the dry technical card with a beautifully designed, actionable summary.
 */
export const AiReportSynthesis = ({
  report,
  importId,
  fileType,
  onClose
}: AiReportSynthesisProps) => {
  const queryClient = useQueryClient();
  const [diagnosis, setDiagnosis] = useState<PricingReferenceDiagnoseResponse | null>(null);
  const [showTechDetails, setShowTechDetails] = useState(false);

  const settingsQuery = useQuery({
    queryKey: aiSettingsKey(),
    queryFn: getAiSettings,
    staleTime: 60_000
  });

  const activeModel = useMemo(() => {
    const providers = settingsQuery.data?.providers ?? [];
    const models = settingsQuery.data?.models ?? [];
    return (
      models.find((model) => {
        const provider = providers.find((item) => item.provider === model.provider);
        return model.enabled && model.is_default && provider?.enabled && provider.has_api_key;
      }) ?? null
    );
  }, [settingsQuery.data?.models, settingsQuery.data?.providers]);

  const featureKey =
    fileType === 'classification'
      ? 'pricing.references.diagnose.classification'
      : 'pricing.references.diagnose.segments';

  const quota =
    settingsQuery.data?.quotas.find((item) => item.feature === featureKey && item.scope === 'global') ?? null;
  const quotaLabel = quota?.enabled
    ? `${quota.daily_call_limit ?? '-'} appels/jour`
    : 'Quota désactivé';

  const canRun = Boolean(activeModel);

  const mutation = useMutation({
    mutationFn: () =>
      diagnosePricingReference({
        ...(importId ? { import_id: importId } : {}),
        file_type: fileType
      }),
    onSuccess: async (response) => {
      setDiagnosis(response);
      await queryClient.invalidateQueries({ queryKey: pricingReferencesRootKey() });
    },
    onError: (error) => {
      handleUiError(error, 'Impossible de lancer la synthèse IA.');
    }
  });

  return (
    <div
      className="flex w-full flex-col gap-4 rounded-lg border border-stone-200 bg-white p-4 text-stone-950 shadow-sm transition-[border-color,box-shadow]"
      data-testid="ai-diagnosis-panel"
    >
      {/* Header section with rich typography */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="rounded-md border border-stone-200 bg-stone-50 p-1.5 text-stone-700">
              <Bot className="size-4" aria-hidden="true" />
            </div>
            <h3 className="font-sans text-xs font-bold uppercase tracking-[0.14em] text-stone-950">
              Synthèse IA · {fileType === 'classification' ? 'Classification' : 'Segments'}
            </h3>
            {activeModel ? (
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 px-1.5 py-0 text-[9px] font-semibold uppercase leading-none text-emerald-700 shadow-none">
                Prêt
              </Badge>
            ) : (
              <Badge variant="outline" className="border-amber-200 bg-amber-50 px-1.5 py-0 text-[9px] font-semibold uppercase leading-none text-amber-800 shadow-none">
                Configuration requise
              </Badge>
            )}
          </div>
        </div>
        {onClose && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 rounded-md text-xs text-stone-500 hover:bg-stone-100 hover:text-stone-950"
          >
            Fermer
          </Button>
        )}
      </div>

      {/* Warning if AI model is not configured */}
      {!canRun && (
        <div className="flex items-start gap-2.5 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden="true" />
          <div className="space-y-0.5">
            <p className="text-[11px] font-semibold">Paramétrage IA requis</p>
            <p className="text-[10px] leading-normal text-amber-800">
              Activez un modèle de diagnostic IA et fournissez une clé API dans l&apos;Administration IA.
            </p>
          </div>
        </div>
      )}

      {/* Main synthesis results display or clean empty state */}
      {diagnosis?.result ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between border-b border-stone-200 pb-1.5">
            <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.16em] text-stone-500">
              <Sparkles className="size-3 text-stone-500" />
              Rapport d&apos;analyse IA
            </span>
            <span className="rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-stone-700">
              Indice de confiance : {Math.round(diagnosis.result.confidence * 100)}%
            </span>
          </div>

          <p className="rounded-md border border-stone-200 bg-stone-50 p-3 text-xs font-medium leading-relaxed text-stone-800">
            {diagnosis.result.summary}
          </p>

          <div className="space-y-2.5">
            {diagnosis.result.priority_anomalies.map((item, index) => (
              <article
                key={`${item.title}-${index}`}
                className="rounded-md border border-stone-200 bg-white p-3 transition-colors hover:border-stone-300"
              >
                <div className="flex items-center gap-2">
                  <Badge
                    variant={severityVariant(item.severity)}
                    className="px-1.5 py-0 text-[8px] font-bold leading-none uppercase"
                  >
                    {item.severity}
                  </Badge>
                  <h4 className="font-sans text-xs font-bold text-stone-950">
                    {item.title}
                  </h4>
                </div>
                <p className="mt-2 border-l border-stone-200 pl-2.5 text-xs leading-relaxed text-muted-foreground">
                  {item.evidence}
                </p>
                <div className="mt-3 flex items-start gap-2 rounded-md border border-stone-200 bg-stone-50 p-2 text-xs">
                  <span className="mt-0.5 shrink-0 text-[9px] font-bold uppercase text-stone-700">
                    Suggestion :
                  </span>
                  <span className="font-normal leading-relaxed text-stone-700">
                    {item.recommendation}
                  </span>
                </div>
              </article>
            ))}
          </div>

          {/* Double column layout for limitations & extra tips */}
          <div className="grid gap-4 border-t border-stone-200 pt-2.5 text-xs sm:grid-cols-2">
            <div className="space-y-1.5">
              <h5 className="text-[9px] font-bold uppercase tracking-[0.16em] text-stone-500">
                Conseils d&apos;actions
              </h5>
              <ul className="list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-stone-700">
                {diagnosis.result.recommendations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-1.5">
              <h5 className="text-[9px] font-bold uppercase tracking-[0.16em] text-stone-500">
                Limites de l&apos;analyse
              </h5>
              <ul className="list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-stone-700">
                {diagnosis.result.limits.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-stone-300 bg-stone-50 py-8 text-center">
          <div className="rounded-md border border-stone-200 bg-white p-2.5 text-stone-500">
            <Sparkles className="size-5" />
          </div>
          <p className="text-xs font-bold text-stone-950">Aucune synthèse générée</p>
          <p className="max-w-[28ch] text-[10px] leading-normal text-muted-foreground">
            Cliquez sur le bouton ci-dessous pour lancer l&apos;analyse assistée par IA.
          </p>
        </div>
      )}

      {/* Disclaimer on human validation */}
      {diagnosis?.result && (
        <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2.5 text-[10px] leading-relaxed text-muted-foreground">
          <span className="font-semibold text-stone-700">Validation requise :</span> Les suggestions IA doivent être
          validées par un gestionnaire métier avant toute correction manuelle des anomalies.
        </div>
      )}

      {/* Collapse block for technical developer details */}
      <div className="select-none border-t border-stone-200 pt-2.5">
        <button
          type="button"
          onClick={() => setShowTechDetails(!showTechDetails)}
          className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.16em] text-stone-500 transition-colors hover:text-stone-950"
        >
          {showTechDetails ? (
            <>
              <ChevronUp className="size-3.5" /> Masquer les infos de debug
            </>
          ) : (
            <>
              <ChevronDown className="size-3.5" /> Afficher les infos de debug
            </>
          )}
        </button>

        {showTechDetails && (
          <div className="mt-3 grid grid-cols-2 gap-3 rounded-md border border-stone-200 bg-stone-50 p-3 animate-in fade-in duration-200 md:grid-cols-4">
            <div className="space-y-0.5">
              <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-stone-500">
                Modèle
              </span>
              <p className="truncate text-[10px] font-semibold text-stone-700" title={activeModel?.model_id}>
                {activeModel ? activeModel.label : 'Aucun'}
              </p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-stone-500">
                Dernier coût
              </span>
              <p className="font-mono text-[10px] font-semibold text-stone-700">
                {formatCost(diagnosis)}
              </p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-stone-500">
                Quota global
              </span>
              <p className="font-mono text-[10px] font-semibold text-stone-700">
                {quotaLabel}
              </p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-stone-500">
                Cache / Latence
              </span>
              <p className="flex items-center gap-1 font-mono text-[10px] font-semibold text-stone-700">
                {diagnosis ? (
                  <>
                    <History className="size-3 text-stone-500" />
                    <span>{diagnosis.cache.hit ? 'Hit' : 'Miss'}</span>
                  </>
                ) : (
                  '-'
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Execution buttons & state */}
      <div className="flex shrink-0 items-center justify-between border-t border-stone-200 pt-3">
        <span className="font-mono text-[9px] text-muted-foreground">
          Snapshot : {report.generated_at ? new Date(report.generated_at).toLocaleString('fr-FR') : '-'}
        </span>
        <Button
          type="button"
          size="sm"
          className="flex h-8 items-center gap-1.5 rounded-md px-3 text-[11px] font-semibold shadow-sm transition-all active:scale-[0.98]"
          disabled={!canRun || mutation.isPending || settingsQuery.isLoading}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? (
            'Synthèse en cours...'
          ) : (
            <>
              <Bot className="size-3.5" aria-hidden="true" />
              Lancer la synthèse IA
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
