import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  BarChart3,
  KeyRound,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Settings
} from 'lucide-react';

import type { AiModelConfig, AiQuotaPolicy } from '../../../../shared/schemas/ai.schema';

import { Badge } from '@/components/ui/data-display/Badge';
import { Button } from '@/components/ui/inputs/basic/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/navigation/Tabs';
import ConfirmDialog from '../ConfirmDialog';
import {
  getAiSettings,
  getAiUsageSummary,
  listAiUsageEvents,
  saveAiModel,
  saveAiProvider,
  saveAiQuota,
  testAiProvider
} from '@/services/ai';
import { createAppError } from '@/services/errors/AppError';
import { handleUiError } from '@/services/errors/handleUiError';
import {
  aiSettingsKey,
  aiUsageEventsKey,
  aiUsageSummaryKey
} from '@/services/query/queryKeys';

const AI_PROVIDER = 'openrouter' as const;
const DEEPSEEK_V4_PRO_MODEL_ID = 'deepseek/deepseek-v4-pro';
const DEEPSEEK_V4_PRO_LABEL = 'DeepSeek V4 Pro';
const USAGE_DAYS = 30;
const USAGE_PAGE_SIZE = 12;

const numberFormatter = new Intl.NumberFormat('fr-FR');
const costFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4
});
const compactCostFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 4
});
const percentFormatter = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 0
});

type SubTabId = 'config' | 'quotas' | 'stats';

type QuotaForm = {
  enabled: boolean;
  daily_call_limit: string;
  monthly_call_limit: string;
  daily_token_limit: string;
  monthly_token_limit: string;
  daily_cost_limit: string;
  monthly_cost_limit: string;
  currency: string;
};

type QuotaEditState = {
  quotaId: string | null;
  form: QuotaForm;
};

type ModelForm = {
  model_id: string;
  label: string;
  enabled: boolean;
  is_default: boolean;
  currency: string;
  input_price_per_million: string;
  output_price_per_million: string;
  cached_input_price_per_million: string;
  reasoning_price_per_million: string;
  max_output_tokens: string;
  temperature: string;
};

type ModelEditState = {
  modelId: string | null;
  form: ModelForm;
};

type AiUsageEvent = Awaited<ReturnType<typeof listAiUsageEvents>>['events'][number];

const emptyQuotaForm: QuotaForm = {
  enabled: false,
  daily_call_limit: '',
  monthly_call_limit: '',
  daily_token_limit: '',
  monthly_token_limit: '',
  daily_cost_limit: '',
  monthly_cost_limit: '',
  currency: 'USD'
};

const defaultDeepSeekModelForm: ModelForm = {
  model_id: DEEPSEEK_V4_PRO_MODEL_ID,
  label: DEEPSEEK_V4_PRO_LABEL,
  enabled: true,
  is_default: true,
  currency: 'USD',
  input_price_per_million: '0.435',
  output_price_per_million: '0.87',
  cached_input_price_per_million: '',
  reasoning_price_per_million: '',
  max_output_tokens: '2000',
  temperature: '0.2'
};

const quotaToForm = (quota: AiQuotaPolicy): QuotaForm => ({
  enabled: quota.enabled,
  daily_call_limit: quota.daily_call_limit === null ? '' : String(quota.daily_call_limit),
  monthly_call_limit: quota.monthly_call_limit === null ? '' : String(quota.monthly_call_limit),
  daily_token_limit: quota.daily_token_limit === null ? '' : String(quota.daily_token_limit),
  monthly_token_limit: quota.monthly_token_limit === null ? '' : String(quota.monthly_token_limit),
  daily_cost_limit: quota.daily_cost_limit === null ? '' : String(quota.daily_cost_limit),
  monthly_cost_limit: quota.monthly_cost_limit === null ? '' : String(quota.monthly_cost_limit),
  currency: quota.currency
});

const modelToForm = (model: AiModelConfig): ModelForm => ({
  model_id: model.model_id,
  label: model.label,
  enabled: model.enabled,
  is_default: model.is_default,
  currency: model.currency,
  input_price_per_million: model.input_price_per_million === null ? '' : String(model.input_price_per_million),
  output_price_per_million: model.output_price_per_million === null ? '' : String(model.output_price_per_million),
  cached_input_price_per_million: model.cached_input_price_per_million === null ? '' : String(model.cached_input_price_per_million),
  reasoning_price_per_million: model.reasoning_price_per_million === null ? '' : String(model.reasoning_price_per_million),
  max_output_tokens: String(model.max_output_tokens),
  temperature: String(model.temperature)
});

