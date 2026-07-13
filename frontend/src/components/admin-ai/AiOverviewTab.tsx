import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/inputs/basic/Button';
import { getAiSettings, getAiUsageSummary } from '@/services/ai';
import { aiSettingsKey, aiUsageSummaryKey } from '@/services/query/queryKeys';
import { AI_DAYS, formatCost, formatDate, formatNumber, Metric, SectionState } from './aiAdminUi';

export const AiOverviewTab = ({ onNavigate }: { onNavigate: (tab: string) => void }) => {
  const settings = useQuery({ queryKey: aiSettingsKey(), queryFn: getAiSettings });
  const usage = useQuery({ queryKey: aiUsageSummaryKey(AI_DAYS), queryFn: () => getAiUsageSummary({ days: AI_DAYS }) });
  if (settings.isPending || usage.isPending) return <SectionState>Chargement de la synthèse…</SectionState>;
  if (settings.isError || usage.isError) return <SectionState>La synthèse IA n’a pas pu être chargée. Actualisez la page.</SectionState>;
  const provider = settings.data.providers[0]; const model = settings.data.models.find((item) => item.is_default);
  const summary = usage.data.summary; const tokens = summary.input_tokens + summary.output_tokens + summary.cached_input_tokens + summary.reasoning_tokens;
  return <div className="space-y-5">
    {summary.budget_alerts.length ? <div role="alert" className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-xs text-foreground">
      <p className="font-semibold">Budget IA à surveiller</p>
      <p className="mt-1 text-muted-foreground">{summary.budget_alerts.length} seuil{summary.budget_alerts.length > 1 ? 's' : ''} de coût atteint{summary.budget_alerts.length > 1 ? 's' : ''} à au moins 80 %. Consultez l’onglet Quotas.</p>
      <Button className="mt-2" size="sm" variant="outline" onClick={() => onNavigate('quotas')}>Voir les seuils</Button>
    </div> : null}
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold">État du service</h3><p className="text-xs text-muted-foreground">Synthèse sur les 30 derniers jours, sans réglage modifiable.</p></div><Button size="sm" variant="outline" onClick={() => onNavigate('models')}>Tester le fournisseur</Button></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Fournisseur" value={provider?.label ?? 'Non configuré'} detail={provider?.enabled ? 'Actif' : 'Inactif'} />
      <Metric label="Clé API" value={provider?.has_api_key ? `Enregistrée ••••${provider.api_key_last4 ?? ''}` : 'Absente'} detail={`Dernier test : ${formatDate(provider?.last_test_at ?? null)}`} />
      <Metric label="Modèle par défaut provider" value={model?.label ?? 'Non configuré'} detail={model?.model_id} />
      <Metric label="Coût sur 30 jours" value={formatCost.format(summary.cost_amount)} detail={`${formatNumber.format(summary.calls)} appels`} />
      <Metric label="Tokens" value={formatNumber.format(tokens)} detail={`${formatNumber.format(summary.failed_calls)} appels en échec`} />
    </div>
  </div>;
};
