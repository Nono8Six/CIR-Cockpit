import { useState } from 'react';
import { ListChecks, Plus } from 'lucide-react';

import type { TaskListInput } from '../../../../shared/schemas/task/task-api.schema';
import type { UserRole } from '@/types';
import { Button } from '@/components/ui/inputs/basic/Button';
import { Badge } from '@/components/ui/data-display/Badge';
import { useTasksList } from '@/hooks/tasks/useTasks';
import TaskCreateDialog, { type TaskCreateContext } from './TaskCreateDialog';
import TaskDetailDialog from './TaskDetailDialog';
import { formatTaskDate, TASK_STATUS_LABELS } from './taskUi';

type Props = {
  agencyId: string;
  userId: string;
  userRole: UserRole;
  context: TaskCreateContext;
  organizationId?: string;
  contactId?: string;
  activityId?: string;
};

const TaskContextPanel = ({ agencyId, userId, userRole, context, organizationId, contactId, activityId }: Props) => {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const input: TaskListInput = { agency_id: agencyId, organization_id: organizationId, contact_id: contactId, activity_id: activityId, page: 1, page_size: 50, sort: 'due', direction: 'asc' };
  const query = useTasksList(input);
  return <section aria-label={`Tâches · ${context.contextLabel ?? 'contexte'}`} className="space-y-3">
    <div className="flex items-center justify-between gap-3"><div><h3 className="flex items-center gap-2 text-xs font-semibold"><ListChecks className="size-4 text-primary" /> Tâches</h3><p className="text-xs text-muted-foreground">{query.data?.total ?? 0} tâche(s) liée(s)</p></div><Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}><Plus className="size-3.5" /> Planifier</Button></div>
    {query.isPending ? <p role="status" className="text-xs text-muted-foreground">Chargement des tâches…</p> : query.isError ? <div role="alert" className="text-xs text-destructive">Les tâches sont indisponibles. <button className="underline" onClick={() => void query.refetch()}>Réessayer</button></div> : query.data?.items.length ? <ul className="divide-y divide-border rounded-md border border-border">{query.data.items.map((row) => <li key={row.task.id}><button className="grid w-full gap-1 px-3 py-2 text-left hover:bg-surface-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center" onClick={() => setSelectedTask(row.task.id)}><span className="truncate text-xs font-semibold">{row.task.title}</span><span className="text-xs tabular-nums text-muted-foreground">{formatTaskDate(row.task.due_date, row.task.due_time)}</span><Badge variant={row.task.status === 'completed' ? 'success' : 'secondary'}>{TASK_STATUS_LABELS[row.task.status]}</Badge></button></li>)}</ul> : <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">Aucune tâche liée. Vous pouvez planifier la prochaine action.</p>}
    <TaskCreateDialog open={createOpen} onOpenChange={setCreateOpen} agencyId={agencyId} userId={userId} context={context} />
    <TaskDetailDialog taskId={selectedTask} onOpenChange={(open) => { if (!open) setSelectedTask(null); }} userId={userId} userRole={userRole} />
  </section>;
};

export default TaskContextPanel;
