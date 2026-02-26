import { InteractionDraft } from '@/types';
import { interactionDraftSchema } from '@/schemas/interactionSchema';
import { createAppError } from '@/services/errors/AppError';

const FIELD_LABELS: Record<string, string> = {
  company_name: 'Nom de la societe',
  subject: 'Sujet',
  entity_type: 'Type de tiers',
  contact_service: 'Service',
  status_id: 'Statut',
  channel: 'Canal',
  interaction_type: "Type d'interaction",
  contact_name: 'Contact',
  entity_id: 'Entite',
  contact_id: 'Contact',
  contact_phone: 'Telephone',
  contact_email: 'Email'
};

const formatIssuePath = (path: PropertyKey[]): string =>
  path.length === 0 ? 'payload' : path.map(String).join('.');

const formatZodDetailsFr = (
  issues: Array<{ code: string; path: PropertyKey[]; message: string; keys?: string[] }>
): string =>
  issues
    .map((issue) => {
      const location = formatIssuePath(issue.path);
      if (issue.code === 'unrecognized_keys' && Array.isArray(issue.keys) && issue.keys.length > 0) {
        return `${location}: champs non autorises (${issue.keys.join(', ')}).`;
      }
      return `${location}: ${issue.message}`;
    })
    .join(' | ');

export const validateInteractionDraft = (draft: InteractionDraft): void => {
  const result = interactionDraftSchema.safeParse(draft);
  if (result.success) return;

  const missing = new Set<string>();
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && FIELD_LABELS[field]) {
      missing.add(FIELD_LABELS[field]);
    }
  }

  const message = missing.size > 0
    ? `Champs obligatoires manquants: ${Array.from(missing).join(', ')}.`
    : 'Champs obligatoires manquants.';

  throw createAppError({
    code: 'VALIDATION_ERROR',
    message,
    source: 'client',
    details: formatZodDetailsFr(result.error.issues)
  });
};
