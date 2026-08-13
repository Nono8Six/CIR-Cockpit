import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { TaskListInput } from '../../../../shared/schemas/task/task-api.schema';
import {
  addTaskNote,
  administerTaskType,
  changeTaskPriority,
  changeTaskStatus,
  createTask,
  executeTaskWithActivity,
  getTask,
  listTasks,
  listTaskTypes,
  rescheduleTask,
  updateTaskAssignment,
  updateTaskContent,
  updateTaskRecurrence,
} from '@/services/tasks/tasks';

export const taskKeys = {
  root: ['tasks'] as const,
  list: (input: TaskListInput) => ['tasks', 'list', input] as const,
  detail: (id: string | null) => ['tasks', 'detail', id ?? 'none'] as const,
  types: (archived: boolean) => ['tasks', 'types', archived] as const,
};

export const useTaskTypes = (includeArchived = false) => useQuery({
  queryKey: taskKeys.types(includeArchived),
  queryFn: () => listTaskTypes({ include_archived: includeArchived }),
  staleTime: 5 * 60_000,
});

export const useTasksList = (input: TaskListInput, enabled = true) => useQuery({
  queryKey: taskKeys.list(input),
  queryFn: () => listTasks(input),
  enabled,
});

export const useTaskDetail = (id: string | null) => useQuery({
  queryKey: taskKeys.detail(id),
  queryFn: () => getTask(id!),
  enabled: Boolean(id),
});

export const useTaskMutations = () => {
  const client = useQueryClient();
  const invalidate = async () => client.invalidateQueries({ queryKey: taskKeys.root });
  const options = { onSuccess: invalidate };
  return {
    create: useMutation({ mutationFn: createTask, ...options }),
    assignment: useMutation({ mutationFn: updateTaskAssignment, ...options }),
    status: useMutation({ mutationFn: changeTaskStatus, ...options }),
    reschedule: useMutation({ mutationFn: rescheduleTask, ...options }),
    priority: useMutation({ mutationFn: changeTaskPriority, ...options }),
    content: useMutation({ mutationFn: updateTaskContent, ...options }),
    note: useMutation({ mutationFn: addTaskNote, ...options }),
    execute: useMutation({ mutationFn: executeTaskWithActivity, ...options }),
    recurrence: useMutation({ mutationFn: updateTaskRecurrence, ...options }),
    typeAdmin: useMutation({
      mutationFn: administerTaskType,
      onSuccess: async () => {
        await client.invalidateQueries({ queryKey: ['tasks', 'types'] });
        await invalidate();
      },
    }),
  };
};

export const newRequestKey = (): string => crypto.randomUUID();
