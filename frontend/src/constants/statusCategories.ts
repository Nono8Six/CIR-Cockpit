import { StatusCategory } from '@/types';

export const STATUS_CATEGORY_LABELS: Record<StatusCategory, string> = {
  todo: 'A traiter',
  in_progress: 'En cours',
  done: 'Termine'
};

export const STATUS_CATEGORY_ORDER: StatusCategory[] = ['todo', 'in_progress', 'done'];
