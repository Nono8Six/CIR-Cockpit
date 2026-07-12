import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AiFeature } from '../../../../shared/schemas/ai.schema';
import { Badge } from '@/components/ui/data-display/Badge';
import { Switch } from '@/components/ui/inputs/basic/Switch';
import { getAiMembersAccessOverview, getAiUsageByMember, listAiAccess, saveAiAccess } from '@/services/ai';
import { handleUiError } from '@/services/errors/handleUiError';
import { aiAccessKey, aiMembersAccessKey, aiUsageByMemberKey } from '@/services/query/queryKeys';
import { AI_DAYS, featureLabels, features, formatCost, formatNumber, SectionState } from './aiAdminUi';

const originLabels = { user: 'Override membre', agency: 'Règle agence', global: 'Défaut global', default: 'Défaut système' } as const;
export const AiAccessTab = () => {
  const client = useQueryClient(); const [feature, setFeature] = useState<AiFeature>('assistant.referentiels');
  const overview = useQuery({ queryKey: aiMembersAccessKey(feature), queryFn: () => getAiMembersAccessOverview({ feature }) });
  const grants = useQuery({ queryKey: aiAccessKey(feature), queryFn: () => listAiAccess({ feature }) });
  const usage = useQuery({ queryKey: aiUsageByMemberKey(AI_DAYS, feature), queryFn: () => getAiUsageByMember({ days: AI_DAYS, feature }) });
  const usageMap = useMemo(() => new Map((usage.data?.members ?? []).map((row) => [row.user_id, row])), [usage.data]);
  const mutate = useMutation({ mutationFn: saveAiAccess, onSuccess: async () => Promise.all([client.invalidateQueries({ queryKey: aiAccessKey(feature) }), client.invalidateQueries({ queryKey: aiMembersAccessKey(feature) })]), onError: (e) => handleUiError(e, 'Impossible de modifier l’accès IA.') });
  const globalGrant = grants.data?.grants.find((grant) => grant.scope === 'global');
  if (overview.isPending || grants.isPending || usage.isPending) return <SectionState>Chargement des accès membres…</SectionState>;
  if (overview.isError || grants.isError || usage.isError) return <SectionState>Les accès membres n’ont pas pu être chargés.</SectionState>;
  const agencies = [...new Map(overview.data.members.map((m) => [m.agency_id, m.agency_name])).entries()];
  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><label className="grid gap-1 text-xs font-medium">Fonctionnalité<select className="h-9 rounded-md border border-input bg-background px-3 text-xs" value={feature} onChange={(e) => setFeature(e.target.value as AiFeature)}>{features.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="flex items-center gap-2 text-xs font-medium"><Switch checked={globalGrant?.allowed ?? false} onCheckedChange={(allowed) => mutate.mutate({ feature, scope: 'global', allowed })} />Défaut global {globalGrant?.allowed ? 'autorisé' : 'bloqué'}</label></div>
    <section><h3 className="mb-2 text-xs font-semibold">Overrides par agence</h3><div className="flex flex-wrap gap-2">{agencies.map(([agencyId, name]) => { const grant = grants.data.grants.find((g) => g.scope === 'agency' && g.target?.id === agencyId); return <label key={agencyId} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs"><Switch checked={grant?.allowed ?? false} onCheckedChange={(allowed) => mutate.mutate({ feature, scope: 'agency', agency_id: agencyId, allowed })} />{name}</label>; })}</div></section>
    <div className="overflow-x-auto rounded-md border border-border"><table className="w-full text-left text-xs"><thead className="bg-surface-1 text-muted-foreground"><tr><th className="px-3 py-2">Membre</th><th className="px-3 py-2">Agence & rôle</th><th className="px-3 py-2">Accès effectif</th><th className="px-3 py-2">Conso 30 j</th><th className="px-3 py-2 text-right">Override membre</th></tr></thead><tbody className="divide-y divide-border">{overview.data.members.map((member) => { const row = usageMap.get(member.user_id); return <tr key={`${member.user_id}-${member.agency_id}`}><td className="px-3 py-2"><p className="font-medium">{member.display_name}</p><p className="text-[11px] text-muted-foreground">{member.email}</p></td><td className="px-3 py-2">{member.agency_name}<p className="text-[11px] text-muted-foreground">{member.role}</p></td><td className="px-3 py-2"><Badge variant={member.allowed ? 'success' : 'secondary'}>{member.allowed ? 'Autorisé' : 'Bloqué'}</Badge><p className="mt-1 text-[11px] text-muted-foreground">{originLabels[member.origin]}</p></td><td className="px-3 py-2 tabular-nums">{formatNumber.format(row?.calls ?? 0)} appels<p className="text-[11px] text-muted-foreground">{formatCost.format(row?.cost_amount ?? 0)}</p></td><td className="px-3 py-2 text-right"><Switch aria-label={`Accès de ${member.display_name}`} checked={member.allowed} onCheckedChange={(allowed) => mutate.mutate({ feature, scope: 'user', user_id: member.user_id, allowed })} /></td></tr>; })}</tbody></table></div>
    <p className="text-[11px] text-muted-foreground">Fonctionnalité affichée : {featureLabels[feature]}. La priorité persistée est membre, agence active, global, puis défaut système.</p>
  </div>;
};
