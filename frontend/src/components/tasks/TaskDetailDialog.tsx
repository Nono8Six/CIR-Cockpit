import { useState } from 'react';

import { Badge } from '@/components/ui/data-display/Badge';
import { Button } from '@/components/ui/inputs/basic/Button';
import { Input } from '@/components/ui/inputs/basic/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/inputs/selects/Select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/feedback/Dialog';
import { useCockpitAgencyMembers } from '@/hooks/admin/agencies/core/useCockpitAgencyMembers';
import { newRequestKey, useTaskDetail, useTaskMutations } from '@/hooks/tasks/useTasks';
import { normalizeError } from '@/services/errors/normalizeError';
import type { UserRole } from '@/types';
import { formatTaskDate, TASK_EVENT_LABELS, TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from './taskUi';

type Props = { taskId: string | null; onOpenChange: (open: boolean) => void; userId: string; userRole: UserRole };

const TaskDetailDialog = ({ taskId, onOpenChange, userId, userRole }: Props) => {
  const detail = useTaskDetail(taskId);
  const mutations = useTaskMutations();
  const members = useCockpitAgencyMembers(detail.data?.task.agency_id ?? null, Boolean(detail.data));
  const [note, setNote] = useState('');
  const [participantId, setParticipantId] = useState('');
  const [participantRole, setParticipantRole] = useState<'contributor' | 'follower'>('contributor');
  const [error, setError] = useState<string | null>(null);
  const task = detail.data?.task;
  const isAdmin = userRole === 'super_admin' || userRole === 'agency_admin';
  const canExecute = Boolean(task && (isAdmin || task.responsible_id === userId));
  const canManageParticipants = Boolean(task && (isAdmin || task.created_by === userId || task.responsible_id === userId));
  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    try { await action(); await detail.refetch(); } catch (cause) { setError(normalizeError(cause, 'Action impossible.').message); }
  };

  return <Dialog open={Boolean(taskId)} onOpenChange={onOpenChange}>
    <DialogContent className="flex h-[min(90dvh,800px)] w-[min(96vw,760px)] max-w-none flex-col gap-0 overflow-hidden p-0">
      {detail.isPending ? <div role="status" className="p-6 text-sm text-muted-foreground">Chargement de la tâche…</div> : detail.isError || !task ? <div role="alert" className="p-6"><p>Le détail de la tâche est indisponible.</p><Button className="mt-3" variant="outline" onClick={() => void detail.refetch()}>Réessayer</Button></div> : <>
        <DialogHeader className="border-b border-border px-5 py-4">
          <div className="flex flex-wrap items-center gap-2"><Badge variant={task.status === 'completed' ? 'success' : task.status === 'canceled' ? 'outline' : 'secondary'}>{TASK_STATUS_LABELS[task.status]}</Badge><Badge variant={task.priority === 'urgent' ? 'destructive' : task.priority === 'high' ? 'warning' : 'outline'}>{TASK_PRIORITY_LABELS[task.priority]}</Badge></div>
          <DialogTitle className="mt-2 pr-8">{task.title}</DialogTitle>
          <DialogDescription>{task.scope === 'tier_relation' ? 'Tâche liée à un Tier' : 'Tâche interne'} · Échéance {formatTaskDate(task.due_date, task.due_time)}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {task.description ? <section><h3 className="text-xs font-semibold">Description</h3><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{task.description}</p></section> : null}
          <section aria-labelledby="participants-title"><h3 id="participants-title" className="text-xs font-semibold">Participants</h3>
            <ul className="mt-2 space-y-1 text-sm">{detail.data.participants.length ? detail.data.participants.map((participant) => { const member = members.data?.members.find((item) => item.profile_id === participant.profile_id); const label = member ? [member.first_name, member.last_name].filter(Boolean).join(' ') || member.display_name || member.email : participant.profile_id; return <li key={`${participant.profile_id}-${participant.participant_role}`} className="flex items-center justify-between rounded border px-2 py-1.5"><span>{label} · {participant.participant_role === 'contributor' ? 'Contributeur' : 'Suiveur'}</span>{canManageParticipants ? <Button size="sm" variant="ghost" onClick={() => void run(() => mutations.assignment.mutateAsync({ task_id: task.id, expected_version: task.version, action: 'remove_participant', profile_id: participant.profile_id, participant_role: participant.participant_role }))}>Retirer</Button> : null}</li>; }) : <li className="text-muted-foreground">Aucun participant.</li>}</ul>
            {canManageParticipants && task.status !== 'completed' && task.status !== 'canceled' ? <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_140px_auto]"><Select value={participantId} onValueChange={setParticipantId}><SelectTrigger aria-label="Participant"><SelectValue placeholder="Choisir un membre" /></SelectTrigger><SelectContent>{members.data?.members.map((member) => <SelectItem key={member.profile_id} value={member.profile_id}>{[member.first_name, member.last_name].filter(Boolean).join(' ') || member.display_name || member.email}</SelectItem>)}</SelectContent></Select><Select value={participantRole} onValueChange={(value) => setParticipantRole(value as typeof participantRole)}><SelectTrigger aria-label="Rôle du participant"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="contributor">Contributeur</SelectItem><SelectItem value="follower">Suiveur</SelectItem></SelectContent></Select><Button disabled={!participantId} onClick={() => void run(() => mutations.assignment.mutateAsync({ task_id: task.id, expected_version: task.version, action: 'add_participant', profile_id: participantId, participant_role: participantRole }))}>Ajouter</Button></div> : null}
          </section>
          <section aria-labelledby="history-title"><h3 id="history-title" className="text-xs font-semibold">Historique</h3><ol className="mt-2 border-l border-border pl-4">{detail.data.events.map((event) => <li key={event.id} className="relative pb-3 text-sm before:absolute before:-left-[19px] before:top-1.5 before:size-2 before:rounded-full before:bg-primary"><div className="font-medium">{TASK_EVENT_LABELS[event.event_type]}</div><div className="text-xs text-muted-foreground">{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.occurred_at))}</div>{event.note ? <p className="mt-1 text-muted-foreground">{event.note}</p> : null}</li>)}</ol></section>
          <section><h3 className="text-xs font-semibold">Ajouter une note</h3><div className="mt-2 flex gap-2"><Input value={note} onChange={(event) => setNote(event.target.value)} aria-label="Note" /><Button disabled={!note.trim() || mutations.note.isPending} onClick={() => void run(async () => { await mutations.note.mutateAsync({ task_id: task.id, expected_version: task.version, note: note.trim() }); setNote(''); })}>Ajouter</Button></div></section>
          {error ? <p role="alert" className="text-sm text-destructive">{error} Rechargez la tâche puis réessayez.</p> : null}
        </div>
        <DialogFooter className="border-t border-border px-5 py-3">
          {(task.status === 'completed' || task.status === 'canceled') && canExecute ? <Button variant="outline" onClick={() => void run(() => mutations.status.mutateAsync({ task_id: task.id, expected_version: task.version, status: 'todo' }))}>Réouvrir</Button> : null}
          {task.series_id && canManageParticipants ? <Button variant="outline" onClick={() => void run(() => mutations.recurrence.mutateAsync({ task_id: task.id, expected_version: task.version, action: 'stop' }))}>Arrêter la récurrence</Button> : null}
          {!task.series_id && canManageParticipants && task.status !== 'completed' && task.status !== 'canceled' ? <Button variant="outline" onClick={() => void run(() => mutations.recurrence.mutateAsync({ task_id: task.id, expected_version: task.version, action: 'configure', idempotency_key: newRequestKey(), interval_value: 1, interval_unit: 'week' }))}>Répéter chaque semaine</Button> : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
        </DialogFooter>
      </>}
    </DialogContent>
  </Dialog>;
};

export default TaskDetailDialog;
