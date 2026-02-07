import { ResultAsync } from 'neverthrow';

import { safeAsync } from '@/lib/result';
import { getActiveAgencyId } from '@/services/agency/getActiveAgencyId';
import { createAppError, type AppError } from '@/services/errors/AppError';
import { mapPostgrestError } from '@/services/errors/mapPostgrestError';
import { normalizeError } from '@/services/errors/normalizeError';
import { requireSupabaseClient } from '@/services/supabase/requireSupabaseClient';
import type { AgencyConfig } from './getAgencyConfig';
import { normalizeLabelList, normalizeStatusList, TABLE_LABELS, type ConfigTable } from './saveAgencyConfig.helpers';

const syncTable = async (table: ConfigTable, agencyId: string, labels: string[]): Promise<void> => {
  const supabase = requireSupabaseClient();
  const desired = normalizeLabelList(labels);
  const desiredSet = new Set(desired.map(label => label.toLowerCase()));

  const { data: existing, error: existingError, status: existingStatus } = await supabase.from(table).select('label').eq('agency_id', agencyId);
  if (existingError) throw mapPostgrestError(existingError, { operation: 'read', resource: TABLE_LABELS[table], status: existingStatus });

  const toDelete = (existing ?? []).map(item => item.label).filter(label => !desiredSet.has(label.toLowerCase()));

  if (desired.length > 0) {
    const rows = desired.map((label, index) => ({ agency_id: agencyId, label, sort_order: index + 1, ...(table === 'agency_statuses' ? { is_default: index === 0 } : {}) }));
    const { error: upsertError, status: upsertStatus } = await supabase.from(table).upsert(rows, { onConflict: 'agency_id,label' });
    if (upsertError) throw mapPostgrestError(upsertError, { operation: 'write', resource: TABLE_LABELS[table], status: upsertStatus });
  }

  if (toDelete.length > 0) {
    const { error: deleteError, status: deleteStatus } = await supabase.from(table).delete().eq('agency_id', agencyId).in('label', toDelete);
    if (deleteError) throw mapPostgrestError(deleteError, { operation: 'write', resource: TABLE_LABELS[table], status: deleteStatus });
  }
};

export const saveAgencyConfig = (config: AgencyConfig): ResultAsync<void, AppError> =>
  safeAsync((async () => {
    const agencyId = await getActiveAgencyId();
    const statuses = normalizeStatusList(config.statuses);
    if (statuses.length === 0) throw createAppError({ code: 'CONFIG_INVALID', message: 'Au moins un statut est requis.', source: 'client' });
    if (statuses.some(status => !status.id)) throw createAppError({ code: 'CONFIG_INVALID', message: "Identifiant de statut manquant. Rechargez la page puis reessayez.", source: 'client' });

    const supabase = requireSupabaseClient();
    const { data: existing, error: existingError, status: existingStatus } = await supabase.from('agency_statuses').select('id, label').eq('agency_id', agencyId);
    if (existingError) throw mapPostgrestError(existingError, { operation: 'read', resource: TABLE_LABELS.agency_statuses, status: existingStatus });

    const existingRows = existing ?? [];
    const existingByLabel = new Map(existingRows.map(row => [row.label.toLowerCase(), row.id]));
    const rows = statuses.map((status, index) => ({ ...(status.id ?? existingByLabel.get(status.label.toLowerCase()) ? { id: status.id ?? existingByLabel.get(status.label.toLowerCase()) } : {}), agency_id: agencyId, label: status.label, sort_order: index + 1, is_default: index === 0, category: status.category, is_terminal: status.category === 'done' }));

    const { error: upsertError, status: upsertStatus } = await supabase.from('agency_statuses').upsert(rows, { onConflict: 'id' });
    if (upsertError) throw mapPostgrestError(upsertError, { operation: 'write', resource: TABLE_LABELS.agency_statuses, status: upsertStatus });

    const desiredIds = new Set(rows.map(row => row.id).filter((id): id is string => Boolean(id)));
    const toDeleteIds = existingRows.map(row => row.id).filter(id => !desiredIds.has(id));
    if (toDeleteIds.length > 0) {
      const { error: deleteError, status: deleteStatus } = await supabase.from('agency_statuses').delete().eq('agency_id', agencyId).in('id', toDeleteIds);
      if (deleteError) throw mapPostgrestError(deleteError, { operation: 'write', resource: TABLE_LABELS.agency_statuses, status: deleteStatus });
    }

    await syncTable('agency_services', agencyId, config.services);
    await syncTable('agency_entities', agencyId, config.entities);
    await syncTable('agency_families', agencyId, config.families);
    await syncTable('agency_interaction_types', agencyId, config.interactionTypes);
  })(), error => normalizeError(error, 'Impossible de mettre a jour la configuration.'));
