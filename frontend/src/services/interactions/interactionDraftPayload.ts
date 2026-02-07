import { InteractionFormValues } from '@/schemas/interactionSchema';

export type InteractionDraftPayload = {
  values: InteractionFormValues;
};

export type InteractionDraftRecord = {
  id: string;
  payload: InteractionDraftPayload;
  updated_at: string;
};