const parseNullableLimit = (value: string, integer: boolean, label: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed < 0 || (integer && !Number.isInteger(parsed))) {
    throw createAppError({
      code: 'VALIDATION_ERROR',
      message: `${label} doit être un nombre positif.`,
      source: 'validation'
    });
  }
  return parsed;
};

const featureLabel = (feature: AiQuotaPolicy['feature']) => {
  if (feature === 'pricing.references.diagnose.classification') return 'Référentiels CIR - Classification';
  if (feature === 'pricing.references.diagnose.segments') return 'Référentiels CIR - Segments / grilles';
  if (feature === 'pricing.references.diagnose') return 'Référentiels CIR - Diagnostic global';
  return 'Toutes fonctionnalités IA';
};

const scopeLabel = (quota: AiQuotaPolicy) => {
  if (quota.scope === 'user') return quota.user_id ? `Utilisateur ${quota.user_id}` : 'Utilisateur';
  if (quota.scope === 'agency') return quota.agency_id ? `Agence ${quota.agency_id}` : 'Agence';
  return 'Global';
};

const ratioLabel = (value: number, limit: number | null) => {
  if (limit === null || limit <= 0) return 'Non limité';
  return `${percentFormatter.format(Math.min(100, (value / limit) * 100))} %`;
};

const statusBadgeVariant = (status: string | null | undefined) => {
  if (status === 'success') return 'success' as const;
  if (status === 'failed') return 'destructive' as const;
  return 'secondary' as const;
};

const usageStatusVariant = (status: string, cacheHit: boolean) => {
  if (status === 'error' || status === 'blocked') return 'destructive' as const;
  if (cacheHit || status === 'cache_hit') return 'secondary' as const;
  return 'success' as const;
};

/**
 * Premium Admin AI Panel.
 * Manages OpenRouter keys, models list, quota policy settings, and usage metrics
 * using a clean tabbed panel instead of a single long scroll.
 */
