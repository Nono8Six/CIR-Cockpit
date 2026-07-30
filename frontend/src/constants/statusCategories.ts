import { StatusCategory } from '@/types';

export const STATUS_CATEGORY_LABELS: Record<StatusCategory, string> = {
  todo: 'À traiter',
  in_progress: 'En cours',
  done: 'Terminé'
};

export const STATUS_CATEGORY_ORDER: StatusCategory[] = ['todo', 'in_progress', 'done'];
