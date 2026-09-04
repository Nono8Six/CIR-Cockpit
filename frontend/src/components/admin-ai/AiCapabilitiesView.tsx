import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  KeyRound,
  Pencil,
  Plus,
  Radio,
  RefreshCw,
  Trash2,
  XCircle,
} from 'lucide-react';

import type {
  AiFeature,
  AiModelConfig,
  AiProvider,
  AiProviderConfig,
} from '../../../../shared/schemas/ai.schema';
import { isCirDirectProviderId } from 'shared/constants/ai';
import { Badge } from '@/components/ui/data-display/Badge';
import { Button } from '@/components/ui/inputs/basic/Button';
import { Input } from '@/components/ui/inputs/basic/Input';
import { Switch } from '@/components/ui/inputs/basic/Switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/inputs/selects/Select';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/feedback/Dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/feedback/AlertDialog';
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
  deleteAiModel,
  getAiSettings,
  getAiUsageSummary,
  listAiPrompts,
  saveAiFeatureAssignment,
  saveAiModel,
  saveAiProvider,
  testAiProvider,
} from '@/services/ai';
import { handleUiError } from '@/services/errors/handleUiError';
import {
  aiPromptsKey,
  aiSettingsKey,
  aiUsageSummaryKey,
} from '@/services/query/queryKeys';
import {
  AI_DAYS,
  featureLabels,
  features,
  featureSurfaces,
  Field,
  formatCost,
  formatDate,
  formatNumber,
  SectionState,
} from './aiAdminUi';

type ModelFormData = {
  id?: string;
  provider: AiProvider;
  model_id: string;
  label: string;
  enabled: boolean;
  is_default: boolean;
  input: string;
  output: string;
  max: string;
  temperature: string;
};

const emptyModelForm: ModelFormData = {
  provider: 'mistral',
  model_id: '',
  label: '',
  enabled: true,
  is_default: false,
  input: '',
  output: '',
  max: '2000',
  temperature: '0.2',
};

const fromModel = (m: AiModelConfig): ModelFormData => ({
  id: m.id,
  provider: m.provider,
  model_id: m.model_id,
  label: m.label,
  enabled: m.enabled,
  is_default: m.is_default,
  input: m.input_price_per_million?.toString() ?? '',
  output: m.output_price_per_million?.toString() ?? '',
  max: m.max_output_tokens.toString(),
  temperature: formatTemperature(m.temperature),
});

const formatTemperature = (t: number): string => {
  // Au plus 2 décimales pour éviter 0.20000000298023224
  const rounded = Math.round(t * 100) / 100;
  return rounded.toString();
};

const numberOrNull = (value: string) =>
  value.trim() ? Number(value.replace(',', '.')) : null;

type TestModalState = {
  open: boolean;
  providerLabel: string;
  status: 'success' | 'failed' | 'error';
  message: string;
} | null;

