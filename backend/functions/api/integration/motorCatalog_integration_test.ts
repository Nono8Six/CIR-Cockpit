import {
  assert,
  assertEquals,
  assertRejects
} from 'std/assert';
import postgres from 'postgres';

import type { AuthContext } from '../types.ts';
import {
  motorCatalogService
} from '../services/configurator/motorCatalog.ts';
import {
  resetConfiguratorReadExecutorForTests
} from '../services/configurator/configuratorReadExecutor.ts';

const databaseUrl = Deno.env.get('DATABASE_URL')?.trim() ?? '';
const enabled = Deno.env.get('RUN_CONFIGURATOR_DB_PROOFS') === '1';
const fixtureId = 'f155bcb1-6966-4f4e-8a2c-a2d85f66727f';

Deno.test({
  name: 'motor catalog list/get proves active-only rows, provenance and no point merging',
  ignore: !enabled || databaseUrl.length === 0,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const adminSql = postgres(databaseUrl, {
      max: 1,
      prepare: false,
      onnotice: () => {}
    });

    try {
      const [profile] = await adminSql<{
        id: string;
        role: AuthContext['role'];
        active_agency_id: string | null;
      }[]>`
        select id, role, active_agency_id
        from public.profiles
        where id = ${fixtureId}::uuid
          and role = 'tcs'
          and archived_at is null
          and is_system = false
      `;
      assert(profile, 'La fixture Auth tcs C3 dediee est requise');
      const memberships = await adminSql<{ agency_id: string }[]>`
        select agency_id::text
        from public.agency_members
        where user_id = ${fixtureId}::uuid
        order by agency_id
      `;
      assert(memberships.length > 0, 'La fixture tcs doit etre rattachee a une agence');
      const authContext: AuthContext = {
        userId: profile.id,
        role: profile.role,
        agencyIds: memberships.map((membership) => membership.agency_id),
        activeAgencyId: profile.active_agency_id,
        isSuperAdmin: false
      };

      const [activeSnapshot] = await adminSql<{
        id: string;
        label: string;
      }[]>`
        select id::text, label
        from configurator.catalog_snapshot
        where domain = 'motor' and is_active is true
          and status = 'active' and activation_gate_status = 'passed'
      `;
      assert(activeSnapshot);

      const [multiClassModel] = await adminSql<{
        model_key: string;
      }[]>`
        select model.model_key
        from configurator.motor_model model
        join configurator.motor_operating_point point
          on point.snapshot_id = model.snapshot_id and point.model_id = model.id
        where model.snapshot_id = ${activeSnapshot.id}::uuid
          and point.efficiency_class in ('IE3', 'IE4')
        group by model.id, model.model_key
        having count(distinct point.efficiency_class) >= 2
        order by model.id
        limit 1
      `;
      assert(multiClassModel, 'Un modele actif avec points IE3 et IE4 est requis');

      const list = await motorCatalogService.list(
        authContext,
        { search: multiClassModel.model_key, limit: 50 },
        crypto.randomUUID()
      );
      assertEquals(list.snapshot.id, activeSnapshot.id);
      assertEquals(list.snapshot.label, activeSnapshot.label);
      assert(list.items.length >= 2);
      assertEquals(
        new Set(list.items.map((item) => item.candidate.operating_point_id)).size,
        list.items.length
      );
      assert(list.items.some((item) => item.candidate.efficiency_class === 'IE3'));
      assert(list.items.some((item) => item.candidate.efficiency_class === 'IE4'));
      for (const item of list.items) {
        assert(item.model_evidence.length > 0);
        assert(item.operating_point_evidence.length > 0);
      }

      const listedPointIds = list.items.map((item) => item.candidate.operating_point_id);
      const [{ retired_leak_count: retiredLeakCount }] = await adminSql<{
        retired_leak_count: number;
      }[]>`
        select count(*)::int as retired_leak_count
        from configurator.motor_operating_point point
        join configurator.catalog_snapshot snapshot on snapshot.id = point.snapshot_id
        where point.id = any(${listedPointIds}::bigint[])
          and snapshot.is_active is false
      `;
      assertEquals(retiredLeakCount, 0);

      const detail = await motorCatalogService.get(
        authContext,
        {
          operating_point_id: list.items[0].candidate.operating_point_id,
          mounting: 'B3'
        },
        crypto.randomUUID()
      );
      assertEquals(detail.snapshot.id, activeSnapshot.id);
      assertEquals(
        detail.operating_point.id,
        list.items[0].candidate.operating_point_id
      );
      assert(detail.model.evidence.length > 0);
      assert(detail.operating_point.evidence.length > 0);
      for (const sourced of [
        ...detail.efficiency_points,
        ...detail.torque_points,
        ...detail.dimensions,
        ...detail.flange_options,
        ...detail.brake_options,
        ...detail.issues
      ]) {
        assert(sourced.evidence.length > 0);
      }
      for (const decisive of [
        detail.from_motor_spec.electrical.power_kw,
        detail.from_motor_spec.electrical.frequency_hz,
        detail.from_motor_spec.electrical.supply_mode
      ]) {
        assert(decisive.value !== null);
        assert(decisive.evidence.length > 0);
      }
      assert(
        detail.normalization.status === 'satisfied'
        || detail.normalization.status === 'indeterminate'
      );

      const [retiredPoint] = await adminSql<{ id: string }[]>`
        select point.id::text
        from configurator.motor_operating_point point
        join configurator.catalog_snapshot snapshot on snapshot.id = point.snapshot_id
        where snapshot.domain = 'motor' and snapshot.is_active is false
        order by point.id
        limit 1
      `;
      assert(retiredPoint, 'Un point retire est requis pour la preuve anti-fuite');
      const notFound = await assertRejects(
        () => motorCatalogService.get(
          authContext,
          { operating_point_id: retiredPoint.id, mounting: 'B3' },
          crypto.randomUUID()
        ),
        Error
      );
      assertEquals(
        Reflect.get(notFound, 'code'),
        'CONFIGURATOR_OPERATING_POINT_NOT_FOUND'
      );
    } finally {
      await resetConfiguratorReadExecutorForTests();
      await adminSql.end({ timeout: 5 });
    }
  }
});
