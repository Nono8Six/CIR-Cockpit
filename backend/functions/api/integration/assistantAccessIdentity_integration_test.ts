import { assertEquals, assertRejects } from "std/assert";
import postgres from "postgres";

const enabled = Deno.env.get("RUN_AI_DB_EVALS") === "1";
const databaseUrl = Deno.env.get("DATABASE_URL")?.trim() ?? "";

Deno.test({
  name:
    "assistant access resolves backend identities without relying on auth.uid",
  ignore: !enabled || databaseUrl.length === 0,
  fn: async () => {
    const sql = postgres(databaseUrl, { max: 2, prepare: false });
    try {
      const [superAdmin] = await sql<{ id: string }[]>`
        select id from public.profiles
        where role = 'super_admin' and archived_at is null and is_system = false
        limit 1
      `;
      if (superAdmin) {
        const [resolution] = await sql<{
          allowed: boolean;
          reason: string | null;
          origin: string;
        }[]>`
          select * from private.resolve_ai_feature_access(
            'assistant.referentiels', ${superAdmin.id}::uuid, null
          )
        `;
        assertEquals(resolution, {
          allowed: true,
          reason: null,
          origin: "superadmin",
        });
      }

      const [member] = await sql<{ user_id: string; agency_id: string }[]>`
        select m.user_id, m.agency_id
        from public.agency_members m
        join public.profiles p on p.id = m.user_id
        where p.role <> 'super_admin' and p.archived_at is null and p.is_system = false
        limit 1
      `;
      if (member) {
        const [resolution] = await sql<{
          allowed: boolean;
          reason: string | null;
          origin: string;
        }[]>`
          select * from private.resolve_ai_feature_access(
            'assistant.referentiels', ${member.user_id}::uuid, ${member.agency_id}::uuid
          )
        `;
        assertEquals(typeof resolution.allowed, "boolean");
        assertEquals(
          ["user", "agency", "global", "default"].includes(resolution.origin),
          true,
        );
      }

      const identities = await sql<{ id: string }[]>`
        select id from public.profiles
        where archived_at is null and is_system = false
        order by id limit 2
      `;
      if (identities.length === 2) {
        await assertRejects(
          () =>
            sql.begin(async (tx) => {
              await tx.unsafe(
                "select set_config('request.jwt.claims', $1, true)",
                [JSON.stringify({
                  sub: identities[0].id,
                  role: "authenticated",
                })],
              );
              await tx.unsafe(
                "select * from private.resolve_ai_feature_access('assistant.referentiels', $1::uuid, null)",
                [identities[1].id],
              );
            }),
          Error,
          "Identite d acces IA invalide.",
        );
      }
    } finally {
      await sql.end({ timeout: 5 });
    }
  },
});
