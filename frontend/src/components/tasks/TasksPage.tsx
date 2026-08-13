import { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Clock3, ListChecks, Play, Plus, RefreshCcw, Search, UserRoundCheck } from 'lucide-react';

import type { TaskListInput } from '../../../../shared/schemas/task/task-api.schema';
import type { Task } from '../../../../shared/schemas/task/task-foundation.schema';
import { Badge } from '@/components/ui/data-display/Badge';
import { Button } from '@/components/ui/inputs/basic/Button';
import { Input } from '@/components/ui/inputs/basic/Input';
import { Textarea } from '@/components/ui/inputs/basic/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/inputs/selects/Select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/feedback/Dialog';
import { newRequestKey, useTaskMutations, useTasksList, useTaskTypes } from '@/hooks/tasks/useTasks';
import { normalizeError } from '@/services/errors/normalizeError';
import type { UserRole } from '@/types';
import TaskCreateDialog from './TaskCreateDialog';
import TaskDetailDialog from './TaskDetailDialog';
import { formatTaskDate, TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from './taskUi';

type View = 'mine' | 'contributions' | 'queue' | 'all';
type Props = { agencyId: string; userId: string; userRole: UserRole };
type ActionDialog = { kind: 'reschedule' | 'complete'; task: Task } | null;

const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const endOfWeek = () => { const date = new Date(); date.setDate(date.getDate() + (7 - date.getDay())); return isoDate(date); };
const CURRENT_DATE = isoDate(new Date());
const PREVIOUS_DATE = (() => { const date = new Date(); date.setDate(date.getDate() - 1); return isoDate(date); })();
const CURRENT_WEEK_END = endOfWeek();

const TasksPage = ({ agencyId, userId, userRole }: Props) => {
  const [view, setView] = useState<View>('mine');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'open' | 'completed' | 'canceled' | 'all'>('open');
  const [due, setDue] = useState<'all' | 'overdue' | 'today' | 'week'>('all');
  const [typeId, setTypeId] = useState('all');
  const [priority, setPriority] = useState<'all' | Task['priority']>('all');
  const [sort, setSort] = useState<'due' | 'priority' | 'created'>('due');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [actionDialog, setActionDialog] = useState<ActionDialog>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const types = useTaskTypes();
  const mutations = useTaskMutations();
  const today = CURRENT_DATE;
  const input = useMemo<TaskListInput>(() => ({
    agency_id: agencyId,
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(status === 'open' ? { status: ['todo', 'in_progress'] } : status === 'all' ? {} : { status: [status] }),
    ...(typeId !== 'all' ? { task_type_id: [typeId] } : {}),
    ...(priority !== 'all' ? { priority: [priority] } : {}),
    ...(view === 'mine' ? { responsible_id: userId } : view === 'contributions' ? { contributor_id: userId } : view === 'queue' ? { responsible_id: null } : {}),
    ...(due === 'overdue' ? { due_to: PREVIOUS_DATE } : due === 'today' ? { due_from: today, due_to: today } : due === 'week' ? { due_from: today, due_to: CURRENT_WEEK_END } : {}),
    sort, direction: sort === 'created' ? 'desc' : 'asc', page, page_size: 25,
  }), [agencyId, due, page, priority, search, sort, status, today, typeId, userId, view]);
  const query = useTasksList(input);
  const isAdmin = userRole === 'super_admin' || userRole === 'agency_admin';
  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / 25));
  const resetPage = <T,>(setter: (value: T) => void, value: T) => { setter(value); setPage(1); };
  const run = async (action: () => Promise<unknown>) => { setActionError(null); try { await action(); } catch (cause) { setActionError(normalizeError(cause, 'Action impossible.').message); } };

  return <div className="flex h-full min-h-0 flex-col overflow-hidden border border-border bg-card" data-testid="tasks-page">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-2 sm:px-5">
      <div><h1 className="flex items-center gap-2 text-base font-semibold"><ListChecks className="size-4 text-primary" /> Tâches</h1><p className="text-xs text-muted-foreground">Pilotez vos actions personnelles et la file collective.</p></div>
      <Button onClick={() => setCreateOpen(true)}><Plus className="size-4" /> Nouvelle tâche</Button>
    </header>
    <nav aria-label="Vues des tâches" className="flex gap-1 overflow-x-auto border-b border-border bg-surface-1 px-3 py-2">
      {([['mine', 'Mes tâches'], ['contributions', 'Mes contributions'], ['queue', 'File d’agence'], ['all', 'Toutes']] as const).map(([id, label]) => <Button key={id} variant={view === id ? 'secondary' : 'ghost'} size="sm" aria-current={view === id ? 'page' : undefined} onClick={() => resetPage(setView, id)}>{label}</Button>)}
    </nav>
    <div className="grid gap-2 border-b border-border p-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_145px_145px_130px_125px_125px]">
      <label className="relative"><span className="sr-only">Rechercher</span><Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" /><Input className="pl-8" value={search} onChange={(e) => resetPage(setSearch, e.target.value)} placeholder="Titre, Tier, contact, responsable…" /></label>
      <Select value={status} onValueChange={(value) => resetPage(setStatus, value as typeof status)}><SelectTrigger aria-label="Filtrer par statut"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="open">Ouvertes</SelectItem><SelectItem value="completed">Terminées</SelectItem><SelectItem value="canceled">Annulées</SelectItem><SelectItem value="all">Tous les statuts</SelectItem></SelectContent></Select>
      <Select value={due} onValueChange={(value) => resetPage(setDue, value as typeof due)}><SelectTrigger aria-label="Filtrer par échéance"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Toute échéance</SelectItem><SelectItem value="overdue">En retard</SelectItem><SelectItem value="today">Aujourd’hui</SelectItem><SelectItem value="week">Cette semaine</SelectItem></SelectContent></Select>
      <Select value={typeId} onValueChange={(value) => resetPage(setTypeId, value)}><SelectTrigger aria-label="Filtrer par type"><SelectValue placeholder="Tous les types" /></SelectTrigger><SelectContent><SelectItem value="all">Tous les types</SelectItem>{types.data?.task_types.map((type) => <SelectItem key={type.id} value={type.id}>{type.label}</SelectItem>)}</SelectContent></Select>
      <Select value={priority} onValueChange={(value) => resetPage(setPriority, value as typeof priority)}><SelectTrigger aria-label="Filtrer par priorité"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Toute priorité</SelectItem><SelectItem value="urgent">Urgente</SelectItem><SelectItem value="high">Haute</SelectItem><SelectItem value="normal">Normale</SelectItem></SelectContent></Select>
      <Select value={sort} onValueChange={(value) => resetPage(setSort, value as typeof sort)}><SelectTrigger aria-label="Trier"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="due">Échéance</SelectItem><SelectItem value="priority">Priorité</SelectItem><SelectItem value="created">Création</SelectItem></SelectContent></Select>
    </div>
    <div className="min-h-0 flex-1 overflow-auto">
      {query.isPending ? <div role="status" aria-busy="true" className="space-y-2 p-4"><p className="sr-only">Chargement des tâches…</p>{Array.from({ length: 6 }).map((_, index) => <div key={index} className="skeleton-shimmer h-12 rounded-md" />)}</div> : query.isError ? <div role="alert" className="m-4 rounded-md border border-destructive/30 bg-destructive/10 p-4"><p className="text-sm">Les tâches n’ont pas pu être chargées.</p><Button variant="outline" size="sm" className="mt-3" onClick={() => void query.refetch()}><RefreshCcw className="size-4" /> Réessayer</Button></div> : query.data?.items.length === 0 ? <div className="grid h-full place-content-center p-8 text-center"><ListChecks className="mx-auto size-8 text-muted-foreground/50" /><h2 className="mt-3 text-sm font-semibold">Aucune tâche dans cette vue</h2><p className="mt-1 text-xs text-muted-foreground">Créez une tâche ou modifiez les filtres.</p><Button className="mt-4" size="sm" onClick={() => setCreateOpen(true)}>Créer une tâche</Button></div> : <table className="w-full min-w-[980px] border-collapse text-xs"><caption className="sr-only">Liste paginée des tâches</caption><thead className="sticky top-0 z-10 bg-surface-2 text-left text-muted-foreground"><tr>{['Tâche', 'Contexte', 'Responsable', 'Échéance', 'Priorité', 'État', 'Actions'].map((label) => <th key={label} scope="col" className="border-b border-border px-3 py-2 font-semibold">{label}</th>)}</tr></thead><tbody>{query.data?.items.map((row) => {
        const task = row.task; const canExecute = isAdmin || task.responsible_id === userId; const isOpen = task.status === 'todo' || task.status === 'in_progress';
        return <tr key={task.id} className="border-b border-border/70 hover:bg-surface-1"><td className="max-w-[280px] px-3 py-2"><button className="block max-w-full truncate text-left font-semibold hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setSelectedTask(task.id)} title={task.title}>{task.title}</button><span className="text-muted-foreground">{row.task_type.label}</span></td><td className="max-w-[220px] px-3 py-2"><span className="block truncate">{row.organization_name ?? 'Interne CIR'}</span>{row.contact_name ? <span className="block truncate text-muted-foreground">{row.contact_name}</span> : null}</td><td className="px-3 py-2">{row.responsible_name ?? <Badge variant="outline">File d’agence</Badge>}</td><td className="px-3 py-2 tabular-nums"><span className={row.is_overdue ? 'font-semibold text-destructive' : ''}>{formatTaskDate(task.due_date, task.due_time)}</span>{row.is_overdue ? <span className="block text-[11px] text-destructive">En retard</span> : null}</td><td className="px-3 py-2"><Badge variant={task.priority === 'urgent' ? 'destructive' : task.priority === 'high' ? 'warning' : 'outline'}>{TASK_PRIORITY_LABELS[task.priority]}</Badge></td><td className="px-3 py-2"><Badge variant={task.status === 'completed' ? 'success' : 'secondary'}>{TASK_STATUS_LABELS[task.status]}</Badge></td><td className="px-3 py-2"><div className="flex items-center gap-1">
          {!task.responsible_id && isOpen ? <Button size="sm" variant="outline" title="Prendre" onClick={() => void run(() => mutations.assignment.mutateAsync({ task_id: task.id, expected_version: task.version, action: 'claim' }))}><UserRoundCheck className="size-3.5" /> Prendre</Button> : null}
          {task.status === 'todo' && canExecute ? <Button size="sm" variant="ghost" title="Commencer" onClick={() => void run(() => mutations.status.mutateAsync({ task_id: task.id, expected_version: task.version, status: 'in_progress' }))}><Play className="size-3.5" /></Button> : null}
          {isOpen && canExecute ? <Button size="sm" variant="ghost" title="Terminer" onClick={() => task.scope === 'tier_relation' ? setActionDialog({ kind: 'complete', task }) : void run(() => mutations.status.mutateAsync({ task_id: task.id, expected_version: task.version, status: 'completed' }))}><Check className="size-3.5" /></Button> : null}
          {isOpen && canExecute ? <Button size="sm" variant="ghost" title="Reporter" onClick={() => setActionDialog({ kind: 'reschedule', task })}><Clock3 className="size-3.5" /></Button> : null}
          <Button size="sm" variant="ghost" onClick={() => setSelectedTask(task.id)}>Ouvrir</Button>
        </div></td></tr>;
      })}</tbody></table>}
    </div>
    <footer className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground"><span>{query.data?.total ?? 0} tâche(s)</span><div className="flex items-center gap-2"><Button size="sm" variant="outline" aria-label="Page précédente" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft className="size-4" /></Button><span>Page {page} sur {totalPages}</span><Button size="sm" variant="outline" aria-label="Page suivante" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}><ChevronRight className="size-4" /></Button></div></footer>
    {actionError ? <p role="alert" className="border-t border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">{actionError}</p> : null}
    <TaskCreateDialog open={createOpen} onOpenChange={setCreateOpen} agencyId={agencyId} userId={userId} />
    <TaskDetailDialog taskId={selectedTask} onOpenChange={(open) => { if (!open) setSelectedTask(null); }} userId={userId} userRole={userRole} />
    <TaskActionDialog action={actionDialog} onClose={() => setActionDialog(null)} onRun={run} mutations={mutations} />
  </div>;
};

