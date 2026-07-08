import { type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { assertEquals, assertRejects, assertStringIncludes } from "std/assert";

import type { DbClient } from "../../../types.ts";
import { activatePricingReferenceSnapshot } from "./referenceActivation.ts";
import { resolveSnapshotId } from "./referenceImports.ts";

type FakeDb = DbClient & {
  calls: unknown[];
  sqls: string[];
};

const dialect = new PgDialect();
const requestId = "req_activation";
const callerId = "99999999-9999-4999-8999-999999999999";
const importId = "11111111-1111-4111-8111-111111111111";
const snapshotId = "22222222-2222-4222-8222-222222222222";
const currentSnapshotId = "33333333-3333-4333-8333-333333333333";
const activatedAt = "2026-07-07T06:40:00.000Z";
const deactivatedAt = "2026-07-07T06:39:59.000Z";

const renderSql = (query: unknown): string =>
  dialect.sqlToQuery(query as SQL).sql;

const createFakeDb = (responses: unknown[][]): FakeDb => {
  const queue = [...responses];
  const calls: unknown[] = [];
  const sqls: string[] = [];
  const db = {
    calls,
    sqls,
    execute: (query: unknown) => {
      calls.push(query);
      sqls.push(renderSql(query));
      return Promise.resolve(queue.shift() ?? []);
    },
    transaction: async <T>(callback: (tx: DbClient) => Promise<T>) =>
      await callback(db as unknown as DbClient),
  } as unknown as FakeDb;
  return db;
};

const activate = (db: DbClient, targetImportId = importId) =>
  activatePricingReferenceSnapshot(
    db,
    callerId,
    requestId,
    { import_id: targetImportId },
    { checkRateLimitFn: () => Promise.resolve(true) },
  );

Deno.test("reference activation activates an analyzed snapshot without previous active version", async () => {
  const db = createFakeDb([
    [{ id: importId, status: "analyse_ok" }],
    [{ id: snapshotId, is_active: false }],
    [],
    [{ id: snapshotId, activated_at: activatedAt }],
  ]);

  const response = await activate(db);

  assertEquals(response, {
    ok: true,
    request_id: requestId,
    import_id: importId,
    snapshot_id: snapshotId,
    activated_at: activatedAt,
    previous_snapshot_id: null,
    previous_deactivated_at: null,
  });
  assertEquals(db.calls.length, 4);
  assertStringIncludes(db.sqls[3] ?? "", "activated_by");
});

Deno.test("reference activation rejects an already active snapshot", async () => {
  const db = createFakeDb([
    [{ id: importId, status: "analyse_ok" }],
    [{ id: snapshotId, is_active: true }],
  ]);

  const error = await assertRejects(() => activate(db), Error);

  assertEquals((error as { status?: number }).status, 409);
  assertEquals(
    (error as { code?: string }).code,
    "PRICING_REFERENCE_SNAPSHOT_ALREADY_ACTIVE",
  );
  assertEquals(db.calls.length, 2);
});

Deno.test("reference activation rolls back to an older analyzed version and keeps imports unchanged", async () => {
  const db = createFakeDb([
    [{ id: importId, status: "analyse_ok" }],
    [{ id: snapshotId, is_active: false }],
    [{ id: currentSnapshotId }],
    [{ id: currentSnapshotId, deactivated_at: deactivatedAt }],
    [{ id: snapshotId, activated_at: activatedAt }],
  ]);

  const response = await activate(db);

  assertEquals(response.previous_snapshot_id, currentSnapshotId);
  assertEquals(response.previous_deactivated_at, deactivatedAt);
  assertEquals(
    db.sqls.some((statement) =>
      statement.includes("update public.pricing_reference_imports")
    ),
    false,
  );
  assertStringIncludes(db.sqls[3] ?? "", "status = 'archive'");
});

Deno.test("reference activation rejects imports that are not analyse_ok", async () => {
  const db = createFakeDb([
    [{ id: importId, status: "analyse_erreur" }],
  ]);

  const error = await assertRejects(() => activate(db), Error);

  assertEquals((error as { status?: number }).status, 409);
  assertEquals(
    (error as { code?: string }).code,
    "PRICING_REFERENCE_SNAPSHOT_ACTIVATION_BLOCKED",
  );
  assertEquals(db.calls.length, 1);
});

Deno.test("reference snapshot resolver prioritizes active snapshot then falls back to latest analyse_ok", async () => {
  const activeDb = createFakeDb([[{ id: snapshotId }]]);
  const activeSnapshotId = await resolveSnapshotId(activeDb, {});

  assertEquals(activeSnapshotId, snapshotId);
  assertEquals(activeDb.calls.length, 1);
  assertStringIncludes(activeDb.sqls[0] ?? "", "where is_active = true");

  const fallbackDb = createFakeDb([[], [{ id: currentSnapshotId }]]);
  const fallbackSnapshotId = await resolveSnapshotId(fallbackDb, {});

  assertEquals(fallbackSnapshotId, currentSnapshotId);
  assertEquals(fallbackDb.calls.length, 2);
  assertStringIncludes(fallbackDb.sqls[1] ?? "", "i.status = 'analyse_ok'");
});
