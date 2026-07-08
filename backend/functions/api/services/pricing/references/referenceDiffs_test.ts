import { assertEquals } from "std/assert";

import type { DbClient } from "../../../types.ts";
import { computePricingReferenceDiff } from "./referenceDiffs.ts";

type FakeDb = DbClient & {
  calls: unknown[];
};

const createFakeDb = (responses: unknown[][]): FakeDb => {
  const queue = [...responses];
  const calls: unknown[] = [];
  const db = {
    calls,
    execute: (query: unknown) => {
      calls.push(query);
      return Promise.resolve(queue.shift() ?? []);
    },
    transaction: async <T>(callback: (tx: DbClient) => Promise<T>) =>
      await callback(db as unknown as DbClient),
  } as unknown as FakeDb;
  return db;
};

Deno.test("reference diff first import stores a summary without massive additions", async () => {
  const targetSnapshotId = "22222222-2222-4222-8222-222222222222";
  const db = createFakeDb([
    [{ id: targetSnapshotId }],
    [],
    [],
    [{ count: 2 }],
    [{ count: 3 }],
    [{ count: 4 }],
    [{ count: 5 }],
    [{ count: 1 }],
    [{ count: 0 }],
    [],
    [],
    [],
    [{ count: 0 }],
    [],
    [],
  ]);

  const summary = await computePricingReferenceDiff(db, null, targetSnapshotId);

  assertEquals(summary.base_snapshot_id, null);
  assertEquals(summary.target_snapshot_id, targetSnapshotId);
  assertEquals(summary.initial_import, true);
  assertEquals(summary.total, 0);
  assertEquals(summary.counts_by_type, []);
  assertEquals(summary.snapshot_counters.target, {
    classifications: 2,
    segments: 3,
    liaisons: 4,
    grilles: 5,
    anomalies: 1,
  });
  assertEquals(db.calls.length, 15);
});
