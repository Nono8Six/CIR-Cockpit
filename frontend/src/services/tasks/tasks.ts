import {
  taskCreateResponseSchema,
  taskDetailSchema,
  taskExecutionResponseSchema,
  taskListResponseSchema,
  taskRecurrenceResponseSchema,
  taskTypesResponseSchema,
  type TaskAssignmentInput,
  type TaskCreateInput,
  type TaskDetail,
  type TaskExecuteWithActivityInput,
  type TaskListInput,
  type TaskListResponse,
  type TaskNoteInput,
  type TaskPriorityChangeInput,
  type TaskRecurrenceInput,
  type TaskRescheduleInput,
  type TaskStatusChangeInput,
  type TaskTypeAdminInput,
  type TaskTypeListInput,
  type TaskUpdateContentInput,
} from '../../../../shared/schemas/task/task-api.schema';
import { taskTypeSchema, type TaskType } from '../../../../shared/schemas/task/task-foundation.schema';
import { invokeTrpc } from '@/services/api/invokeTrpc';

export const listTaskTypes = (input: TaskTypeListInput = { include_archived: false }) =>
  invokeTrpc(
    (api, options) => api['task-types'].list.query(input, options),
    taskTypesResponseSchema,
    'Impossible de charger les types de tâche.'
  );

export const administerTaskType = (input: TaskTypeAdminInput): Promise<TaskType> =>
  invokeTrpc(
    (api, options) => api['task-types'].admin.mutate(input, options),
    taskTypeSchema,
    'Impossible de modifier le type de tâche.'
  );

export const listTasks = (input: TaskListInput): Promise<TaskListResponse> =>
  invokeTrpc(
    (api, options) => api.tasks.list.query(input, options),
    taskListResponseSchema,
    'Impossible de charger les tâches.'
  );

export const getTask = (taskId: string): Promise<TaskDetail> =>
  invokeTrpc(
    (api, options) => api.tasks.get.query({ task_id: taskId }, options),
    taskDetailSchema,
    'Impossible de charger la tâche.'
  );

export const createTask = (input: TaskCreateInput) => invokeTrpc(
  (api, options) => api.tasks.create.mutate(input, options),
  taskCreateResponseSchema,
  'Impossible de créer la tâche.'
);

export const updateTaskContent = (input: TaskUpdateContentInput) => invokeTrpc(
  (api, options) => api.tasks['update-content'].mutate(input, options), taskDetailSchema,
  'Impossible de modifier la tâche.'
);
export const updateTaskAssignment = (input: TaskAssignmentInput) => invokeTrpc(
  (api, options) => api.tasks['update-assignment'].mutate(input, options), taskDetailSchema,
  "Impossible de modifier l'affectation."
);
export const rescheduleTask = (input: TaskRescheduleInput) => invokeTrpc(
  (api, options) => api.tasks.reschedule.mutate(input, options), taskDetailSchema,
  'Impossible de reporter la tâche.'
);
export const changeTaskPriority = (input: TaskPriorityChangeInput) => invokeTrpc(
  (api, options) => api.tasks['change-priority'].mutate(input, options), taskDetailSchema,
  'Impossible de modifier la priorité.'
);
export const changeTaskStatus = (input: TaskStatusChangeInput) => invokeTrpc(
  (api, options) => api.tasks['change-status'].mutate(input, options), taskDetailSchema,
  'Impossible de modifier le statut.'
);
export const addTaskNote = (input: TaskNoteInput) => invokeTrpc(
  (api, options) => api.tasks['add-note'].mutate(input, options), taskDetailSchema,
  'Impossible d’ajouter la note.'
);
export const executeTaskWithActivity = (input: TaskExecuteWithActivityInput) => invokeTrpc(
  (api, options) => api.tasks['execute-with-activity'].mutate(input, options),
  taskExecutionResponseSchema,
  'Impossible de terminer la tâche avec une activité.'
);
export const updateTaskRecurrence = (input: TaskRecurrenceInput) => invokeTrpc(
  (api, options) => api.tasks.recurrence.mutate(input, options),
  taskRecurrenceResponseSchema,
  'Impossible de modifier la récurrence.'
);
