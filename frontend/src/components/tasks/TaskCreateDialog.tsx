import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

import type { TaskPriority, TaskVisibility } from './types';
import { Button } from '@/components/ui/inputs/basic/Button';
import { Input } from '@/components/ui/inputs/basic/Input';
import { Textarea } from '@/components/ui/inputs/basic/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/inputs/selects/Select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/feedback/Dialog';
import { normalizeError } from '@/services/errors/normalizeError';
import { newRequestKey, useTaskMutations, useTaskTypes } from '@/hooks/tasks/useTasks';

export type TaskCreateContext = {
  organizationId?: string;
  contactId?: string;
  activityId?: string;
  contextLabel?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencyId: string;
  userId: string;
  context?: TaskCreateContext;
};

const today = () => new Date().toISOString().slice(0, 10);

const TaskCreateDialog = ({ open, onOpenChange, agencyId, userId, context }: Props) => {
  const types = useTaskTypes();
  const mutations = useTaskMutations();
  const [title, setTitle] = useState('');
  const [typeId, setTypeId] = useState('');
  const [dueDate, setDueDate] = useState(today());
  const [advanced, setAdvanced] = useState(Boolean(context));
  const [description, setDescription] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [visibility, setVisibility] = useState<TaskVisibility>(context?.organizationId ? 'tier' : 'agency');
  const [queue, setQueue] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !typeId || !dueDate) return;
    setError(null);
    try {
      const useAdvanced = advanced || Boolean(context);
      await mutations.create.mutateAsync(useAdvanced ? {
        kind: 'advanced', agency_id: agencyId, title: title.trim(), task_type_id: typeId,
        due_date: dueDate, idempotency_key: newRequestKey(), description: description.trim() || null,
        planned_channel: null, scope: context?.organizationId ? 'tier_relation' : 'internal_cir',
        organization_id: context?.organizationId ?? null, contact_id: context?.contactId ?? null,
        source_activity_id: context?.activityId ?? null, responsible_id: queue ? null : userId,
        priority, due_time: dueTime || null, visibility, participants: [],
      } : {
        kind: 'quick', agency_id: agencyId, title: title.trim(), task_type_id: typeId,
        due_date: dueDate, idempotency_key: newRequestKey(),
      });
      setTitle(''); setTypeId(''); setDueDate(today()); setDescription(''); setDueTime(''); setPriority('normal');
      onOpenChange(false);
    } catch (cause) {
      setError(normalizeError(cause, 'La tâche n’a pas pu être créée.').message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(94vw,640px)] max-w-none">
        <DialogHeader>
          <DialogTitle>Créer une tâche</DialogTitle>
          <DialogDescription>{context?.contextLabel ? `Contexte : ${context.contextLabel}.` : 'Titre, type et échéance suffisent pour commencer.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_150px]">
            <label className="space-y-1 text-xs font-semibold">Titre <span aria-hidden="true">*</span>
              <Input required value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Titre de la tâche" />
            </label>
            <label className="space-y-1 text-xs font-semibold">Type <span aria-hidden="true">*</span>
              <Select value={typeId} onValueChange={setTypeId} required>
                <SelectTrigger aria-label="Type de tâche"><SelectValue placeholder={types.isLoading ? 'Chargement…' : 'Choisir'} /></SelectTrigger>
                <SelectContent>{types.data?.task_types.map((type) => <SelectItem key={type.id} value={type.id}>{type.label}</SelectItem>)}</SelectContent>
              </Select>
            </label>
            <label className="space-y-1 text-xs font-semibold">Échéance <span aria-hidden="true">*</span>
              <Input required type="date" min={today()} value={dueDate} onChange={(e) => setDueDate(e.target.value)} aria-label="Échéance" />
            </label>
          </div>
          <Button type="button" variant="ghost" size="sm" aria-expanded={advanced} onClick={() => setAdvanced((value) => !value)}>
            Plus d’options <ChevronDown className={`size-4 transition-transform ${advanced ? 'rotate-180' : ''}`} />
          </Button>
          {advanced ? (
            <div className="grid gap-3 rounded-md border border-border bg-surface-1 p-3 sm:grid-cols-3">
              <label className="space-y-1 text-xs font-semibold sm:col-span-3">Description
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
              </label>
              <label className="space-y-1 text-xs font-semibold">Heure
                <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
              </label>
              <label className="space-y-1 text-xs font-semibold">Priorité
                <Select value={priority} onValueChange={(value) => setPriority(value as TaskPriority)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="normal">Normale</SelectItem><SelectItem value="high">Haute</SelectItem><SelectItem value="urgent">Urgente</SelectItem></SelectContent></Select>
              </label>
              {!context?.organizationId ? <label className="space-y-1 text-xs font-semibold">Affectation
                <Select value={queue ? 'queue' : 'me'} onValueChange={(value) => setQueue(value === 'queue')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="me">Moi</SelectItem><SelectItem value="queue">File d’agence</SelectItem></SelectContent></Select>
              </label> : null}
              {!context?.organizationId ? <label className="space-y-1 text-xs font-semibold">Visibilité
                <Select value={visibility} onValueChange={(value) => setVisibility(value as TaskVisibility)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="agency">Agence</SelectItem><SelectItem value="restricted">Restreinte</SelectItem></SelectContent></Select>
              </label> : null}
            </div>
          ) : null}
          {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button><Button type="submit" disabled={!title.trim() || !typeId || !dueDate || mutations.create.isPending}>{mutations.create.isPending ? 'Création…' : 'Créer'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TaskCreateDialog;
