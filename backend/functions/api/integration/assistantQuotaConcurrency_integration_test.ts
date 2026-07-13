import { assertEquals } from "std/assert";
import postgres from "postgres";

const enabled = Deno.env.get("RUN_AI_DB_EVALS") === "1";
const databaseUrl = Deno.env.get("DATABASE_URL")?.trim() ?? "";

Deno.test({
  name:
    "assistant quota admission is atomic and idempotent under 20 concurrent calls",
  ignore: !enabled || databaseUrl.length === 0,
  fn: async () => {
    const sql = postgres(databaseUrl, { max: 20, prepare: false });
    const userId = crypto.randomUUID();
    try {
      await sql`
        insert into public.ai_quota_policies(
          scope, user_id, feature, enabled, daily_call_limit, monthly_call_limit
        ) values ('user', ${userId}::uuid, 'assistant.referentiels', true, 5, 5)
      `;

      const admissions = await Promise.all(
        Array.from(
          { length: 20 },
          () =>
            sql<{ admission_status: string; is_new: boolean }[]>`
            select admission_status, is_new
            from private.reserve_ai_assistant_request(
              'assistant.referentiels', ${userId}::uuid, null,
              ${crypto.randomUUID()}::uuid, 1, 0
            )
          `,
        ),
      );
      assertEquals(
        admissions.flat().filter((row) => row.admission_status === "reserved")
          .length,
        5,
      );

      const idempotencyId = crypto.randomUUID();
      const retries = await Promise.all(
        Array.from(
          { length: 20 },
          () =>
            sql<{ reservation_id: string; is_new: boolean }[]>`
            select reservation_id, is_new
            from private.reserve_ai_assistant_request(
              'assistant.referentiels', ${userId}::uuid, null,
              ${idempotencyId}::uuid, 1, 0
            )
          `,
        ),
      );
      assertEquals(
        new Set(retries.flat().map((row) => row.reservation_id)).size,
        1,
      );
      assertEquals(retries.flat().filter((row) => row.is_new).length, 1);
    } finally {
      await sql`delete from public.ai_request_reservations where user_id = ${userId}::uuid`;
      await sql`delete from public.ai_quota_policies where scope = 'user' and user_id = ${userId}::uuid`;
      await sql.end({ timeout: 5 });
    }
  },
});
