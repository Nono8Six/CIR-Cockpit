import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { AiModelConfig } from '../../../../shared/schemas/ai.schema';
import { Badge } from '@/components/ui/data-display/Badge';
import { Button } from '@/components/ui/inputs/basic/Button';
import { Input } from '@/components/ui/inputs/basic/Input';
import { Switch } from '@/components/ui/inputs/basic/Switch';
import { deleteAiModel, getAiSettings, saveAiModel, saveAiProvider, testAiProvider } from '@/services/ai';
import { handleUiError } from '@/services/errors/handleUiError';
import { aiSettingsKey } from '@/services/query/queryKeys';
import { Field, formatDate, SectionState } from './aiAdminUi';

type Form = { id?: string; model_id: string; label: string; enabled: boolean; is_default: boolean; input: string; output: string; max: string; temperature: string };
const empty: Form = { model_id: '', label: '', enabled: true, is_default: false, input: '', output: '', max: '2000', temperature: '0.2' };
const fromModel = (m: AiModelConfig): Form => ({ id: m.id, model_id: m.model_id, label: m.label, enabled: m.enabled, is_default: m.is_default, input: m.input_price_per_million?.toString() ?? '', output: m.output_price_per_million?.toString() ?? '', max: m.max_output_tokens.toString(), temperature: m.temperature.toString() });
const numberOrNull = (value: string) => value.trim() ? Number(value.replace(',', '.')) : null;

