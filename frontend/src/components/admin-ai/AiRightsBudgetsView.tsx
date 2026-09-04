import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';

import { ROLE_LABELS } from '@/app/appConstants';
import { Badge } from '@/components/ui/data-display/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/data-display/Table';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/feedback/Dialog';
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
import { cn } from '@/lib/utils';
import {
  createAiQuota,
  deleteAiAccess,
  deleteAiQuota,
  getAiMembersAccessOverview,
  getAiSettings,
  getAiUsageByMember,
  getAiUsageSummary,
  listAiAccess,
  saveAiAccess,
  saveAiQuota,
} from '@/services/ai';
import { handleUiError } from '@/services/errors/handleUiError';
import {
  aiAccessKey,
  aiMembersAccessKey,
  aiSettingsKey,
  aiUsageByMemberKey,
  aiUsageSummaryKey,
} from '@/services/query/queryKeys';
import type { UserRole } from '@/types';
import type {
  AiFeature,
  AiQuotaPolicy,
  AiQuotaUsage,
} from '../../../../shared/schemas/ai.schema';
import {
  AI_DAYS,
  Field,
  SectionState,
  featureLabels,
  featureSurfaces,
  features,
  formatCost,
  formatNumber,
} from './aiAdminUi';

type MemberRow = Awaited<ReturnType<typeof getAiMembersAccessOverview>>['members'][number];
type GrantOrigin = MemberRow['origin'];

const LIVE_FEATURE: AiFeature = 'pricing.references.diagnose';
const ALL_CAPABILITIES = '__all__';

const originLabels = {
  user: 'Membre',
  agency: 'Agence',
  global: 'Global',
  default: 'Système',
} as const;

type QuotaForm = {
  id?: string;
  scope: 'global' | 'agency' | 'user';
  target: string;
  feature: AiFeature | typeof ALL_CAPABILITIES;
  enabled: boolean;
  dailyCalls: string;
  monthlyCalls: string;
  dailyTokens: string;
  monthlyTokens: string;
  dailyCost: string;
  monthlyCost: string;
};

type MemberIntent =
  | { kind: 'override'; userId: string; name: string; allowed: boolean }
  | { kind: 'revert'; userId: string; name: string };

type MemberGroup = {
  user_id: string;
  display_name: string;
  email: string;
  role: UserRole;
  memberships: Array<{
    agency_id: string;
    agency_name: string;
    allowed: boolean;
    origin: GrantOrigin;
  }>;
};

const emptyQuotaForm = (feature: AiFeature): QuotaForm => ({
  scope: 'global',
  target: '',
  feature,
  enabled: true,
  dailyCalls: '',
  monthlyCalls: '',
  dailyTokens: '',
  monthlyTokens: '',
  dailyCost: '',
  monthlyCost: '',
});

const nullableNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const capabilityLabel = (feature: AiFeature) =>
  feature === 'assistant.referentiels'
    ? `${featureLabels[feature]} (retiré)`
    : featureLabels[feature];

const resolveOriginLabel = (
  origin: GrantOrigin,
  role: UserRole,
  hasUserOverride: boolean,
) => {
  if (role === 'super_admin' && !hasUserOverride) return 'Super-admin';
  return originLabels[origin];
};

const groupMembersByUser = (members: MemberRow[]): MemberGroup[] => {
  const groups = new Map<string, MemberGroup>();
  for (const member of members) {
    const existing = groups.get(member.user_id);
    const membership = {
      agency_id: member.agency_id,
      agency_name: member.agency_name,
      allowed: member.allowed,
      origin: member.origin,
    };
    if (existing) {
      existing.memberships.push(membership);
      continue;
    }
    groups.set(member.user_id, {
      user_id: member.user_id,
      display_name: member.display_name,
      email: member.email,
      role: member.role,
      memberships: [membership],
    });
  }
  return [...groups.values()].sort((left, right) =>
    left.display_name.localeCompare(right.display_name, 'fr'),
  );
};

