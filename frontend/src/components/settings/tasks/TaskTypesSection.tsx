import { useState } from 'react';
import { Archive, ArrowDown, ArrowUp, Plus } from 'lucide-react';

import { Button } from '@/components/ui/inputs/basic/Button';
import { Input } from '@/components/ui/inputs/basic/Input';
import { useTaskMutations, useTaskTypes } from '@/hooks/tasks/useTasks';
import { normalizeError } from '@/services/errors/normalizeError';

const TaskTypesSection = () => {
  const query = useTaskTypes(true);
  const mutation = useTaskMutations().typeAdmin;
  const [label, setLabel] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const run = async (action: Parameters<typeof mutation.mutateAsync>[0]) => { setError(null); try { await mutation.mutateAsync(action); } catch (cause) { setError(normalizeError(cause, 'Le type n’a pas pu être modifié.').message); } };
  return <section className="mx-auto max-w-4xl space-y-4 rounded-md border border-border bg-card p-4" aria-labelledby="task-types-title">
    <div><h2 id="task-types-title" className="text-sm font-semibold">Types de tâche</h2><p className="text-xs text-muted-foreground">Administration globale réservée aux super-admins. Les types archivés restent visibles dans l’historique.</p></div>
    <form className="grid gap-2 sm:grid-cols-[160px_minmax(0,1fr)_auto]" onSubmit={(event) => { event.preventDefault(); if (!code.trim() || !label.trim()) return; void run({ action: 'create', code: code.trim(), label: label.trim(), sort_order: query.data?.task_types.length ?? 0 }).then(() => { setCode(''); setLabel(''); }); }}><Input aria-label="Code du type" placeholder="code_type" pattern="[a-z0-9_]+" value={code} onChange={(e) => setCode(e.target.value)} /><Input aria-label="Libellé du type" placeholder="Libellé" value={label} onChange={(e) => setLabel(e.target.value)} /><Button type="submit" disabled={!code.trim() || !label.trim() || mutation.isPending}><Plus className="size-4" /> Ajouter</Button></form>
    {query.isPending ? <p role="status" className="text-xs text-muted-foreground">Chargement des types…</p> : query.isError ? <p role="alert" className="text-xs text-destructive">Les types sont indisponibles.</p> : <ul className="divide-y divide-border rounded-md border border-border">{query.data?.task_types.map((type, index, all) => <li key={type.id} className="grid items-center gap-2 px-3 py-2 sm:grid-cols-[110px_minmax(0,1fr)_auto]"><code className="text-xs text-muted-foreground">{type.code}</code><Input aria-label={`Libellé de ${type.label}`} defaultValue={type.label} disabled={!type.is_active} onBlur={(event) => { const next = event.target.value.trim(); if (next && next !== type.label) void run({ action: 'rename', task_type_id: type.id, label: next }); }} /><div className="flex gap-1"><Button size="sm" variant="ghost" aria-label={`Monter ${type.label}`} disabled={index === 0 || !type.is_active} onClick={() => void run({ action: 'reorder', task_type_id: type.id, sort_order: Math.max(0, type.sort_order - 1) })}><ArrowUp className="size-3.5" /></Button><Button size="sm" variant="ghost" aria-label={`Descendre ${type.label}`} disabled={index === all.length - 1 || !type.is_active} onClick={() => void run({ action: 'reorder', task_type_id: type.id, sort_order: type.sort_order + 1 })}><ArrowDown className="size-3.5" /></Button><Button size="sm" variant="ghost" aria-label={`Archiver ${type.label}`} disabled={!type.is_active} onClick={() => void run({ action: 'archive', task_type_id: type.id })}><Archive className="size-3.5" /> {type.is_active ? 'Archiver' : 'Archivé'}</Button></div></li>)}</ul>}
    {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
  </section>;
};
export default TaskTypesSection;
