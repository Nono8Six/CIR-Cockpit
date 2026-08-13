import type { Task, TaskEvent } from '../../../../shared/schemas/task/task-foundation.schema';

export const TASK_STATUS_LABELS: Record<Task['status'], string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  completed: 'Terminée',
  canceled: 'Annulée',
};
export const TASK_PRIORITY_LABELS: Record<Task['priority'], string> = {
  normal: 'Normale',
  high: 'Haute',
  urgent: 'Urgente',
};
export const TASK_EVENT_LABELS: Record<TaskEvent['event_type'], string> = {
  created: 'Tâche créée', content_changed: 'Contenu modifié', type_changed: 'Type modifié',
  link_changed: 'Rattachement modifié', responsible_changed: 'Responsable modifié',
  participant_added: 'Participant ajouté', participant_removed: 'Participant retiré',
  due_changed: 'Échéance modifiée', priority_changed: 'Priorité modifiée',
  status_changed: 'Statut modifié', reopened: 'Tâche réouverte', note_added: 'Note ajoutée',
  series_attached: 'Récurrence configurée', series_stopped: 'Récurrence arrêtée',
  next_occurrence_created: 'Occurrence suivante créée', completion_activity_created: 'Activité créée',
};
export const formatTaskDate = (date: string, time: string | null) =>
  new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(`${date}T12:00:00`)) + (time ? ` à ${time.slice(0, 5)}` : '');
