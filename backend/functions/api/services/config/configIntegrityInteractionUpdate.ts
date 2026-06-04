import { sql } from 'drizzle-orm';

import type { ConfigIntegrityInteractionUpdateResponse } from '../../../../../shared/schemas/system/api-responses.ts';
import type { ConfigIntegrityInteractionUpdateInput } from '../../../../../shared/schemas/system/config.schema.ts';
import { httpError } from '../../middleware/errorHandler.ts';
import type { AuthContext, DbClient } from '../../types.ts';
import { ensureAgencyAccess, ensureDataRateLimit } from '../data/dataAccess.ts';
import { ensureReferenceWriteAccess } from './configSettings.ts';

type ActiveTarget = {
  id: string;
  label: string;
  is_terminal: boolean | null;
};

const targetFor = async (
  db: DbClient,
  agencyId: string,
  input: ConfigIntegrityInteractionUpdateInput
): Promise<ActiveTarget> => {
  const rows = input.dimension === 'statuses'
    ? await db.execute<ActiveTarget>(sql`
        select id, label, is_terminal
        from public.agency_statuses
        where id = ${input.target_reference_id} and agency_id = ${agencyId} and is_active = true
        limit 1
      `)
    : await db.execute<ActiveTarget>(sql`
        select id, label, null::boolean as is_terminal
        from ${
          input.dimension === 'services'
            ? sql`public.agency_services`
            : input.dimension === 'families'
              ? sql`public.agency_families`
              : sql`public.agency_interaction_types`
        }
        where id = ${input.target_reference_id} and agency_id = ${agencyId} and archived_at is null
        limit 1
      `);
  const target = rows[0];
  if (!target) {
    throw httpError(409, 'CONFLICT', "La valeur cible n'est plus disponible.");
  }
  return target;
};

const updateInteraction = async (
  db: DbClient,
  auth: AuthContext,
  agencyId: string,
  input: ConfigIntegrityInteractionUpdateInput,
  target: ActiveTarget
): Promise<void> => {
  const normalized = input.source_label.trim().toLowerCase();
  const rows = input.dimension === 'statuses'
    ? await db.execute<{ id: string }>(sql`
        update public.interactions
        set status_id = ${target.id}, status = ${target.label},
          status_is_terminal = ${target.is_terminal ?? false}, updated_by = ${auth.userId}
        where id = ${input.interaction_id} and agency_id = ${agencyId}
          and ${input.source_label === '<sans valeur>' ? sql`status_id is null` : sql`lower(status) = ${normalized}`}
        returning id
      `)
    : input.dimension === 'families'
      ? await db.execute<{ id: string }>(sql`
          update public.interactions
          set mega_families = (
            select array_agg(case when lower(family) = ${normalized} then ${target.label} else family end order by position)
            from unnest(mega_families) with ordinality as current_family(family, position)
          ), updated_by = ${auth.userId}
          where id = ${input.interaction_id} and agency_id = ${agencyId}
            and exists (select 1 from unnest(mega_families) family where lower(family) = ${normalized})
          returning id
        `)
      : await db.execute<{ id: string }>(sql`
          update public.interactions
          set ${
            input.dimension === 'services'
              ? sql`contact_service = ${target.label}`
              : sql`interaction_type = ${target.label}`
          }, updated_by = ${auth.userId}
          where id = ${input.interaction_id} and agency_id = ${agencyId}
            and ${
              input.dimension === 'services'
                ? sql`lower(contact_service) = ${normalized}`
                : sql`lower(interaction_type) = ${normalized}`
            }
          returning id
        `);
  if (rows.length === 0) {
    throw httpError(409, 'CONFLICT', "Cette interaction a deja ete modifiee. Rechargez l'inspecteur.");
  }
};

export const updateConfigIntegrityInteraction = async (
  db: DbClient,
  auth: AuthContext,
  requestId: string | undefined,
  input: ConfigIntegrityInteractionUpdateInput
): Promise<ConfigIntegrityInteractionUpdateResponse> => {
  await ensureDataRateLimit('config:integrity-interaction-update', auth.userId);
  ensureReferenceWriteAccess(auth);
  const agencyId = ensureAgencyAccess(auth, input.agency_id);
  try {
    await db.transaction(async (tx) => {
      const target = await targetFor(tx, agencyId, input);
      await updateInteraction(tx, auth, agencyId, input, target);
    });
  } catch (error) {
    const code = typeof error === 'object' && error !== null ? Reflect.get(error, 'code') : null;
    if (code === 'CONFLICT' || code === 'AUTH_FORBIDDEN') throw error;
    throw httpError(500, 'DB_WRITE_FAILED', "Impossible de corriger l'interaction.");
  }
  return { request_id: requestId, ok: true, interaction_id: input.interaction_id };
};