const AdminAiPanel = () => {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('config');
  const [apiKey, setApiKey] = useState('');
  const [selectedQuotaId, setSelectedQuotaId] = useState<string | null>(null);
  const [quotaEdit, setQuotaEdit] = useState<QuotaEditState>({ quotaId: null, form: emptyQuotaForm });
  const [modelEdit, setModelEdit] = useState<ModelEditState>({ modelId: null, form: defaultDeepSeekModelForm });

  // Confirmation dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    description: '',
    onConfirm: () => {}
  });

  const settingsQuery = useQuery({
    queryKey: aiSettingsKey(),
    queryFn: getAiSettings,
    staleTime: 30_000
  });

  const usageSummaryQuery = useQuery({
    queryKey: aiUsageSummaryKey(USAGE_DAYS),
    queryFn: () => getAiUsageSummary({ days: USAGE_DAYS }),
    staleTime: 30_000
  });

  const usageEventsQuery = useQuery({
    queryKey: aiUsageEventsKey(1, USAGE_PAGE_SIZE),
    queryFn: () => listAiUsageEvents({ page: 1, page_size: USAGE_PAGE_SIZE }),
    staleTime: 30_000
  });

  const provider = settingsQuery.data?.providers.find((item) => item.provider === AI_PROVIDER) ?? null;
  const providerModels = useMemo(
    () => settingsQuery.data?.models.filter((item) => item.provider === AI_PROVIDER) ?? [],
    [settingsQuery.data?.models]
  );
  const defaultModel = providerModels.find((item) => item.is_default) ?? providerModels[0] ?? null;
  const deepSeekModel = providerModels.find((item) => item.model_id === DEEPSEEK_V4_PRO_MODEL_ID) ?? null;
  const editedModelSource = deepSeekModel ?? defaultModel;
  const modelForm = editedModelSource && modelEdit.modelId === editedModelSource.id
    ? modelEdit.form
    : editedModelSource
      ? modelToForm(editedModelSource)
      : defaultDeepSeekModelForm;
  const quotaPolicies = useMemo(() => settingsQuery.data?.quotas ?? [], [settingsQuery.data?.quotas]);
  const selectedQuota = quotaPolicies.find((item) => item.id === selectedQuotaId) ?? quotaPolicies[0] ?? null;
  const quotaForm = selectedQuota && quotaEdit.quotaId === selectedQuota.id
    ? quotaEdit.form
    : selectedQuota
      ? quotaToForm(selectedQuota)
      : emptyQuotaForm;
  const summary = usageSummaryQuery.data?.summary;
  const dailyPoints = summary?.daily ?? [];
  const dailyMaxCalls = Math.max(1, ...dailyPoints.map((point) => point.calls));
  const dailyMaxCost = Math.max(0.0001, ...dailyPoints.map((point) => point.cost_amount));
  const totalTokens = (summary?.input_tokens ?? 0)
    + (summary?.output_tokens ?? 0)
    + (summary?.cached_input_tokens ?? 0)
    + (summary?.reasoning_tokens ?? 0);

  const updateQuotaForm = (updater: (current: QuotaForm) => QuotaForm) => {
    setQuotaEdit({
      quotaId: selectedQuota?.id ?? null,
      form: updater(quotaForm)
    });
  };

  const updateModelForm = (updater: (current: ModelForm) => ModelForm) => {
    setModelEdit({
      modelId: editedModelSource?.id ?? null,
      form: updater(modelForm)
    });
  };

  const invalidateAiQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: aiSettingsKey() }),
      queryClient.invalidateQueries({ queryKey: aiUsageSummaryKey(USAGE_DAYS) }),
      queryClient.invalidateQueries({ queryKey: aiUsageEventsKey(1, USAGE_PAGE_SIZE) })
    ]);
  };

  const saveProviderMutation = useMutation({
    mutationFn: () => saveAiProvider({
      provider: AI_PROVIDER,
      enabled: !provider?.enabled,
      ...(apiKey.trim() ? { api_key: apiKey.trim() } : {}),
      base_url: provider?.base_url ?? null,
      organization_id: provider?.organization_id ?? null
    }),
    onSuccess: async () => {
      setApiKey('');
      await invalidateAiQueries();
    },
    onError: (error) => handleUiError(error, 'Impossible de sauvegarder le fournisseur IA.')
  });

  const saveKeyMutation = useMutation({
    mutationFn: () => saveAiProvider({
      provider: AI_PROVIDER,
      enabled: provider?.enabled ?? false,
      api_key: apiKey.trim(),
      base_url: provider?.base_url ?? null,
      organization_id: provider?.organization_id ?? null
    }),
    onSuccess: async () => {
      setApiKey('');
      await invalidateAiQueries();
    },
    onError: (error) => handleUiError(error, 'Impossible de sauvegarder la clé IA.')
  });

  const saveModelMutation = useMutation({
    mutationFn: () => saveAiModel({
      provider: AI_PROVIDER,
      model_id: modelForm.model_id.trim(),
      label: modelForm.label.trim(),
      enabled: modelForm.enabled,
      is_default: modelForm.is_default,
      currency: modelForm.currency.trim() || 'USD',
      input_price_per_million: parseNullableLimit(modelForm.input_price_per_million, false, 'Prix input par million'),
      output_price_per_million: parseNullableLimit(modelForm.output_price_per_million, false, 'Prix output par million'),
      cached_input_price_per_million: parseNullableLimit(modelForm.cached_input_price_per_million, false, 'Prix cache par million'),
      reasoning_price_per_million: parseNullableLimit(modelForm.reasoning_price_per_million, false, 'Prix reasoning par million'),
      price_effective_at: null,
      max_output_tokens: parseNullableLimit(modelForm.max_output_tokens, true, 'Sortie max') ?? 2000,
      temperature: parseNullableLimit(modelForm.temperature, false, 'Température') ?? 0.2
    }),
    onSuccess: invalidateAiQueries,
    onError: (error) => handleUiError(error, 'Impossible de sauvegarder le modèle IA.')
  });

  const testProviderMutation = useMutation({
    mutationFn: () => testAiProvider({
      provider: AI_PROVIDER,
      ...(apiKey.trim() ? { api_key: apiKey.trim() } : {})
    }),
    onSuccess: invalidateAiQueries,
    onError: (error) => handleUiError(error, 'Impossible de tester OpenRouter.')
  });

  const saveQuotaMutation = useMutation({
    mutationFn: () => {
      if (!selectedQuota) {
        return Promise.reject(createAppError({
          code: 'DB_READ_FAILED',
          message: 'Aucune politique de quota IA disponible.',
          source: 'db'
        }));
      }
      return saveAiQuota({
        id: selectedQuota.id,
        enabled: quotaForm.enabled,
        daily_call_limit: parseNullableLimit(quotaForm.daily_call_limit, true, 'Limite appels jour'),
        monthly_call_limit: parseNullableLimit(quotaForm.monthly_call_limit, true, 'Limite appels mois'),
        daily_token_limit: parseNullableLimit(quotaForm.daily_token_limit, true, 'Limite tokens jour'),
        monthly_token_limit: parseNullableLimit(quotaForm.monthly_token_limit, true, 'Limite tokens mois'),
        daily_cost_limit: parseNullableLimit(quotaForm.daily_cost_limit, false, 'Limite coût jour'),
        monthly_cost_limit: parseNullableLimit(quotaForm.monthly_cost_limit, false, 'Limite coût mois'),
        currency: quotaForm.currency.trim() || 'USD'
      });
    },
    onSuccess: invalidateAiQueries,
    onError: (error) => handleUiError(error, 'Impossible de sauvegarder le quota IA.')
  });

  const triggerConfirm = (title: string, description: string, onConfirm: () => void) => {
    setConfirmConfig({ title, description, onConfirm });
    setConfirmOpen(true);
  };

  const lastTestLabel = provider?.last_test_status === 'success'
    ? 'Valide'
    : provider?.last_test_status === 'failed'
      ? 'Échec'
      : 'Non testé';
  const monthlyCallsRatio = ratioLabel(summary?.calls ?? 0, selectedQuota?.monthly_call_limit ?? null);
  const monthlyTokensRatio = ratioLabel(totalTokens, selectedQuota?.monthly_token_limit ?? null);
  const monthlyCostRatio = ratioLabel(summary?.cost_amount ?? 0, selectedQuota?.monthly_cost_limit ?? null);

  return (
    <div className="space-y-6 pb-6" data-testid="admin-ai-panel">
      {/* Title & Governance Panel */}
      <section className="border border-primary/20 bg-gradient-to-br from-background via-surface-1 to-primary/[0.01] p-5 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.01)] border-l-4 border-l-primary flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-bold text-foreground font-sans">Gouvernance IA</h2>
          </div>
          <p className="max-w-[88ch] text-xs text-muted-foreground leading-relaxed">
            OpenRouter est le seul fournisseur IA configuré. Les clés, limites, usages et coûts sont cryptés et traités côté serveur.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8.5 text-xs font-semibold active:scale-[0.98] transition-all bg-background shadow-sm"
          onClick={() => invalidateAiQueries()}
          disabled={settingsQuery.isFetching || usageSummaryQuery.isFetching || usageEventsQuery.isFetching}
        >
          <RefreshCw className="size-3.5 mr-1.5" aria-hidden="true" />
          Actualiser
        </Button>
      </section>

      {/* Internal Subtabs */}
      <Tabs
        value={activeSubTab}
        onValueChange={(val) => setActiveSubTab(val as SubTabId)}
        className="flex flex-col w-full"
      >
        <TabsList className="flex h-10 w-full justify-start gap-6 border-b border-border/40 bg-transparent p-0 rounded-none shrink-0 mb-4">
          <TabsTrigger
            value="config"
            className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-1 pb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none flex items-center gap-2"
          >
            <Settings className="size-4" />
            <span>Configuration & Clés</span>
          </TabsTrigger>
          <TabsTrigger
            value="quotas"
            className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-1 pb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none flex items-center gap-2"
          >
            <SlidersHorizontal className="size-4" />
            <span>Limites & Quotas</span>
          </TabsTrigger>
          <TabsTrigger
            value="stats"
            className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-1 pb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none flex items-center gap-2"
          >
            <Activity className="size-4" />
            <span>Usages & Audits</span>
          </TabsTrigger>
        </TabsList>

        {/* Subtab 1: Configuration */}
        <TabsContent value="config" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(26rem,0.72fr)]">
            <div className="space-y-6">
              {/* Provider Info */}
              <div className="border border-border/40 bg-surface-2/10 p-5 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/20 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-foreground font-sans">OpenRouter</h3>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      Endpoint sécurisé. Les clés sont conservées chiffrées côté serveur et ne transitent jamais sur le réseau.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 shrink-0">
                    <Badge variant={provider?.enabled ? 'success' : 'secondary'} className="px-2 py-0.5 text-[9px] font-semibold uppercase">
                      {provider?.enabled ? 'Actif' : 'Inactif'}
                    </Badge>
                    <Badge variant={provider?.has_api_key ? 'success' : 'destructive'} className="px-2 py-0.5 text-[9px] font-semibold uppercase">
                      {provider?.has_api_key ? `Clé ${provider.api_key_last4 ?? 'enregistrée'}` : 'Clé absente'}
                    </Badge>
                    <Badge variant={statusBadgeVariant(provider?.last_test_status)} className="px-2 py-0.5 text-[9px] font-semibold uppercase">
                      {lastTestLabel}
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                  <MetricCard label="Modèle par défaut" value={defaultModel?.label ?? 'Non configuré'} detail={defaultModel?.model_id ?? '-'} />
                  <MetricCard label="Modèles autorisés" value={numberFormatter.format(providerModels.filter((item) => item.enabled).length)} detail={`${numberFormatter.format(providerModels.length)} déclarés`} />
                  <MetricCard label="Dernier test" value={lastTestLabel} detail={provider?.last_test_at ? new Date(provider.last_test_at).toLocaleDateString('fr-FR') : '-'} />
                  <MetricCard label="Source de coût" value="Serveur" detail="usage.cost OpenRouter puis barème modèle" />
                </div>

                {/* API Key Form */}
                <form
                  className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] items-end border-t border-border/20 pt-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    triggerConfirm(
                      'Enregistrer la clé API ?',
                      'Êtes-vous sûr de vouloir remplacer la clé API existante pour OpenRouter ?',
                      () => saveKeyMutation.mutate()
                    );
                  }}
                >
                  <div className="space-y-1.5 min-w-0">
                    <label htmlFor="ai-api-key" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Clé API OpenRouter
                    </label>
                    <input
                      id="ai-api-key"
                      type="password"
                      name="openrouter-api-key"
                      value={apiKey}
                      onChange={(event) => setApiKey(event.target.value)}
                      placeholder="Coller une nouvelle clé pour remplacement"
                      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      autoComplete="off"
                    />
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button type="submit" size="sm" className="h-9 text-xs" disabled={!apiKey.trim() || saveKeyMutation.isPending}>
                      <KeyRound className="size-3.5 mr-1.5" aria-hidden="true" />
                      Enregistrer
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 text-xs"
                      onClick={() => testProviderMutation.mutate()}
                      disabled={testProviderMutation.isPending || (!apiKey.trim() && !provider?.has_api_key)}
                    >
                      <PlayCircle className="size-3.5 mr-1.5" aria-hidden="true" />
                      Tester
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 text-xs"
                      onClick={() => {
                        const nextState = provider?.enabled ? 'désactiver' : 'activer';
                        triggerConfirm(
                          `${nextState.charAt(0).toUpperCase() + nextState.slice(1)} le fournisseur ?`,
                          `Voulez-vous vraiment ${nextState} OpenRouter dans l'application ?`,
                          () => saveProviderMutation.mutate()
                        );
                      }}
                      disabled={saveProviderMutation.isPending || (!provider?.enabled && !provider?.has_api_key && !apiKey.trim())}
                    >
                      {provider?.enabled ? 'Désactiver' : 'Activer'}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Model Pricing/Settings Form */}
              <form
                className="space-y-4 border border-border/40 bg-surface-2/10 p-5 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.01)]"
                onSubmit={(event) => {
                  event.preventDefault();
                  triggerConfirm(
                    'Modifier la configuration du modèle ?',
                    'Voulez-vous enregistrer les nouveaux prix et paramètres pour le modèle par défaut ?',
                    () => saveModelMutation.mutate()
                  );
                }}
              >
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Configuration du modèle OpenRouter</h4>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                    Pour DeepSeek V4 Pro, renseignez l&apos;identifiant OpenRouter `deepseek/deepseek-v4-pro`.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextInput
                    id="ai-model-id"
                    label="Identifiant modèle (ID)"
                    value={modelForm.model_id}
                    onChange={(value) => updateModelForm((current) => ({ ...current, model_id: value }))}
                  />
                  <TextInput
                    id="ai-model-label"
                    label="Libellé affiché"
                    value={modelForm.label}
                    onChange={(value) => updateModelForm((current) => ({ ...current, label: value }))}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <QuotaInput label="Coût Entrée / 1M tokens" value={modelForm.input_price_per_million} onChange={(value) => updateModelForm((current) => ({ ...current, input_price_per_million: value }))} disabled={false} />
                  <QuotaInput label="Coût Sortie / 1M tokens" value={modelForm.output_price_per_million} onChange={(value) => updateModelForm((current) => ({ ...current, output_price_per_million: value }))} disabled={false} />
                  <QuotaInput label="Taille de sortie max" value={modelForm.max_output_tokens} onChange={(value) => updateModelForm((current) => ({ ...current, max_output_tokens: value }))} disabled={false} />
                </div>
                <div className="grid gap-4 md:grid-cols-[10rem_10rem_minmax(0,1fr)_auto] items-end border-t border-border/20 pt-4">
                  <TextInput
                    id="ai-model-currency"
                    label="Devise"
                    value={modelForm.currency}
                    onChange={(value) => updateModelForm((current) => ({ ...current, currency: value.toUpperCase().slice(0, 3) }))}
                  />
                  <QuotaInput label="Température" value={modelForm.temperature} onChange={(value) => updateModelForm((current) => ({ ...current, temperature: value }))} disabled={false} />
                  <div className="flex gap-2">
                    <label className="flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs text-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={modelForm.enabled}
                        onChange={(event) => updateModelForm((current) => ({ ...current, enabled: event.target.checked }))}
                        className="rounded border-input text-primary focus:ring-primary"
                      />
                      Autorisé
                    </label>
                    <label className="flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs text-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={modelForm.is_default}
                        onChange={(event) => updateModelForm((current) => ({ ...current, is_default: event.target.checked }))}
                        className="rounded border-input text-primary focus:ring-primary"
                      />
                      Défaut
                    </label>
                  </div>
                  <Button type="submit" size="sm" className="h-9 text-xs" disabled={saveModelMutation.isPending}>
                    Sauvegarder le modèle
                  </Button>
                </div>
              </form>
            </div>

            {/* List of Models Table */}
            <aside className="border border-border/40 bg-surface-2/10 p-5 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col h-fit">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Liste des modèles autorisés</h4>
                <p className="mt-1 text-[11px] text-muted-foreground leading-normal">Modèles accessibles par les Edge Functions.</p>
              </div>
              <div className="mt-4 overflow-hidden border border-border/50 rounded-xl bg-background">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border/60 bg-surface-2 text-[10px] uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2.5">Modèle</th>
                      <th className="px-3 py-2.5">Statut</th>
                      <th className="px-3 py-2.5">Sortie Max</th>
                      <th className="px-3 py-2.5">Tarification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {providerModels.map((model) => (
                      <tr key={model.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-3 py-2.5">
                          <p className="font-semibold text-foreground">{model.label}</p>
                          <p className="font-mono text-[10px] text-muted-foreground leading-none mt-0.5">{model.model_id}</p>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {model.is_default && <Badge variant="success" className="px-1.5 py-0 text-[9px] font-semibold uppercase">Défaut</Badge>}
                            <Badge variant={model.enabled ? 'secondary' : 'outline'} className="px-1.5 py-0 text-[9px] font-medium">
                              {model.enabled ? 'Autorisé' : 'Bloqué'}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-muted-foreground">{numberFormatter.format(model.max_output_tokens)}</td>
                        <td className="px-3 py-2.5 font-mono text-muted-foreground">
                          {model.input_price_per_million === null || model.output_price_per_million === null
                            ? 'Déterminé par OpenRouter'
                            : `${model.input_price_per_million}/${model.output_price_per_million} ${model.currency}`}
                        </td>
                      </tr>
                    ))}
                    {providerModels.length === 0 && (
                      <tr>
                        <td className="px-3 py-4 text-center text-muted-foreground" colSpan={4}>Aucun modèle OpenRouter configuré.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </aside>
          </div>
        </TabsContent>

        {/* Subtab 2: Quotas */}
        <TabsContent value="quotas" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.58fr)]">
            {/* Quota Settings Form */}
            <div className="border border-border/40 bg-surface-2/10 p-5 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-4">
              <div className="flex items-center gap-2 border-b border-border/20 pb-3">
                <SlidersHorizontal className="size-4.5 text-primary" aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-bold text-foreground font-sans">Configuration des limites</h3>
                  <p className="text-xs text-muted-foreground">Ces limites protègent vos budgets avant de contacter le provider.</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem] items-end">
                <div className="space-y-1.5 min-w-0">
                  <label htmlFor="ai-quota-policy" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Sélectionner le périmètre de quota
                  </label>
                  <select
                    id="ai-quota-policy"
                    value={selectedQuota?.id ?? ''}
                    onChange={(event) => {
                      setSelectedQuotaId(event.target.value || null);
                      setQuotaEdit({ quotaId: null, form: emptyQuotaForm });
                    }}
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:ring-1 focus:ring-primary"
                    disabled={quotaPolicies.length === 0}
                  >
                    {quotaPolicies.map((quota) => (
                      <option key={quota.id} value={quota.id}>
                        {scopeLabel(quota)} - {featureLabel(quota.feature)}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={quotaForm.enabled}
                    onChange={(event) => updateQuotaForm((current) => ({ ...current, enabled: event.target.checked }))}
                    disabled={!selectedQuota}
                    className="rounded border-input text-primary focus:ring-primary"
                  />
                  Quota actif
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 border-t border-border/25 pt-4">
                <QuotaInput label="Limite Appels / jour" value={quotaForm.daily_call_limit} onChange={(value) => updateQuotaForm((current) => ({ ...current, daily_call_limit: value }))} disabled={!selectedQuota} />
                <QuotaInput label="Limite Appels / mois" value={quotaForm.monthly_call_limit} onChange={(value) => updateQuotaForm((current) => ({ ...current, monthly_call_limit: value }))} disabled={!selectedQuota} />
                <QuotaInput label="Limite Tokens / jour" value={quotaForm.daily_token_limit} onChange={(value) => updateQuotaForm((current) => ({ ...current, daily_token_limit: value }))} disabled={!selectedQuota} />
                <QuotaInput label="Limite Tokens / mois" value={quotaForm.monthly_token_limit} onChange={(value) => updateQuotaForm((current) => ({ ...current, monthly_token_limit: value }))} disabled={!selectedQuota} />
                <QuotaInput label="Coût Max / jour" value={quotaForm.daily_cost_limit} onChange={(value) => updateQuotaForm((current) => ({ ...current, daily_cost_limit: value }))} disabled={!selectedQuota} />
                <QuotaInput label="Coût Max / mois" value={quotaForm.monthly_cost_limit} onChange={(value) => updateQuotaForm((current) => ({ ...current, monthly_cost_limit: value }))} disabled={!selectedQuota} />
              </div>

              <div className="flex flex-wrap items-end justify-between gap-4 border-t border-border/20 pt-4">
                <div className="space-y-1.5 w-24">
                  <label htmlFor="ai-quota-currency" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Devise
                  </label>
                  <input
                    id="ai-quota-currency"
                    value={quotaForm.currency}
                    onChange={(event) => updateQuotaForm((current) => ({ ...current, currency: event.target.value.toUpperCase().slice(0, 3) }))}
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:ring-1 focus:ring-primary"
                    disabled={!selectedQuota}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() =>
                    triggerConfirm(
                      'Mettre à jour les quotas ?',
                      'Confirmez-vous la modification de la politique de quotas et des seuils financiers associés ?',
                      () => saveQuotaMutation.mutate()
                    )
                  }
                  disabled={!selectedQuota || saveQuotaMutation.isPending}
                >
                  Sauvegarder le quota
                </Button>
              </div>
            </div>

            {/* Quota status / summary */}
            <div className="border border-border/40 bg-surface-2/10 p-5 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ratios de consommation (30j)</h4>
                <p className="mt-1 text-[11px] text-muted-foreground leading-normal">État d&apos;exploitation actuel par rapport aux quotas définis.</p>
              </div>
              <div className="space-y-3.5">
                <MetricCard label="Appels consommés" value={numberFormatter.format(summary?.calls ?? 0)} detail={`Ratio du quota : ${monthlyCallsRatio}`} />
                <MetricCard label="Tokens consommés" value={numberFormatter.format(totalTokens)} detail={`Ratio du quota : ${monthlyTokensRatio}`} />
                <MetricCard label="Coût consommé" value={`${compactCostFormatter.format(summary?.cost_amount ?? 0)} ${summary?.currency ?? 'USD'}`} detail={`Ratio du quota : ${monthlyCostRatio}`} />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Subtab 3: Stats & Audits */}
        <TabsContent value="stats" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,0.64fr)]">
            <div className="space-y-6">
              {/* Summary stats */}
              <div className="grid gap-3 grid-cols-2">
                <MetricCard label="Appels globaux" value={numberFormatter.format(summary?.calls ?? 0)} detail={`${numberFormatter.format(summary?.successful_calls ?? 0)} succès / ${numberFormatter.format(summary?.failed_calls ?? 0)} erreurs`} />
                <MetricCard label="Coût total réel" value={`${costFormatter.format(summary?.cost_amount ?? 0)} ${summary?.currency ?? 'USD'}`} detail="Intégralité des appels serveurs" />
                <MetricCard label="Tokens consommés" value={numberFormatter.format(totalTokens)} detail={`Entrées, sorties et cache`} />
                <MetricCard label="Économie cache" value={numberFormatter.format(summary?.cache_hits ?? 0)} detail={`${ratioLabel(summary?.cache_hits ?? 0, summary?.calls ?? null)} des appels filtrés`} />
              </div>

              {/* Consumption charts */}
              <div className="border border-border/40 bg-surface-2/10 p-5 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-4">
                <div className="flex items-center gap-2 border-b border-border/20 pb-2.5">
                  <BarChart3 className="size-4 text-muted-foreground" aria-hidden="true" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Historique d&apos;activité journalière</h4>
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <UsageBars label="Volume d'appels" points={dailyPoints.map((point) => ({
                    key: point.date,
                    label: point.date.slice(5),
                    value: point.calls,
                    max: dailyMaxCalls
                  }))} />
                  <UsageBars label="Budget dépensé" points={dailyPoints.map((point) => ({
                    key: point.date,
                    label: point.date.slice(5),
                    value: point.cost_amount,
                    max: dailyMaxCost
                  }))} />
                </div>
              </div>
            </div>

            {/* Logs events */}
            <div className="border border-border/40 bg-surface-2/10 p-5 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col">
              <div className="mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Derniers événements IA</h3>
                <p className="mt-1 text-[11px] text-muted-foreground leading-normal">Journal d&apos;audit factuel des transactions serveur.</p>
              </div>
              <div className="overflow-hidden border border-border/50 rounded-xl bg-background">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border/60 bg-surface-2 text-[10px] uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2.5">Date</th>
                      <th className="px-3 py-2.5">Statut</th>
                      <th className="px-3 py-2.5">Module & Modèle</th>
                      <th className="px-3 py-2.5">Tokens / Coût</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {((usageEventsQuery.data?.events ?? []) as Array<AiUsageEvent>).map((event) => (
                      <tr key={event.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-3 py-2.5 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                          {new Date(event.created_at).toLocaleString('fr-FR', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant={usageStatusVariant(event.status, event.cache_hit)} className="px-1.5 py-0 text-[9px] font-semibold uppercase">
                            {event.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 min-w-0 max-w-[12rem] truncate">
                          <p className="font-semibold text-foreground leading-tight truncate">{featureLabel(event.feature)}</p>
                          <p className="font-mono text-[10px] text-muted-foreground truncate leading-none mt-0.5">{event.model_id}</p>
                          {event.error_message && (
                            <p className="mt-1 text-[10px] text-destructive leading-tight line-clamp-1" title={event.error_message}>
                              {event.error_message}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                          <p className="font-semibold text-foreground">
                            {event.cost_amount === null ? '-' : `${compactCostFormatter.format(event.cost_amount)} ${event.currency}`}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                            {numberFormatter.format(event.input_tokens + event.output_tokens + event.cached_input_tokens + event.reasoning_tokens)} tkn
                          </p>
                        </td>
                      </tr>
                    ))}
                    {(usageEventsQuery.data?.events ?? []).length === 0 && (
                      <tr>
                        <td className="px-3 py-4 text-center text-muted-foreground" colSpan={4}>Aucun événement IA enregistré.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog widget */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmConfig.title}
        description={confirmConfig.description}
        onConfirm={confirmConfig.onConfirm}
        confirmLabel="Confirmer"
        cancelLabel="Annuler"
      />
    </div>
  );
};

const MetricCard = ({ label, value, detail }: { label: string; value: string; detail: string }) => (
  <div className="border border-border/60 bg-background/50 px-4 py-3 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:border-primary/25 transition-all">
    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">{label}</p>
    <p className="mt-1.5 min-h-5 truncate font-mono text-sm font-bold text-foreground leading-none">{value}</p>
    <p className="mt-1 min-h-4 text-[10px] text-muted-foreground leading-normal">{detail}</p>
  </div>
);

const UsageBars = ({
  label,
  points
}: {
  label: string;
  points: Array<{ key: string; label: string; value: number; max: number }>;
}) => (
  <div className="min-w-0">
    <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">{label}</p>
    <div className="flex h-28 items-end gap-1.5 overflow-hidden border-l border-b border-border/60 px-2 pt-2">
      {points.map((point) => (
        <div key={point.key} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1 group relative">
          <div
            className="min-h-[2px] w-full rounded-t-sm bg-primary/75 hover:bg-primary transition-colors cursor-pointer"
            style={{ height: `${Math.max(2, Math.round((point.value / point.max) * 100))}%` }}
          />
          {/* Custom micro-tooltip on hover */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-foreground text-background text-[9px] font-mono px-1.5 py-0.5 rounded shadow-md z-15 whitespace-nowrap">
            {point.label} : {compactCostFormatter.format(point.value)}
          </div>
        </div>
      ))}
    </div>
    <div className="mt-1.5 flex justify-between text-[9px] font-mono text-muted-foreground">
      <span>{points[0]?.label ?? '-'}</span>
      <span>{points[points.length - 1]?.label ?? '-'}</span>
    </div>
  </div>
);

const QuotaInput = ({
  label,
  value,
  onChange,
  disabled
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) => (
  <div className="space-y-1.5">
    <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
    <input
      type="number"
      min="0"
      step="any"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Sans limite"
      className="h-9 w-full rounded-lg border border-input bg-background px-3 font-mono text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
      disabled={disabled}
    />
  </div>
);

const TextInput = ({
  id,
  label,
  value,
  onChange
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <div className="space-y-1.5 min-w-0">
    <label htmlFor={id} className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</label>
    <input
      id={id}
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
    />
  </div>
);

export default AdminAiPanel;