type Mutations = ReturnType<typeof useTaskMutations>;
const TaskActionDialog = ({ action, onClose, onRun, mutations }: { action: ActionDialog; onClose: () => void; onRun: (fn: () => Promise<unknown>) => Promise<void>; mutations: Mutations }) => {
  const [date, setDate] = useState(''); const [reason, setReason] = useState(''); const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 16)); const [channel, setChannel] = useState<'Téléphone' | 'Email' | 'Comptoir' | 'Visite'>('Téléphone'); const [activityType, setActivityType] = useState('Suivi'); const [subject, setSubject] = useState(''); const [report, setReport] = useState('');
  if (!action) return null;
  const submit = async () => { if (action.kind === 'reschedule') await onRun(() => mutations.reschedule.mutateAsync({ task_id: action.task.id, expected_version: action.task.version, due_date: date, due_time: action.task.due_time?.slice(0, 5) ?? null, reason: reason.trim() || null })); else await onRun(() => mutations.execute.mutateAsync({ task_id: action.task.id, expected_version: action.task.version, idempotency_key: newRequestKey(), activity: { occurred_at: new Date(occurredAt).toISOString(), channel, activity_type: activityType.trim(), subject: subject.trim(), report: report.trim() || null } })); onClose(); };
  const valid = action.kind === 'reschedule' ? Boolean(date) : Boolean(occurredAt && activityType.trim() && subject.trim());
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent><DialogHeader><DialogTitle>{action.kind === 'reschedule' ? 'Reporter la tâche' : 'Terminer avec une activité'}</DialogTitle><DialogDescription>{action.kind === 'reschedule' ? 'La nouvelle échéance sera historisée.' : 'Les données requises créent l’activité et terminent la tâche dans une seule opération.'}</DialogDescription></DialogHeader>{action.kind === 'reschedule' ? <div className="space-y-3"><label className="block space-y-1 text-xs font-semibold">Nouvelle échéance *<Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></label><label className="block space-y-1 text-xs font-semibold">Motif<Textarea value={reason} onChange={(e) => setReason(e.target.value)} /></label></div> : <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-xs font-semibold">Date et heure *<Input type="datetime-local" required value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} /></label><label className="space-y-1 text-xs font-semibold">Canal *<Select value={channel} onValueChange={(value) => setChannel(value as typeof channel)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['Téléphone', 'Email', 'Comptoir', 'Visite'].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></label><label className="space-y-1 text-xs font-semibold">Type d’activité *<Input required value={activityType} onChange={(e) => setActivityType(e.target.value)} /></label><label className="space-y-1 text-xs font-semibold">Sujet *<Input required value={subject} onChange={(e) => setSubject(e.target.value)} /></label><label className="space-y-1 text-xs font-semibold sm:col-span-2">Compte rendu<Textarea value={report} onChange={(e) => setReport(e.target.value)} /></label></div>}<DialogFooter><Button variant="outline" onClick={onClose}>Annuler</Button><Button disabled={!valid || mutations.execute.isPending || mutations.reschedule.isPending} onClick={() => void submit()}>Confirmer</Button></DialogFooter></DialogContent></Dialog>;
};

export default TasksPage;
