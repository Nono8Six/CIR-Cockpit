import { sql } from 'drizzle-orm';

import type { ConfigIntegrityInteractionsResponse } from '../../../../../shared/schemas/system/api-responses.ts';
import type { ConfigIntegrityInteractionsInput } from '../../../../../shared/schemas/system/config.schema.ts';
import { httpError } from '../../middleware/errorHandler.ts';
import type { AuthContext, DbClient } from '../../types.ts';
import { ensureAgencyAccess, ensureDataRateLimit } from '../data/dataAccess.ts';

const CONFIG_READ_RATE_LIMIT_MAX = 60;

const conditionFor = (input: ConfigIntegrityInteractionsInput) => {
  const normalized = input.source_label.trim().toLowerCase();
  if (input.dimension === 'services') return sql`lower(i.contact_service) = ${normalized}`;
  if (input.dimension === 'interaction_types') return sql`lower(i.interaction_type) = ${normalized}`;
  if (input.dimension === 'families') return sql`exists (select 1 from unnest(i.mega_families) family where lower(family) = ${normalized})`;
  if (input.source_label === '<sans valeur>') return sql`i.status_id is null`;
  return sql`lower(i.status) = ${normalized}`;
};

export const getConfigIntegrityInteractions = async (
  db: DbClient,
  auth: AuthContext,
  requestId: string | undefined,
  input: ConfigIntegrityInteractionsInput
): Promise<ConfigIntegrityInteractionsResponse> => {
  await ensureDataRateLimit('config:integrity-interactions', auth.userId, {
    max: CONFIG_READ_RATE_LIMIT_MAX
  });
  const agencyId = ensureAgencyAccess(auth, input.agency_id);
  const offset = (input.page - 1) * input.page_size;
  const condition = conditionFor(input);
  try {
    const [rows, totals] = await Promise.all([
      db.execute<ConfigIntegrityInteractionsResponse['interactions'][number]>(sql`
        select i.id, i.subject, i.company_name, i.entity_type, i.created_at, i.updated_at,
          i.last_action_at, i.channel, i.contact_name, i.contact_phone, i.contact_email,
          i.contact_service, i.interaction_type, i.status, i.status_id, i.mega_families,
          i.order_ref, i.reminder_at, i.notes
        from public.interactions i
        where i.agency_id = ${agencyId} and ${condition}
        order by i.created_at desc
        limit ${input.page_size} offset ${offset}
      `),
      db.execute<{ total: number }>(sql`
        select count(*)::int as total from public.interactions i
        where i.agency_id = ${agencyId} and ${condition}
      `)
    ]);
    return { request_id: requestId, ok: true, interactions: rows, page: input.page, page_size: input.page_size, total: totals[0]?.total ?? 0 };
  } catch {
    throw httpError(500, 'DB_READ_FAILED', 'Impossible de charger les interactions concernees.');
  }
};
