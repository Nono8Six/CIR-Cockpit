import { sql } from 'drizzle-orm';

import { entities } from '../../../drizzle/schema.ts';
import type { Database } from '../../../../shared/supabase.types.ts';
import type { DataEntitiesPayload } from '../../../../shared/schemas/data.schema.ts';

export type EntityRow = Database['public']['Tables']['entities']['Row'];
export type EntityContactRow = Database['public']['Tables']['entity_contacts']['Row'];
export type EntityInsert = typeof entities.$inferInsert;
export type EntityUpdate = Omit<EntityInsert, 'created_by'>;
export type AgencyLookupRow = Pick<Database['public']['Tables']['agencies']['Row'], 'id' | 'archived_at'>;
export type SaveEntityPayload = Extract<DataEntitiesPayload, { action: 'save' }>;
export type SaveClientPayload = Extract<SaveEntityPayload, { entity_type: 'Client' }>;
export type SaveIndividualClientPayload = SaveClientPayload & {
  entity: Extract<SaveClientPayload['entity'], { client_kind: 'individual' }>;
};
export type ListEntitiesPayload = Extract<DataEntitiesPayload, { action: 'list' }>;
export type SearchIndexPayload = Extract<DataEntitiesPayload, { action: 'search_index' }>;
export type ReassignEntityPayload = Extract<DataEntitiesPayload, { action: 'reassign' }>;
export type DeleteEntityPayload = Extract<DataEntitiesPayload, { action: 'delete' }>;
export type AccountType = Database['public']['Enums']['account_type'];
export type EntityContactInsert = Database['public']['Tables']['entity_contacts']['Insert'];
export type SqlCondition = ReturnType<typeof sql>;

const readErrorField = (value: unknown, key: string): string | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const field = Reflect.get(value, key);
  if (typeof field !== 'string') {
    return undefined;
  }
  const trimmed = field.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const extractDbErrorDetails = (error: unknown): string | undefined => {
  const code = readErrorField(error, 'code');
  const message = readErrorField(error, 'message');
  const detail = readErrorField(error, 'detail');
  const hint = readErrorField(error, 'hint');

  const details: string[] = [];
  if (code) {
    details.push(`code=${code}`);
  }
  if (message) {
    details.push(message);
  }
  if (detail) {
    details.push(`detail=${detail}`);
  }
  if (hint) {
    details.push(`hint=${hint}`);
  }

  return details.length > 0 ? details.join(' | ') : undefined;
};