export const AiModelsTab = () => {
  const client = useQueryClient(); const query = useQuery({ queryKey: aiSettingsKey(), queryFn: getAiSettings });
  const [form, setForm] = useState<Form>(empty); const [editing, setEditing] = useState(false); const [apiKey, setApiKey] = useState('');
  const provider = query.data?.providers[0];
  const refresh = () => client.invalidateQueries({ queryKey: aiSettingsKey() });
  const save = useMutation({ mutationFn: () => saveAiModel({ provider: provider?.provider ?? 'openrouter', model_id: form.model_id.trim(), label: form.label.trim(), enabled: form.enabled, is_default: form.is_default, currency: 'USD', input_price_per_million: numberOrNull(form.input), output_price_per_million: numberOrNull(form.output), cached_input_price_per_million: null, reasoning_price_per_million: null, price_effective_at: null, max_output_tokens: Number(form.max), temperature: Number(form.temperature) }), onSuccess: async () => { setEditing(false); setForm(empty); await refresh(); }, onError: (e) => handleUiError(e, 'Impossible de sauvegarder le modèle IA.') });
  const remove = useMutation({ mutationFn: deleteAiModel, onSuccess: refresh, onError: (e) => handleUiError(e, 'Impossible de supprimer le modèle IA.') });
  const providerSave = useMutation({ mutationFn: () => saveAiProvider({ provider: provider?.provider ?? 'openrouter', enabled: provider?.enabled ?? true, ...(apiKey.trim() ? { api_key: apiKey.trim() } : {}), base_url: provider?.base_url ?? null, organization_id: provider?.organization_id ?? null }), onSuccess: async () => { setApiKey(''); await refresh(); }, onError: (e) => handleUiError(e, 'Impossible d’enregistrer la clé API.') });
  const providerTest = useMutation({ mutationFn: () => testAiProvider({ provider: provider?.provider ?? 'openrouter', ...(apiKey.trim() ? { api_key: apiKey.trim() } : {}) }), onSuccess: refresh, onError: (e) => handleUiError(e, 'Impossible de tester le fournisseur IA.') });
  if (query.isPending) return <SectionState>Chargement des modèles…</SectionState>;
  if (query.isError) return <SectionState>Les modèles n’ont pas pu être chargés.</SectionState>;
  return <div className="space-y-6">
    <section className="grid gap-4 border-b border-border pb-5 lg:grid-cols-[1fr_22rem]">
      <div><div className="flex items-center gap-2"><h3 className="text-sm font-semibold">{provider?.label ?? 'Fournisseur non configuré'}</h3><Badge variant={provider?.enabled ? 'success' : 'secondary'}>{provider?.enabled ? 'Actif' : 'Inactif'}</Badge></div><p className="mt-1 text-xs text-muted-foreground">Clé {provider?.has_api_key ? `enregistrée ••••${provider.api_key_last4 ?? ''}` : 'absente'}, dernier test {formatDate(provider?.last_test_at ?? null)}.</p></div>
      <div className="flex items-end gap-2"><Field label="Remplacer la clé API"><Input type="password" name="openrouter_api_key" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Saisir une nouvelle clé…" /></Field><Button size="sm" disabled={!apiKey.trim() || providerSave.isPending} onClick={() => providerSave.mutate()}>Enregistrer</Button><Button size="sm" variant="outline" disabled={providerTest.isPending} onClick={() => providerTest.mutate()}>Tester</Button></div>
    </section>
    <div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold">Modèles autorisés</h3><p className="text-xs text-muted-foreground">Le défaut est global au fournisseur, conformément au schéma persistant actuel.</p></div><Button size="sm" onClick={() => { setForm(empty); setEditing(true); }}><Plus className="mr-1 size-3.5" aria-hidden="true" />Ajouter</Button></div>
    {editing ? <form className="grid gap-3 rounded-md border border-border bg-surface-1 p-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <Field label="Identifiant OpenRouter"><Input name="model_id" value={form.model_id} disabled={Boolean(form.id)} onChange={(e) => setForm({ ...form, model_id: e.target.value })} required /></Field>
      <Field label="Libellé"><Input name="label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required /></Field>
      <Field label="Prix entrée / M tokens"><Input name="input_price" type="number" min="0" step="any" value={form.input} onChange={(e) => setForm({ ...form, input: e.target.value })} /></Field>
      <Field label="Prix sortie / M tokens"><Input name="output_price" type="number" min="0" step="any" value={form.output} onChange={(e) => setForm({ ...form, output: e.target.value })} /></Field>
      <Field label="Tokens de sortie max"><Input name="max_output_tokens" type="number" min="1" value={form.max} onChange={(e) => setForm({ ...form, max: e.target.value })} required /></Field>
      <Field label="Température"><Input name="temperature" type="number" min="0" max="1" step="0.1" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} required /></Field>
      <div className="flex items-center gap-2 text-xs"><Switch aria-label="Modèle actif" checked={form.enabled} onCheckedChange={(enabled) => setForm({ ...form, enabled })} />Actif</div>
      <div className="flex items-center gap-2 text-xs"><Switch aria-label="Modèle par défaut du provider" checked={form.is_default} onCheckedChange={(is_default) => setForm({ ...form, is_default })} />Défaut provider</div>
      <div className="flex gap-2 md:col-span-2 xl:col-span-4"><Button type="submit" size="sm" disabled={save.isPending}>Enregistrer le modèle</Button><Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>Annuler</Button></div>
    </form> : null}
    <div className="divide-y divide-border rounded-md border border-border">{query.data.models.length ? query.data.models.map((model) => <div key={model.id} className="grid items-center gap-3 p-3 md:grid-cols-[minmax(0,1fr)_auto_auto]"><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-xs font-semibold">{model.label}</p>{model.is_default ? <Badge variant="success">Défaut provider</Badge> : null}{!model.enabled ? <Badge variant="secondary">Inactif</Badge> : null}</div><p className="truncate font-mono text-[11px] text-muted-foreground">{model.model_id}</p></div><p className="text-right text-[11px] tabular-nums text-muted-foreground">Entrée {model.input_price_per_million ?? '—'} / Sortie {model.output_price_per_million ?? '—'} USD</p><div className="flex gap-1"><Button size="icon" variant="ghost" aria-label={`Modifier ${model.label}`} onClick={() => { setForm(fromModel(model)); setEditing(true); }}><Pencil className="size-3.5" /></Button><Button size="icon" variant="ghost" aria-label={`Supprimer ${model.label}`} disabled={model.is_default || remove.isPending} onClick={() => { if (window.confirm(`Supprimer le modèle ${model.label} ?`)) remove.mutate({ id: model.id }); }}><Trash2 className="size-3.5" /></Button></div></div>) : <SectionState>Aucun modèle configuré. Ajoutez le premier modèle autorisé.</SectionState>}</div>
  </div>;
};