const quotaTargetName = (
  quota: AiQuotaPolicy,
  names: Map<string, string>,
) => {
  if (quota.scope === 'global') return 'Global';
  const targetId = quota.user_id ?? quota.agency_id ?? '';
  return names.get(targetId) ?? 'Cible supprimée';
};

const QuotaGauge = ({
  label,
  used,
  limit,
  formatUsed,
}: {
  label: string;
  used: number;
  limit: number | null;
  formatUsed: (value: number) => string;
}) => {
  if (limit === null) {
    return (
      <div className="space-y-1">
        <div className="flex items-baseline justify-between gap-2 text-[11px]">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-mono tabular-nums text-foreground">
            {formatUsed(used)} / ∞
          </span>
        </div>
      </div>
    );
  }

  const ratio = limit === 0 ? (used > 0 ? 1 : 0) : used / limit;
  const tone =
    ratio >= 1 ? 'bg-destructive' : ratio >= 0.8 ? 'bg-warning' : 'bg-success';

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums text-foreground">
          {formatUsed(used)} / {formatUsed(limit)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
        <div
          className={cn('h-full rounded-full', tone)}
          style={{ width: `${Math.min(100, Math.max(0, ratio * 100))}%` }}
        />
      </div>
    </div>
  );
};

const QuotaPolicyCard = ({
  quota,
  usage,
  targetName,
  onEdit,
  onDelete,
}: {
  quota: AiQuotaPolicy;
  usage: AiQuotaUsage | undefined;
  targetName: string;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const dailyCalls = usage?.daily_calls ?? 0;
  const monthlyCalls = usage?.monthly_calls ?? 0;
  const dailyTokens = usage?.daily_tokens ?? 0;
  const monthlyTokens = usage?.monthly_tokens ?? 0;
  const dailyCost = usage?.daily_cost ?? 0;
  const monthlyCost = usage?.monthly_cost ?? 0;

  return (
    <article
      className="grid gap-4 border-b border-border p-3 last:border-b-0 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]"
      data-testid={`ai-quota-policy-${quota.id}`}
    >
      <button
        type="button"
        className="min-w-0 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onEdit}
      >
        <p className="text-xs font-semibold text-foreground">{targetName}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {quota.feature ? capabilityLabel(quota.feature) : 'Toutes les capacités'}
          {quota.enabled ? '' : ' · inactive'}
        </p>
      </button>

      <div className="grid gap-2 sm:grid-cols-2" data-testid={`ai-quota-gauges-${quota.id}`}>
        {quota.daily_call_limit !== null ? (
          <QuotaGauge
            label="Appels · jour civil"
            used={dailyCalls}
            limit={quota.daily_call_limit}
            formatUsed={(value) => formatNumber.format(value)}
          />
        ) : null}
        {quota.monthly_call_limit !== null ? (
          <QuotaGauge
            label="Appels · mois civil"
            used={monthlyCalls}
            limit={quota.monthly_call_limit}
            formatUsed={(value) => formatNumber.format(value)}
          />
        ) : null}
        {quota.daily_token_limit !== null ? (
          <QuotaGauge
            label="Tokens · jour civil"
            used={dailyTokens}
            limit={quota.daily_token_limit}
            formatUsed={(value) => formatNumber.format(value)}
          />
        ) : null}
        {quota.monthly_token_limit !== null ? (
          <QuotaGauge
            label="Tokens · mois civil"
            used={monthlyTokens}
            limit={quota.monthly_token_limit}
            formatUsed={(value) => formatNumber.format(value)}
          />
        ) : null}
        {quota.daily_cost_limit !== null ? (
          <QuotaGauge
            label="Coût · jour civil"
            used={dailyCost}
            limit={quota.daily_cost_limit}
            formatUsed={(value) => formatCost.format(value)}
          />
        ) : null}
        {quota.monthly_cost_limit !== null ? (
          <QuotaGauge
            label="Coût · mois civil"
            used={monthlyCost}
            limit={quota.monthly_cost_limit}
            formatUsed={(value) => formatCost.format(value)}
          />
        ) : null}
        {quota.daily_call_limit === null
          && quota.monthly_call_limit === null
          && quota.daily_token_limit === null
          && quota.monthly_token_limit === null
          && quota.daily_cost_limit === null
          && quota.monthly_cost_limit === null ? (
          <p className="text-[11px] text-muted-foreground">Aucun plafond défini.</p>
        ) : null}
      </div>

      <div className="flex items-start justify-end">
        <Button
          size="icon"
          variant="ghost"
          aria-label={`Supprimer la politique de quota ${targetName}`}
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
};

export const AiRightsBudgetsView = () => {
  const client = useQueryClient();
  const [feature, setFeature] = useState<AiFeature>(LIVE_FEATURE);
  const [memberIntent, setMemberIntent] = useState<MemberIntent | null>(null);
  const [quotaForm, setQuotaForm] = useState<QuotaForm | null>(null);
  const [quotaToDelete, setQuotaToDelete] = useState<AiQuotaPolicy | null>(null);

  const overview = useQuery({
    queryKey: aiMembersAccessKey(feature),
    queryFn: () => getAiMembersAccessOverview({ feature }),
  });
  const grants = useQuery({
    queryKey: aiAccessKey(feature),
    queryFn: () => listAiAccess({ feature }),
  });
  const usage = useQuery({
    queryKey: aiUsageByMemberKey(AI_DAYS, feature),
    queryFn: () => getAiUsageByMember({ days: AI_DAYS, feature }),
  });
  const settings = useQuery({
    queryKey: aiSettingsKey(),
    queryFn: getAiSettings,
  });
  const summary = useQuery({
    queryKey: aiUsageSummaryKey(AI_DAYS),
    queryFn: () => getAiUsageSummary({ days: AI_DAYS }),
  });

  const usageByUser = useMemo(
    () => new Map((usage.data?.members ?? []).map((row) => [row.user_id, row])),
    [usage.data],
  );
  const usageByQuota = useMemo(
    () => new Map((summary.data?.summary.quota_usages ?? []).map((row) => [row.quota_id, row])),
    [summary.data],
  );
  const memberGroups = useMemo(
    () => groupMembersByUser(overview.data?.members ?? []),
    [overview.data],
  );
  const agencies = useMemo(
    () => [...new Map((overview.data?.members ?? []).map((member) => [member.agency_id, member.agency_name])).entries()],
    [overview.data],
  );
  const uniqueMembers = useMemo(
    () => [...new Map((overview.data?.members ?? []).map((member) => [member.user_id, member])).values()],
    [overview.data],
  );
  const targetNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const member of overview.data?.members ?? []) {
      names.set(member.user_id, member.display_name);
      names.set(member.agency_id, member.agency_name);
    }
    return names;
  }, [overview.data]);

  const userGrantIds = useMemo(() => {
    const ids = new Set<string>();
    for (const grant of grants.data?.grants ?? []) {
      if (grant.scope === 'user' && grant.target?.id) ids.add(grant.target.id);
    }
    return ids;
  }, [grants.data]);

  const invalidateAccess = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: aiAccessKey(feature) }),
      client.invalidateQueries({ queryKey: aiMembersAccessKey(feature) }),
    ]);

  const saveAccess = useMutation({
    mutationFn: saveAiAccess,
    onSuccess: async () => {
      setMemberIntent(null);
      await invalidateAccess();
    },
    onError: (error) => handleUiError(error, 'Impossible de modifier l’accès IA.'),
  });

  const revertAccess = useMutation({
    mutationFn: deleteAiAccess,
    onSuccess: async () => {
      setMemberIntent(null);
      await invalidateAccess();
    },
    onError: (error) => handleUiError(error, 'Impossible de revenir à la règle héritée.'),
  });

  const saveQuota = useMutation({
    mutationFn: async () => {
      if (!quotaForm) return;
      const limits = {
        enabled: quotaForm.enabled,
        daily_call_limit: nullableNumber(quotaForm.dailyCalls),
        monthly_call_limit: nullableNumber(quotaForm.monthlyCalls),
        daily_token_limit: nullableNumber(quotaForm.dailyTokens),
        monthly_token_limit: nullableNumber(quotaForm.monthlyTokens),
        daily_cost_limit: nullableNumber(quotaForm.dailyCost),
        monthly_cost_limit: nullableNumber(quotaForm.monthlyCost),
        currency: 'USD',
      };
      const selectedFeature = quotaForm.feature === ALL_CAPABILITIES ? null : quotaForm.feature;
      if (quotaForm.id) {
        return saveAiQuota({ id: quotaForm.id, ...limits });
      }
      return createAiQuota({
        scope: quotaForm.scope,
        feature: selectedFeature,
        ...(quotaForm.scope === 'agency' ? { agency_id: quotaForm.target } : {}),
        ...(quotaForm.scope === 'user' ? { user_id: quotaForm.target } : {}),
        ...limits,
      });
    },
    onSuccess: async () => {
      setQuotaForm(null);
      await Promise.all([
        client.invalidateQueries({ queryKey: aiSettingsKey() }),
        client.invalidateQueries({ queryKey: aiUsageSummaryKey(AI_DAYS) }),
      ]);
    },
    onError: (error) => handleUiError(error, 'Impossible de sauvegarder le quota IA.'),
  });

  const removeQuota = useMutation({
    mutationFn: deleteAiQuota,
    onSuccess: async () => {
      setQuotaToDelete(null);
      await Promise.all([
        client.invalidateQueries({ queryKey: aiSettingsKey() }),
        client.invalidateQueries({ queryKey: aiUsageSummaryKey(AI_DAYS) }),
      ]);
    },
    onError: (error) => handleUiError(error, 'Impossible de supprimer le quota IA.'),
  });

  const globalGrant = grants.data?.grants.find((grant) => grant.scope === 'global');
  const visibleQuotas = (settings.data?.quotas ?? []).filter(
    (quota) => quota.feature === null || quota.feature === feature,
  );

  const openQuotaEditor = (quota: AiQuotaPolicy) => {
    setQuotaForm({
      id: quota.id,
      scope: quota.scope,
      target: quota.user_id ?? quota.agency_id ?? '',
      feature: quota.feature ?? ALL_CAPABILITIES,
      enabled: quota.enabled,
      dailyCalls: quota.daily_call_limit?.toString() ?? '',
      monthlyCalls: quota.monthly_call_limit?.toString() ?? '',
      dailyTokens: quota.daily_token_limit?.toString() ?? '',
      monthlyTokens: quota.monthly_token_limit?.toString() ?? '',
      dailyCost: quota.daily_cost_limit?.toString() ?? '',
      monthlyCost: quota.monthly_cost_limit?.toString() ?? '',
    });
  };

  const confirmMemberIntent = () => {
    if (!memberIntent) return;
    if (memberIntent.kind === 'revert') {
      revertAccess.mutate({ feature, scope: 'user', user_id: memberIntent.userId });
      return;
    }
    saveAccess.mutate({
      feature,
      scope: 'user',
      user_id: memberIntent.userId,
      allowed: memberIntent.allowed,
    });
  };

  const rightsPending = overview.isPending || grants.isPending || usage.isPending;
  const rightsError = overview.isError || grants.isError || usage.isError;
  const quotasPending = settings.isPending || summary.isPending;
  const quotasError = settings.isError || summary.isError;

  return (
    <div className="space-y-8" data-testid="ai-rights-budgets-view">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Droits et budgets</h3>
          <p className="mt-1 max-w-[72ch] text-xs text-muted-foreground">
            Lisez l’origine de chaque droit, revenez à la règle héritée, et suivez la consommation
            sur le calendrier de chaque politique.
          </p>
        </div>
        <Field label="Capacité">
          <Select value={feature} onValueChange={(value) => setFeature(value as AiFeature)}>
            <SelectTrigger className="w-72" density="dense" aria-label="Capacité">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {features.map(([value]) => (
                <SelectItem key={value} value={value}>
                  {capabilityLabel(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </header>

      <section className="space-y-4" aria-labelledby="ai-rights-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h4 id="ai-rights-heading" className="text-sm font-semibold text-foreground">
              Droits
            </h4>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {featureLabels[feature]} · {featureSurfaces[feature]}. Priorité : membre, agence, global, puis système.
            </p>
          </div>
          <label
            htmlFor="ai-global-access"
            className="flex items-center gap-2 text-xs font-medium text-foreground"
          >
            <Switch
              id="ai-global-access"
              checked={globalGrant?.allowed ?? false}
              onCheckedChange={(allowed) => saveAccess.mutate({ feature, scope: 'global', allowed })}
            />
            Défaut global {globalGrant?.allowed ? 'autorisé' : 'bloqué'}
          </label>
        </div>

        {rightsPending ? (
          <SectionState>Chargement des accès membres…</SectionState>
        ) : rightsError ? (
          <SectionState>Les accès membres n’ont pas pu être chargés.</SectionState>
        ) : (
          <>
            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-foreground">Overrides par agence</h5>
              <div className="flex flex-wrap gap-2">
                {agencies.map(([agencyId, agencyName]) => {
                  const grant = grants.data?.grants.find(
                    (item) => item.scope === 'agency' && item.target?.id === agencyId,
                  );
                  return (
                    <label
                      key={agencyId}
                      htmlFor={`ai-agency-access-${agencyId}`}
                      className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs"
                    >
                      <Switch
                        id={`ai-agency-access-${agencyId}`}
                        checked={grant?.allowed ?? false}
                        onCheckedChange={(allowed) =>
                          saveAccess.mutate({
                            feature,
                            scope: 'agency',
                            agency_id: agencyId,
                            allowed,
                          })
                        }
                      />
                      {agencyName}
                    </label>
                  );
                })}
                {agencies.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">Aucune agence à paramétrer.</p>
                ) : null}
              </div>
            </div>

            <div className="overflow-hidden rounded-md border border-border bg-background">
              <Table>
                <TableHeader className="bg-surface-1/80">
                  <TableRow>
                    <TableHead>Membre</TableHead>
                    <TableHead>Agence et rôle</TableHead>
                    <TableHead>Accès effectif</TableHead>
                    <TableHead>Conso 30 j</TableHead>
                    <TableHead className="text-right">Override membre</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberGroups.map((member) => {
                    const row = usageByUser.get(member.user_id);
                    const hasUserOverride = userGrantIds.has(member.user_id);
                    const allowed = member.memberships.some((item) => item.allowed);
                    const mixed = member.memberships.some((item) => item.allowed) &&
                      member.memberships.some((item) => !item.allowed);
                    return (
                      <TableRow key={member.user_id} data-testid={`ai-member-row-${member.user_id}`}>
                        <TableCell>
                          <p className="font-medium text-foreground">{member.display_name}</p>
                          <p className="text-[11px] text-muted-foreground">{member.email}</p>
                        </TableCell>
                        <TableCell>
                          <ul className="space-y-1">
                            {member.memberships.map((membership) => (
                              <li key={membership.agency_id}>
                                <span>{membership.agency_name}</span>
                                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                                  {ROLE_LABELS[member.role]} · {resolveOriginLabel(membership.origin, member.role, hasUserOverride)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </TableCell>
                        <TableCell>
                          <Badge variant={allowed ? 'success' : 'secondary'}>
                            {mixed ? 'Mixte' : allowed ? 'Autorisé' : 'Bloqué'}
                          </Badge>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {hasUserOverride
                              ? 'Membre'
                              : resolveOriginLabel(member.memberships[0]?.origin ?? 'default', member.role, hasUserOverride)}
                          </p>
                        </TableCell>
                        <TableCell className="font-mono tabular-nums">
                          {formatNumber.format(row?.calls ?? 0)} appels
                          <p className="text-[11px] text-muted-foreground">
                            {formatCost.format(row?.cost_amount ?? 0)}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-2">
                            <Switch
                              aria-label={`Accès de ${member.display_name}`}
                              checked={allowed}
                              onCheckedChange={(nextAllowed) =>
                                setMemberIntent({
                                  kind: 'override',
                                  userId: member.user_id,
                                  name: member.display_name,
                                  allowed: nextAllowed,
                                })
                              }
                            />
                            {hasUserOverride ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setMemberIntent({
                                    kind: 'revert',
                                    userId: member.user_id,
                                    name: member.display_name,
                                  })
                                }
                              >
                                <RotateCcw className="size-3.5" aria-hidden="true" />
                                Revenir à la règle héritée
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {memberGroups.length === 0 ? (
                <SectionState>Aucun membre à afficher pour cette capacité.</SectionState>
              ) : null}
            </div>
          </>
        )}
      </section>

      <section className="space-y-4 border-t border-border pt-6" aria-labelledby="ai-quotas-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h4 id="ai-quotas-heading" className="text-sm font-semibold text-foreground">
              Politiques de quota
            </h4>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Les jauges lisent la consommation du jour civil ou du mois civil de la politique, jamais un glissant 30 jours.
            </p>
          </div>
          <Button size="sm" onClick={() => setQuotaForm(emptyQuotaForm(feature))}>
            <Plus className="size-3.5" aria-hidden="true" />
            Créer
          </Button>
        </div>

        {quotasPending ? (
          <SectionState>Chargement des quotas…</SectionState>
        ) : quotasError ? (
          <SectionState>Les quotas n’ont pas pu être chargés.</SectionState>
        ) : visibleQuotas.length === 0 ? (
          <SectionState>Aucune politique de quota pour cette capacité.</SectionState>
        ) : (
          <div className="divide-y-0 overflow-hidden rounded-md border border-border">
            {visibleQuotas.map((quota) => (
              <QuotaPolicyCard
                key={quota.id}
                quota={quota}
                usage={usageByQuota.get(quota.id)}
                targetName={quotaTargetName(quota, targetNames)}
                onEdit={() => openQuotaEditor(quota)}
                onDelete={() => setQuotaToDelete(quota)}
              />
            ))}
          </div>
        )}
      </section>

      <AlertDialog open={memberIntent !== null} onOpenChange={(open) => { if (!open) setMemberIntent(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {memberIntent?.kind === 'revert'
                ? 'Revenir à la règle héritée ?'
                : memberIntent?.allowed
                  ? 'Autoriser cet accès membre ?'
                  : 'Bloquer cet accès membre ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {memberIntent?.kind === 'revert'
                ? `L’accès de ${memberIntent.name} suivra à nouveau la règle d’agence ou le défaut global.`
                : `Vous allez poser un override membre pour ${memberIntent?.name ?? ''}. Cette règle remplace l’héritage jusqu’à ce que vous reveniez à la règle héritée.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmMemberIntent}
              disabled={saveAccess.isPending || revertAccess.isPending}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={quotaToDelete !== null} onOpenChange={(open) => { if (!open) setQuotaToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette politique de quota ?</AlertDialogTitle>
            <AlertDialogDescription>
              La politique sera retirée immédiatement. La consommation déjà enregistrée n’est pas effacée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (quotaToDelete) removeQuota.mutate({ id: quotaToDelete.id });
              }}
              disabled={removeQuota.isPending}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={quotaForm !== null} onOpenChange={(open) => { if (!open) setQuotaForm(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {quotaForm?.id ? 'Modifier la politique de quota' : 'Créer une politique de quota'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Les plafonds vides restent illimités. Une politique sans capacité s’applique à toutes les capacités.
            </DialogDescription>
          </DialogHeader>

          {quotaForm ? (
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (quotaForm.scope !== 'global' && !quotaForm.target) return;
                saveQuota.mutate();
              }}
            >
              <Field label="Périmètre">
                <Select
                  value={quotaForm.scope}
                  disabled={Boolean(quotaForm.id)}
                  onValueChange={(value) =>
                    setQuotaForm({ ...quotaForm, scope: value as QuotaForm['scope'], target: '' })
                  }
                >
                  <SelectTrigger density="dense" aria-label="Périmètre">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global</SelectItem>
                    <SelectItem value="agency">Agence</SelectItem>
                    <SelectItem value="user">Membre</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Capacité">
                <Select
                  value={quotaForm.feature}
                  disabled={Boolean(quotaForm.id)}
                  onValueChange={(value) =>
                    setQuotaForm({ ...quotaForm, feature: value as QuotaForm['feature'] })
                  }
                >
                  <SelectTrigger density="dense" aria-label="Capacité de la politique">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_CAPABILITIES}>Toutes les capacités</SelectItem>
                    {features.map(([value]) => (
                      <SelectItem key={value} value={value}>
                        {capabilityLabel(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {quotaForm.scope !== 'global' ? (
                <Field label={quotaForm.scope === 'agency' ? 'Agence' : 'Membre'}>
                  <Select
                    value={quotaForm.target || undefined}
                    disabled={Boolean(quotaForm.id)}
                    onValueChange={(value) => setQuotaForm({ ...quotaForm, target: value })}
                  >
                    <SelectTrigger density="dense" aria-label={quotaForm.scope === 'agency' ? 'Agence' : 'Membre'}>
                      <SelectValue placeholder="Sélectionner…" />
                    </SelectTrigger>
                    <SelectContent>
                      {quotaForm.scope === 'agency'
                        ? agencies.map(([id, name]) => (
                          <SelectItem key={id} value={id}>{name}</SelectItem>
                        ))
                        : uniqueMembers.map((member) => (
                          <SelectItem key={member.user_id} value={member.user_id}>
                            {member.display_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}

              <Field label="Appels / jour civil">
                <Input
                  type="number"
                  min="0"
                  value={quotaForm.dailyCalls}
                  onChange={(event) => setQuotaForm({ ...quotaForm, dailyCalls: event.target.value })}
                />
              </Field>
              <Field label="Appels / mois civil">
                <Input
                  type="number"
                  min="0"
                  value={quotaForm.monthlyCalls}
                  onChange={(event) => setQuotaForm({ ...quotaForm, monthlyCalls: event.target.value })}
                />
              </Field>
              <Field label="Tokens / jour civil">
                <Input
                  type="number"
                  min="0"
                  value={quotaForm.dailyTokens}
                  onChange={(event) => setQuotaForm({ ...quotaForm, dailyTokens: event.target.value })}
                />
              </Field>
              <Field label="Tokens / mois civil">
                <Input
                  type="number"
                  min="0"
                  value={quotaForm.monthlyTokens}
                  onChange={(event) => setQuotaForm({ ...quotaForm, monthlyTokens: event.target.value })}
                />
              </Field>
              <Field label="Coût / jour civil (USD)">
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={quotaForm.dailyCost}
                  onChange={(event) => setQuotaForm({ ...quotaForm, dailyCost: event.target.value })}
                />
              </Field>
              <Field label="Coût / mois civil (USD)">
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={quotaForm.monthlyCost}
                  onChange={(event) => setQuotaForm({ ...quotaForm, monthlyCost: event.target.value })}
                />
              </Field>

              <label
                htmlFor="ai-quota-policy-enabled"
                className="flex items-center gap-2 text-xs font-medium text-foreground sm:col-span-2"
              >
                <Switch
                  id="ai-quota-policy-enabled"
                  checked={quotaForm.enabled}
                  onCheckedChange={(enabled) => setQuotaForm({ ...quotaForm, enabled })}
                />
                Politique active
              </label>

              <DialogFooter className="sm:col-span-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setQuotaForm(null)}>
                  Annuler
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={saveQuota.isPending || (quotaForm.scope !== 'global' && !quotaForm.target)}
                >
                  Enregistrer le quota
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};
