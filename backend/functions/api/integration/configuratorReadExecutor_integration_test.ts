import {
  assert,
  assertEquals,
  assertRejects
} from 'std/assert';
import postgres from 'postgres';

import type { AuthContext } from '../types.ts';
import {
  CONFIGURATOR_READ_TRANSACTION_LIMITS,
  resetConfiguratorReadExecutorForTests,
  runConfiguratorReadOnly
} from '../services/configurator/configuratorReadExecutor.ts';

const databaseUrl = Deno.env.get('DATABASE_URL')?.trim() ?? '';
const enabled = Deno.env.get('RUN_CONFIGURATOR_DB_PROOFS') === '1';

Deno.test({
  name: 'configurator executor proves authenticated claims, RLS, read-only mode and rollback',
  ignore: !enabled || databaseUrl.length === 0,
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
        where role = 'super_admin'
          and archived_at is null
          and is_system = false
        order by created_at
        limit 1
      `;
      assert(profile, 'Un profil super_admin humain actif est requis pour la preuve read-only');

      const authContext: AuthContext = {
        userId: profile.id,
        role: profile.role,
        agencyIds: [],
        activeAgencyId: profile.active_agency_id,
        isSuperAdmin: true
      };

      const proof = await runConfiguratorReadOnly(authContext, async (transaction) => {
        const [row] = await transaction<{
          database_role: string;
          claims: string;
          statement_timeout: string;
          lock_timeout: string;
          search_path: string;
          motor_count: number;
        }>`
          select current_user as database_role,
                 current_setting('request.jwt.claims', true) as claims,
                 current_setting('statement_timeout') as statement_timeout,
                 current_setting('lock_timeout') as lock_timeout,
                 current_setting('search_path') as search_path,
                 (select count(*)::int from configurator.motor_model) as motor_count
        `;
        return row;
      });

      assertEquals(proof.database_role, 'authenticated');
      const claims = JSON.parse(proof.claims) as {
        sub?: string;
        role?: string;
        app_metadata?: { cir_role?: string };
      };
      assertEquals(claims.sub, authContext.userId);
      assertEquals(claims.role, 'authenticated');
      assertEquals(claims.app_metadata?.cir_role, 'super_admin');
      assertEquals(proof.statement_timeout, '5s');
      assertEquals(proof.lock_timeout, '1s');
      assertEquals(proof.search_path, CONFIGURATOR_READ_TRANSACTION_LIMITS.search_path);
      assert(proof.motor_count > 0);

      const deniedContext: AuthContext = {
        userId: crypto.randomUUID(),
        role: 'tcs',
        agencyIds: [],
        activeAgencyId: null,
        isSuperAdmin: false
      };
      const deniedCount = await runConfiguratorReadOnly(deniedContext, async (transaction) => {
        const [row] = await transaction<{ motor_count: number }>`
          select count(*)::int as motor_count
          from configurator.motor_model
        `;
        return row.motor_count;
      });
      assertEquals(deniedCount, 0);

      const attemptedLabel = `C3 read-only proof ${crypto.randomUUID()}`;
      const writeError = await assertRejects(
        () => runConfiguratorReadOnly(authContext, async (transaction) => {
          await transaction`
            insert into configurator.catalog_snapshot (domain, label, created_by)
            values ('motor', ${attemptedLabel}, ${authContext.userId}::uuid)
          `;
        }),
        Error
      );
      assertEquals(Reflect.get(writeError, 'code'), 'CONFIGURATOR_DB_READ_FAILED');
      assertEquals(
        Reflect.get(Reflect.get(writeError, 'cause') as object, 'code'),
        '25006'
      );

      const [persistentCheck] = await adminSql<{ count: number }[]>`
        select count(*)::int as count
        from configurator.catalog_snapshot
        where label = ${attemptedLabel}
      `;
      assertEquals(persistentCheck.count, 0);
    } finally {
      await resetConfiguratorReadExecutorForTests();
      await adminSql.end({ timeout: 5 });
    }
  }
});
