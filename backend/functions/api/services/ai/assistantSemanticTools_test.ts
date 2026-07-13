import { type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { assertEquals, assertStringIncludes } from "std/assert";

import {
  executeDeterministicReferenceTool,
  getDeterministicReferenceIntent,
  selectAssistantTools,
} from "./assistantBroker.ts";
import {
  executeAssistantTool,
  openRouterToolDefinitions,
} from "./assistantTools.ts";
import {
  escapePricingReferenceLikeTerm,
  expandPricingReferenceSearchTerms,
  normalizePricingReferenceBrand,
  normalizePricingReferenceSearchTerms,
} from "../pricing/references/referenceSemantics.ts";
import type { AuthContext, DbClient } from "../../types.ts";

const authContext = {
  userId: "00000000-0000-4000-8000-000000000001",
  activeAgencyId: "00000000-0000-4000-8000-000000000002",
  role: "super_admin",
} as AuthContext;
const snapshotId = "4e216bc4-7d82-4eb7-aa20-2cc8316667cc";
const dialect = new PgDialect();

const fakeDb = (responses: unknown[][]) => {
  const queue = [...responses];
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const db = {
    execute(query: unknown) {
      queries.push(dialect.sqlToQuery(query as SQL));
      return Promise.resolve(queue.shift() ?? []);
    },
  } as unknown as DbClient;
  return { db, queries };
};

Deno.test("P1 centralise les alias de marque et les synonymes CAT_FAB", () => {
  assertEquals(normalizePricingReferenceBrand(" FESTO "), "FEST");
  assertEquals(normalizePricingReferenceBrand("Rockwell"), "ROCK");
  assertEquals(
    normalizePricingReferenceSearchTerms(["Drive", "Drives", "VFD"]),
    [
      "drive",
      "drives",
      "vfd",
    ],
  );
  assertEquals(escapePricingReferenceLikeTerm("50%_\\"), "50\\%\\_\\\\");
});

Deno.test("P1 correctif preserve VFD, le terme demande et les accents", () => {
  assertEquals(expandPricingReferenceSearchTerms(["VFD"]), {
    requested_terms: ["vfd"],
    canonical_terms: ["vfd"],
    query_terms: ["vfd", "drive", "drives", "variateur"],
  });
  assertEquals(expandPricingReferenceSearchTerms(["électrique"]), {
    requested_terms: ["électrique"],
    canonical_terms: ["electrique"],
    query_terms: ["électrique"],
  });
});

Deno.test("P1 route les trois intentions connues vers un seul outil metier", () => {
  assertEquals(
    getDeterministicReferenceIntent("Il y a combien de marque différentes ?"),
    {
      tool: "count_supplier_brands",
      args: {},
    },
  );
  assertEquals(
    getDeterministicReferenceIntent(
      "Quelles marques ont variateur ou drive dans CAT_FAB ?",
    ),
    {
      tool: "search_supplier_categories",
      args: { terms: ["variateur", "drive"], mode: "any" },
    },
  );
  assertEquals(
    selectAssistantTools(
      "Quelles marques ont Drive dans CAT_FAB ?",
      openRouterToolDefinitions,
    )
      .map((tool) => tool.function.name),
    ["search_supplier_categories"],
  );
  for (const term of ["drive", "Drive", "Drives", "DRIVE"]) {
    assertEquals(
      getDeterministicReferenceIntent(
        `Quelles marques ont ${term} dans CAT_FAB ?`,
      )?.tool,
      "search_supplier_categories",
    );
  }
  assertEquals(
    selectAssistantTools(
      "Combien de clients actifs ?",
      openRouterToolDefinitions,
    )
      .some((tool) => tool.function.name === "execute_readonly_sql"),
    true,
  );
});

Deno.test("P1 le dispatch deterministe ne fait jamais appel au provider factice", async () => {
  let providerCalls = 0;
  const failingProvider = (): never => {
    providerCalls += 1;
    throw new Error("Le provider ne doit jamais etre appele.");
  };
  const routed = await executeDeterministicReferenceTool(
    "Il y a combien de marque différentes ?",
    (tool, args) => Promise.resolve({ tool, args }),
  );
  const result = routed?.result ?? failingProvider();
  assertEquals(result, { tool: "count_supplier_brands", args: {} });
  assertEquals(providerCalls, 0);
});

Deno.test("P1 refuse un champ inconnu avant tout acces DB pour chaque nouvel outil", async () => {
  for (
    const name of [
      "search_supplier_categories",
      "count_supplier_brands",
      "check_brand_matches",
    ]
  ) {
    let executed = false;
    const db = {
      execute: () => {
        executed = true;
        return Promise.resolve([]);
      },
    } as unknown as DbClient;
    const result = await executeAssistantTool(
      db,
      authContext,
      "request-strict-p1",
      name,
      { champ_inconnu: true },
      { surface: "pricing.references" },
    );
    assertEquals(result.output.ok, false);
    assertEquals(executed, false);
  }
});

Deno.test("P1 retourne les verites FEST, ROCK, huit marques et 140 sur le snapshot P0", async () => {
  const aggregateDb = fakeDb([[{
    segment_rows: 673,
    distinct_cat_fab: 673,
    distinct_segments: 673,
  }]]);
  const aggregate = await executeAssistantTool(
    aggregateDb.db,
    authContext,
    "p1-fest",
    "aggregate_segments",
    { marques: ["FESTO"] },
    { surface: "pricing.references", target_snapshot_id: snapshotId },
  );
  assertEquals(aggregate.output.data, {
    snapshot_id: snapshotId,
    marques: ["FEST"],
    segment_rows: 673,
    distinct_cat_fab: 673,
    distinct_segments: 673,
  });

  const brands = [
    "BONF",
    "FEST",
    "LERO",
    "OPTI",
    "PARK",
    "REXR",
    "ROCK",
    "SIEM",
  ];
  const searchDb = fakeDb([
    brands.map((marque) => ({
      marque,
      segment_rows: marque === "ROCK" ? 234 : 1,
    })),
  ]);
  const search = await executeAssistantTool(
    searchDb.db,
    authContext,
    "p1-search",
    "search_supplier_categories",
    { terms: ["variateur", "DRIVE"], mode: "any", examples_limit: 0 },
    { surface: "pricing.references", target_snapshot_id: snapshotId },
  );
  assertEquals(
    (search.output.data as Record<string, unknown>).matching_brands,
    brands,
  );
  assertEquals(
    (search.output.data as Record<string, unknown>).distinct_brand_count,
    8,
  );

  const checkDb = fakeDb([[{ marque: "ROCK", segment_rows: 234 }], [{
    marque: "ROCK",
    cat_fab: "X",
    cat_fab_l: "Drives",
  }]]);
  const check = await executeAssistantTool(
    checkDb.db,
    authContext,
    "p1-check",
    "check_brand_matches",
    {
      marque: "ROCKWELL",
      terms: ["Drive"],
      dimension: "cat_fab",
      examples_limit: 1,
    },
    { surface: "pricing.references", target_snapshot_id: snapshotId },
  );
  assertEquals(check.output.data, {
    snapshot_id: snapshotId,
    marque: "ROCK",
    terms: ["drive", "drives", "variateur", "vfd"],
    requested_terms: ["drive"],
    canonical_terms: ["drive"],
    query_terms: ["drive", "drives", "variateur", "vfd"],
    dimension: "cat_fab",
    matches: true,
    segment_rows: 234,
    examples: [{ marque: "ROCK", cat_fab: "X", cat_fab_l: "Drives" }],
  });

  const countDb = fakeDb([[{ distinct_brand_count: 140 }]]);
  const count = await executeAssistantTool(
    countDb.db,
    authContext,
    "p1-count",
    "count_supplier_brands",
    {},
    { surface: "pricing.references", target_snapshot_id: snapshotId },
  );
  assertEquals(count.output.data, {
    snapshot_id: snapshotId,
    marques: [],
    distinct_brand_count: 140,
  });
  assertStringIncludes(countDb.queries[0].sql, "s.snapshot_id = $1");
  assertEquals(countDb.queries[0].sql.includes("agency_id"), false);
});

Deno.test("P1 parametre et echappe les caracteres LIKE utilisateur", async () => {
  const { db, queries } = fakeDb([[]]);
  await executeAssistantTool(
    db,
    authContext,
    "p1-like",
    "search_supplier_categories",
    { terms: ["50%_\\"], mode: "any", examples_limit: 0 },
    { surface: "pricing.references", target_snapshot_id: snapshotId },
  );
  assertStringIncludes(queries[0].sql, "escape '\\'");
  assertEquals(queries[0].params.includes("%50\\%\\_\\\\%"), true);
});

Deno.test("P1 correctif requete VFD et accent sans perte du litteral", async () => {
  const { db, queries } = fakeDb([[], []]);
  await executeAssistantTool(
    db,
    authContext,
    "p1-vfd-literal",
    "search_supplier_categories",
    { terms: ["VFD"], mode: "any", examples_limit: 0 },
    { surface: "pricing.references", target_snapshot_id: snapshotId },
  );
  await executeAssistantTool(
    db,
    authContext,
    "p1-accent-literal",
    "search_supplier_categories",
    { terms: ["électrique"], mode: "any", examples_limit: 0 },
    { surface: "pricing.references", target_snapshot_id: snapshotId },
  );
  assertEquals(queries[0].params.includes("%vfd%"), true);
  assertEquals(queries[0].params.includes("%variateur%"), true);
  assertEquals(queries[1].params.includes("%électrique%"), true);
  assertEquals(queries[1].params.includes("%electrique%"), false);
});

Deno.test("P1 refuse une sortie agregee au-dela du plafond contractuel", async () => {
  const rows = Array.from(
    { length: 51 },
    (_, index) => ({ marque: `M${index}`, segment_rows: 1 }),
  );
  const { db } = fakeDb([rows]);
  const result = await executeAssistantTool(
    db,
    authContext,
    "p1-limit",
    "search_supplier_categories",
    { terms: ["drive"], mode: "any", examples_limit: 0 },
    { surface: "pricing.references", target_snapshot_id: snapshotId },
  );
  assertEquals(result.output, { ok: false, reason: "Sortie outil invalide." });
});