export const AiCapabilitiesView = () => {
  const client = useQueryClient();

  const [assigningFeature, setAssigningFeature] = useState<AiFeature | null>(null);
  const [selectedModelIdForAssignment, setSelectedModelIdForAssignment] = useState<string | 'null'>('null');

  const [modelForm, setModelForm] = useState<ModelFormData | null>(null);
  const [deletingModel, setDeletingModel] = useState<AiModelConfig | null>(null);

  const [providerApiKeys, setProviderApiKeys] = useState<Record<string, string>>({});
  const [testModal, setTestModal] = useState<TestModalState>(null);

  const settings = useQuery({
    queryKey: aiSettingsKey(),
    queryFn: getAiSettings,
  });

  const prompts = useQuery({
    queryKey: aiPromptsKey(),
    queryFn: () => listAiPrompts(),
  });

  const usage = useQuery({
    queryKey: aiUsageSummaryKey(AI_DAYS),
    queryFn: () => getAiUsageSummary({ days: AI_DAYS }),
  });

  const refresh = () => client.invalidateQueries({ queryKey: aiSettingsKey() });

  const saveAssignmentMutation = useMutation({
    mutationFn: async ({
      feature,
      model_config_id,
    }: {
      feature: AiFeature;
      model_config_id: string | null;
    }) => {
      return saveAiFeatureAssignment({
        feature,
        model_config_id,
      });
    },
    onSuccess: async () => {
      setAssigningFeature(null);
      await refresh();
    },
    onError: (e) => handleUiError(e, 'Impossible d’enregistrer l’affectation de modèle.'),
  });

  const saveModelMutation = useMutation({
    mutationFn: () => {
      if (!modelForm) return Promise.reject(new Error('Formulaire absent'));
      return saveAiModel({
        provider: modelForm.provider,
        model_id: modelForm.model_id.trim(),
        label: modelForm.label.trim(),
        enabled: modelForm.enabled,
        is_default: modelForm.is_default,
        currency: 'USD',
        input_price_per_million: numberOrNull(modelForm.input),
        output_price_per_million: numberOrNull(modelForm.output),
        cached_input_price_per_million: null,
        reasoning_price_per_million: null,
        price_effective_at: null,
        max_output_tokens: Number(modelForm.max),
        temperature: Number(modelForm.temperature),
      });
    },
    onSuccess: async () => {
      setModelForm(null);
      await refresh();
    },
    onError: (e) => handleUiError(e, 'Impossible de sauvegarder le modèle IA.'),
  });

  const deleteModelMutation = useMutation({
    mutationFn: (id: string) => deleteAiModel({ id }),
    onSuccess: async () => {
      setDeletingModel(null);
      await refresh();
    },
    onError: (e) => {
      setDeletingModel(null);
      handleUiError(e, 'Impossible de supprimer le modèle IA.');
    },
  });

  const saveProviderMutation = useMutation({
    mutationFn: async (providerConfig: AiProviderConfig) => {
      const apiKey = providerApiKeys[providerConfig.provider]?.trim();
      return saveAiProvider({
        provider: providerConfig.provider,
        enabled: providerConfig.enabled,
        ...(apiKey ? { api_key: apiKey } : {}),
        base_url: providerConfig.base_url ?? null,
        organization_id: providerConfig.organization_id ?? null,
      });
    },
    onSuccess: async (_, providerConfig) => {
      setProviderApiKeys((prev) => ({ ...prev, [providerConfig.provider]: '' }));
      await refresh();
    },
    onError: (e) => handleUiError(e, 'Impossible d’enregistrer la configuration du fournisseur IA.'),
  });

  const testProviderMutation = useMutation({
    mutationFn: async (providerConfig: AiProviderConfig) => {
      const apiKey = providerApiKeys[providerConfig.provider]?.trim();
      return testAiProvider({
        provider: providerConfig.provider,
        ...(apiKey ? { api_key: apiKey } : {}),
      });
    },
    onSuccess: async (res, providerConfig) => {
      setTestModal({
        open: true,
        providerLabel: providerConfig.label,
        status: res.status,
        message: res.message,
      });
      await refresh();
    },
    onError: (e, providerConfig) => {
      setTestModal({
        open: true,
        providerLabel: providerConfig.label,
        status: 'error',
        message: e instanceof Error ? e.message : 'Erreur lors du test de connexion.',
      });
      handleUiError(e, 'Impossible de tester le fournisseur IA.');
    },
  });

  if (settings.isPending || prompts.isPending || usage.isPending) {
    return (
      <div className="space-y-6" data-testid="ai-capabilities-loading">
        <Skeleton className="h-44 rounded-lg skeleton-shimmer" />
        <Skeleton className="h-56 rounded-lg skeleton-shimmer" />
        <Skeleton className="h-44 rounded-lg skeleton-shimmer" />
      </div>
    );
  }

  if (settings.isError || prompts.isError || usage.isError) {
    return (
      <SectionState>
        Les capacités et modèles IA n’ont pas pu être chargés. Veuillez actualiser.
      </SectionState>
    );
  }

  const models = settings.data.models;
  const providers = settings.data.providers;
  const assignments = settings.data.assignments;
  const promptList = prompts.data.prompts;

  // Modèle de repli direct canonique (aiRunContext.ts:328-349)
  const directEnabledCandidates = models.filter(
    (m) => m.enabled && isCirDirectProviderId(m.provider)
  );
  const canonicalFallbackModel =
    directEnabledCandidates.find((m) => m.is_default) ?? directEnabledCandidates[0] ?? null;

  const resolveFeatureModel = (feature: AiFeature) => {
    const assignment = assignments.find((a) => a.feature === feature);
    if (assignment) {
      const assigned = models.find(
        (m) => m.id === assignment.model_config_id && m.enabled
      );
      if (assigned && isCirDirectProviderId(assigned.provider)) {
        return { model: assigned, isDirect: true, isInvalid: false };
      }
      // Affectation explicitement invalide, inactive ou non directe
      return { model: null, isDirect: false, isInvalid: true };
    }
    return { model: canonicalFallbackModel, isDirect: false, isInvalid: false };
  };

  const getDerivedFeatureStatus = (feature: AiFeature): 'Live' | 'Retirée' | 'Incomplète' => {
    if (feature === 'assistant.referentiels') {
      return 'Retirée';
    }

    const template = promptList.find((p) => p.feature === feature);
    if (template?.archived_at !== null && template?.archived_at !== undefined) {
      return 'Retirée';
    }

    const { model: resolvedModel } = resolveFeatureModel(feature);
    if (!resolvedModel) {
      return 'Incomplète';
    }

    const provider = providers.find((p) => p.provider === resolvedModel.provider);
    const hasKey = Boolean(provider?.has_api_key && provider?.enabled);
    const hasModel = Boolean(resolvedModel.enabled && isCirDirectProviderId(resolvedModel.provider));
    const hasPublishedPrompt = Boolean(template?.published_version);

    if (hasKey && hasModel && hasPublishedPrompt) {
      return 'Live';
    }

    return 'Incomplète';
  };

  const handleOpenAssignment = (feature: AiFeature) => {
    const currentAssignment = assignments.find((a) => a.feature === feature);
    setSelectedModelIdForAssignment(currentAssignment?.model_config_id ?? 'null');
    setAssigningFeature(feature);
  };

  return (
    <div className="space-y-8" data-testid="ai-capabilities-view">
      {/* 1. Tableau des capacités */}
      <section className="space-y-3" data-testid="ai-capabilities-table-section">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Capacités applicatives</h3>
          <p className="text-xs text-muted-foreground">
            Chaque capacité résout son modèle affecté, ou retombe sur le modèle de repli du fournisseur.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <Table>
            <TableHeader className="bg-surface-1">
              <TableRow>
                <TableHead className="w-[220px] text-xs">Capacité</TableHead>
                <TableHead className="text-xs">État</TableHead>
                <TableHead className="text-xs">Modèle résolu</TableHead>
                <TableHead className="text-xs">Prompt publié</TableHead>
                <TableHead className="text-xs">Autonomie</TableHead>
                <TableHead className="w-[110px] text-right text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {features.map(([feature, label]) => {
                const status = getDerivedFeatureStatus(feature);
                const { model: resolvedModel, isDirect: isDirectlyAssigned, isInvalid: isInvalidAssignment } =
                  resolveFeatureModel(feature);
                const template = promptList.find((p) => p.feature === feature);
                const publishedVersion = template?.published_version;

                return (
                  <TableRow key={feature} className="transition-colors hover:bg-surface-1/40">
                    <TableCell>
                      <p className="font-semibold text-foreground">{label}</p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground" title={featureSurfaces[feature]}>
                        {featureSurfaces[feature]}
                      </p>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          status === 'Live'
                            ? 'success'
                            : status === 'Retirée'
                              ? 'secondary'
                              : 'warning'
                        }
                      >
                        {status}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {resolvedModel ? (
                        <div>
                          <p className="text-xs font-medium text-foreground">
                            {isDirectlyAssigned ? resolvedModel.label : `Repli direct : ${resolvedModel.label}`}
                          </p>
                          <p className="font-mono text-[11px] text-muted-foreground">{resolvedModel.model_id}</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {isInvalidAssignment
                              ? 'Affectation non directe ou inactive'
                              : 'Aucun modèle direct'}
                          </p>
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="text-xs">
                      {publishedVersion ? (
                        <span className="font-mono text-[11px] font-medium text-foreground">
                          v{publishedVersion.version}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Non publié</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className="text-[11px]">
                        Lecture seule
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenAssignment(feature)}
                        data-testid={`btn-assign-${feature}`}
                      >
                        Affecter
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* 2. Modèles autorisés */}
      <section className="space-y-3" data-testid="ai-models-section">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Modèles autorisés</h3>
            <p className="text-xs text-muted-foreground">
              Paramétrez les modèles de chaque fournisseur. Les modèles marqués de repli servent lorsqu’aucune affectation directe n’existe.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setModelForm(emptyModelForm)}
            data-testid="btn-add-model"
          >
            <Plus className="mr-1.5 size-3.5" aria-hidden="true" />
            Ajouter un modèle
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {models.length > 0 ? (
            <Table>
              <TableHeader className="bg-surface-1">
                <TableRow>
                  <TableHead className="text-xs">Modèle</TableHead>
                  <TableHead className="text-xs">Fournisseur</TableHead>
                  <TableHead className="text-right text-xs">Tarif / M tokens</TableHead>
                  <TableHead className="text-right text-xs">Plafond sortie</TableHead>
                  <TableHead className="text-right text-xs">Température</TableHead>
                  <TableHead className="text-xs">Statut</TableHead>
                  <TableHead className="w-[90px] text-right text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((model) => (
                  <TableRow key={model.id} className="transition-colors hover:bg-surface-1/40">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{model.label}</span>
                        {/* Les deux modèles portant is_default doivent tous les deux afficher le badge */}
                        {model.is_default ? (
                          <Badge variant="success">Défaut provider</Badge>
                        ) : null}
                      </div>
                      <p className="font-mono text-[11px] text-muted-foreground">{model.model_id}</p>
                    </TableCell>

                    <TableCell className="text-xs font-medium text-foreground">
                      {providers.find((p) => p.provider === model.provider)?.label ?? model.provider}
                    </TableCell>

                    <TableCell className="text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                      {model.input_price_per_million !== null ? formatCost.format(model.input_price_per_million) : '—'} in /{' '}
                      {model.output_price_per_million !== null ? formatCost.format(model.output_price_per_million) : '—'} out
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs tabular-nums text-foreground">
                      {formatNumber.format(model.max_output_tokens)}
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs tabular-nums text-foreground">
                      {formatTemperature(model.temperature)}
                    </TableCell>

                    <TableCell>
                      <Badge variant={model.enabled ? 'outline' : 'secondary'}>
                        {model.enabled ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Modifier ${model.label}`}
                          onClick={() => setModelForm(fromModel(model))}
                        >
                          <Pencil className="size-3.5" aria-hidden="true" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Supprimer ${model.label}`}
                          disabled={model.is_default || deleteModelMutation.isPending}
                          title={model.is_default ? 'Impossible de supprimer un modèle de repli' : undefined}
                          onClick={() => setDeletingModel(model)}
                        >
                          <Trash2 className="size-3.5 text-destructive" aria-hidden="true" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <SectionState>Aucun modèle configuré. Ajoutez un premier modèle autorisé.</SectionState>
          )}
        </div>
      </section>

      {/* 3. Fournisseurs */}
      <section className="space-y-4" data-testid="ai-providers-section">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Fournisseurs d’inférence</h3>
          <p className="text-xs text-muted-foreground">
            Configuration des clés d’API directes par fournisseur.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {providers.map((provider) => {
            const apiKeyInput = providerApiKeys[provider.provider] ?? '';
            return (
              <div
                key={provider.provider}
                className="rounded-lg border border-border bg-card p-5"
                data-testid={`provider-card-${provider.provider}`}
              >
                <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <KeyRound className="size-4 text-primary" aria-hidden="true" />
                    <h4 className="text-sm font-semibold text-foreground">{provider.label}</h4>
                  </div>
                  <Badge variant={provider.enabled ? 'success' : 'secondary'}>
                    {provider.enabled ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>

                <div className="mt-3 space-y-1 text-xs">
                  <p className="text-muted-foreground">
                    Clé :{' '}
                    <span className="font-mono font-medium text-foreground">
                      {provider.has_api_key ? `••••${provider.api_key_last4 ?? ''}` : 'Absente'}
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    Dernier test :{' '}
                    <span className="text-foreground">{formatDate(provider.last_test_at)}</span>
                    {provider.last_test_status ? (
                      <span className="ml-1 text-[11px] text-muted-foreground">
                        ({provider.last_test_status === 'success' ? 'Succès' : 'Échec'})
                      </span>
                    ) : null}
                  </p>
                </div>

                <div className="mt-4 space-y-2">
                  <Field label="Remplacer la clé API" hint="Ne saisissez une valeur que pour remplacer la clé existante.">
                    <Input
                      type="password"
                      name="api_key"
                      autoComplete="off"
                      value={apiKeyInput}
                      onChange={(e) =>
                        setProviderApiKeys((prev) => ({
                          ...prev,
                          [provider.provider]: e.target.value,
                        }))
                      }
                      placeholder="Saisir une nouvelle clé…"
                    />
                  </Field>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={testProviderMutation.isPending}
                      onClick={() => testProviderMutation.mutate(provider)}
                    >
                      {testProviderMutation.isPending ? (
                        <RefreshCw className="mr-1.5 size-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Radio className="mr-1.5 size-3.5" aria-hidden="true" />
                      )}
                      Tester
                    </Button>
                    <Button
                      size="sm"
                      disabled={!apiKeyInput.trim() || saveProviderMutation.isPending}
                      onClick={() => saveProviderMutation.mutate(provider)}
                    >
                      Enregistrer la clé
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Dialog 1 : Affectation de modèle à une capacité */}
      <Dialog
        open={Boolean(assigningFeature)}
        onOpenChange={(open) => {
          if (!open) setAssigningFeature(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Affecter un modèle
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {assigningFeature ? featureLabels[assigningFeature] : ''} — {assigningFeature ? featureSurfaces[assigningFeature] : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Field label="Modèle affecté">
              <Select
                value={selectedModelIdForAssignment}
                onValueChange={(val) => setSelectedModelIdForAssignment(val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionnez un modèle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null">
                    Revenir au repli direct {canonicalFallbackModel ? `(${canonicalFallbackModel.label})` : ''}
                  </SelectItem>
                  {models
                    .filter((m) => m.enabled)
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label} ({m.model_id}) {m.is_default ? '· repli' : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>

            <p className="text-[11px] text-muted-foreground">
              {selectedModelIdForAssignment === 'null'
                ? `En revenant au repli, la capacité utilisera le modèle direct par défaut (${canonicalFallbackModel?.label ?? 'aucun'}).`
                : 'Ce modèle sera utilisé directement lors des prochains runs de cette capacité.'}
            </p>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button size="sm" variant="outline">
                Annuler
              </Button>
            </DialogClose>
            <Button
              size="sm"
              disabled={saveAssignmentMutation.isPending || !assigningFeature}
              onClick={() => {
                if (!assigningFeature) return;
                saveAssignmentMutation.mutate({
                  feature: assigningFeature,
                  model_config_id:
                    selectedModelIdForAssignment === 'null'
                      ? null
                      : selectedModelIdForAssignment,
                });
              }}
            >
              Enregistrer l’affectation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog 2 : Édition / Ajout d'un modèle */}
      <Dialog
        open={Boolean(modelForm)}
        onOpenChange={(open) => {
          if (!open) setModelForm(null);
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {modelForm?.id ? 'Modifier le modèle' : 'Ajouter un modèle autorisé'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Renseignez les paramètres d’exécution et la tarification du modèle.
            </DialogDescription>
          </DialogHeader>

          {modelForm ? (
            <form
              id="model-config-form"
              className="space-y-4 py-2"
              onSubmit={(e) => {
                e.preventDefault();
                saveModelMutation.mutate();
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Fournisseur">
                  <Select
                    value={modelForm.provider}
                    onValueChange={(val) =>
                      setModelForm({ ...modelForm, provider: val as AiProvider })
                    }
                    disabled={Boolean(modelForm.id)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((p) => (
                        <SelectItem key={p.provider} value={p.provider}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Identifiant du modèle" hint="Slug utilisé par l’API du fournisseur">
                  <Input
                    name="model_id"
                    value={modelForm.model_id}
                    disabled={Boolean(modelForm.id)}
                    onChange={(e) => setModelForm({ ...modelForm, model_id: e.target.value })}
                    required
                    placeholder="ex: mistral-small-latest"
                  />
                </Field>
              </div>

              <Field label="Libellé affiché">
                <Input
                  name="label"
                  value={modelForm.label}
                  onChange={(e) => setModelForm({ ...modelForm, label: e.target.value })}
                  required
                  placeholder="ex: Mistral Small"
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Prix entrée / M tokens (USD)">
                  <Input
                    name="input_price"
                    type="number"
                    min="0"
                    step="any"
                    value={modelForm.input}
                    onChange={(e) => setModelForm({ ...modelForm, input: e.target.value })}
                    placeholder="0.20"
                  />
                </Field>

                <Field label="Prix sortie / M tokens (USD)">
                  <Input
                    name="output_price"
                    type="number"
                    min="0"
                    step="any"
                    value={modelForm.output}
                    onChange={(e) => setModelForm({ ...modelForm, output: e.target.value })}
                    placeholder="0.60"
                  />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Plafond de tokens en sortie">
                  <Input
                    name="max_output_tokens"
                    type="number"
                    min="1"
                    value={modelForm.max}
                    onChange={(e) => setModelForm({ ...modelForm, max: e.target.value })}
                    required
                  />
                </Field>

                <Field label="Température par défaut" hint="0.0 à 1.0 (max 2 décimales)">
                  <Input
                    name="temperature"
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={modelForm.temperature}
                    onChange={(e) => setModelForm({ ...modelForm, temperature: e.target.value })}
                    required
                  />
                </Field>
              </div>

              <div className="flex flex-wrap gap-6 pt-2">
                <label
                  htmlFor="ai-model-enabled"
                  className="flex items-center gap-2 text-xs font-medium cursor-pointer"
                >
                  <Switch
                    id="ai-model-enabled"
                    checked={modelForm.enabled}
                    onCheckedChange={(enabled) => setModelForm({ ...modelForm, enabled })}
                  />
                  Modèle actif
                </label>

                <label
                  htmlFor="ai-model-default"
                  className="flex items-center gap-2 text-xs font-medium cursor-pointer"
                >
                  <Switch
                    id="ai-model-default"
                    checked={modelForm.is_default}
                    onCheckedChange={(is_default) => setModelForm({ ...modelForm, is_default })}
                  />
                  Modèle de repli du fournisseur (défaut)
                </label>
              </div>
            </form>
          ) : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button size="sm" variant="outline">
                Annuler
              </Button>
            </DialogClose>
            <Button
              size="sm"
              type="submit"
              form="model-config-form"
              disabled={saveModelMutation.isPending}
            >
              Enregistrer le modèle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog 3 : Suppression d'un modèle (AlertDialog) */}
      <AlertDialog
        open={Boolean(deletingModel)}
        onOpenChange={(open) => {
          if (!open) setDeletingModel(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">
              Supprimer le modèle
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Êtes-vous sûr de vouloir supprimer définitivement le modèle{' '}
              <strong className="text-foreground">{deletingModel?.label}</strong> ({deletingModel?.model_id}) ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button size="sm" variant="outline">
                Annuler
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                size="sm"
                variant="destructive"
                disabled={deleteModelMutation.isPending}
                onClick={() => {
                  if (deletingModel) {
                    deleteModelMutation.mutate(deletingModel.id);
                  }
                }}
              >
                Supprimer
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog 4 : Résultat de test fournisseur */}
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
    </div>
  );
};
