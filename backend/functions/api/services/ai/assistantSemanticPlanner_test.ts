import { assertEquals, assertRejects, assertStringIncludes } from "std/assert";

import type { AiAssistantAskInput } from "../../../../../shared/schemas/aiAssistant.schema.ts";
import type { DbClient } from "../../types.ts";
import {
  expandProductLookupTerms,
  getQualifiedProductBrandDetails,
  listProductSemanticTaxonomy,
  MAX_PRODUCT_TAXONOMY_PATHS,
  searchProductSemanticCandidates,
} from "../pricing/references/referenceProductSemantics.ts";
import type {
  OpenRouterToolDefinition,
  OpenRouterToolResponse,
  PromptVersionRow,
} from "./aiGovernance.ts";
import {
  productQualificationSchema,
  productSearchPlanSchema,
  productSemanticToolDefinitions,
  requestsCompleteProductCoverage,
  runProductSemanticPlanner,
} from "./assistantSemanticPlanner.ts";

const snapshotId = "4e216bc4-7d82-4eb7-aa20-2cc8316667cc";
const input = {
  client_request_id: "11111111-1111-4111-8111-111111111111",
  question:
    "Combien de CAT_FAB ont des verins pneumatiques et quelles marques en proposent ?",
  history: [],
  page_context: {
    surface: "pricing.references",
    target_snapshot_id: snapshotId,
  },
  conversation_context: null,
} satisfies AiAssistantAskInput;
const prompt = { body: "Prompt assistant de test." } as PromptVersionRow;

const response = (
  name: string,
  args: Record<string, unknown>,
): OpenRouterToolResponse => ({
  text: "",
  inputTokens: 10,
  outputTokens: 5,
  cachedInputTokens: 0,
  reasoningTokens: 0,
  providerCostAmount: null,
  generationId: crypto.randomUUID(),
  modelId: "mistral-large-2512",
  provider: "mistral",
  finishReason: "tool_calls",
  nativeFinishReason: "tool_calls",
  content: null,
  toolCalls: [{
    id: crypto.randomUUID(),
    type: "function",
    function: { name, arguments: JSON.stringify(args) },
  }],
});

const plan = {
  concept: "verins pneumatiques",
  positive_terms: ["verin", "vérin", "pneumatic cylinder", "air cylinder"],
  required_context: ["pneumatique", "pneumatic", "air"],
  excluded_context: ["hydraulique", "electrique", "gaz"],
  selected_paths: ["Pneumatique > Actionneurs > Vérins"],
};

const candidateRow = {
  normalized_cat_fab: "verins pneumatiques",
  label: "Vérins pneumatiques",
  cir_path: "Pneumatique > Actionneurs > Vérins",
  segment_rows: 12,
  example_brands: ["FEST", "PARK"],
};

const taxonomyRow = {
  cir_path: "Pneumatique > Actionneurs > Vérins",
  distinct_cat_fab: 12,
  distinct_brands: 2,
};

const makeDb = (
  candidateRows: unknown[],
  aggregateRows: unknown[] = [],
  taxonomyRows: unknown[] = [taxonomyRow],
  suggestionRows: unknown[] = [],
) => {
  let calls = 0;
  const db = {
    execute: () => {
      calls += 1;
      if (calls === 1) return Promise.resolve(taxonomyRows);
      if (calls === 2) return Promise.resolve(candidateRows);
      if (candidateRows.length === 0 && calls === 3) {
        return Promise.resolve(suggestionRows);
      }
      return Promise.resolve(aggregateRows);
    },
  } as unknown as DbClient;
  return { db, calls: () => calls };
};

const renderChunks = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(renderChunks).join("");
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("value" in record) return renderChunks(record.value);
    if ("queryChunks" in record) return renderChunks(record.queryChunks);
  }
  return "";
};

Deno.test("semantique refuse ponctuation, champs inconnus et depassements", () => {
  assertEquals(
    productSearchPlanSchema.safeParse({
      ...plan,
      positive_terms: ["?"],
    }).success,
    false,
  );
  assertEquals(
    productSearchPlanSchema.safeParse({
      ...plan,
      sql: "select * from secrets",
    }).success,
    false,
  );
  assertEquals(
    productSearchPlanSchema.safeParse({
      ...plan,
      positive_terms: Array.from(
        { length: 13 },
        (_, index) => `terme ${index}`,
      ),
    }).success,
    false,
  );
  assertEquals(
    productSearchPlanSchema.safeParse({
      ...plan,
      classification_hints: ["actionneurs"],
    }).success,
    false,
  );
  assertEquals(
    productSearchPlanSchema.safeParse({
      ...plan,
      selected_paths: Array.from(
        { length: 13 },
        (_, index) => `FAMILLE > BRANCHE ${index}`,
      ),
    }).success,
    false,
  );
  assertEquals(
    productQualificationSchema.safeParse({
      accepted_groups: [],
      excluded_groups: [{
        group_id: "pg_00000000-0000-4000-8000-000000000000",
        reason: "generic_term",
        justification: "Libelle inconnu.",
      }],
    }).success,
    false,
  );
});

Deno.test("la recherche conserve les expressions produit sans elargir leurs adjectifs", () => {
  const terms = expandProductLookupTerms({
    ...plan,
    positive_terms: [
      "vérins pneumatiques complets",
      "pneumatic cylinders",
    ],
  });
  assertEquals(
    terms.includes("verin pneumatique complet"),
    true,
  );
  assertEquals(
    terms.includes("complet pneumatique verin"),
    true,
  );
  assertEquals(terms.includes("pneumatiques"), false);
  assertEquals(terms.includes("cylinders"), false);
});

Deno.test("CP-C3 produit les memes termes semantiques au singulier et au pluriel", () => {
  const singular = expandProductLookupTerms({
    ...plan,
    positive_terms: ["servomoteur électrique"],
  });
  const plural = expandProductLookupTerms({
    ...plan,
    positive_terms: ["servomoteurs électriques"],
  });
  assertEquals(singular, plural);
  assertEquals(singular, [
    "servomoteur electrique",
    "electrique servomoteur",
  ]);
});

Deno.test("une branche parente ne transforme pas DIVERS en scope produit", async () => {
  const renderedQueries: string[] = [];
  const db = {
    execute: (query: unknown) => {
      renderedQueries.push(renderChunks(query));
      return Promise.resolve([]);
    },
  } as unknown as DbClient;

  await searchProductSemanticCandidates(db, snapshotId, {
    ...plan,
    concept: "variateur de vitesse",
    positive_terms: ["variateur"],
    selected_paths: [],
  });

  const leafExpression =
    "regexp_replace(coalesce(v.cir_path, ''), '^.*>[[:space:]]*', '')";
  const renderedSql = renderedQueries[0];
  assertEquals(renderedSql.split(leafExpression).length - 1, 3);
  assertStringIncludes(
    renderedSql,
    "lower(coalesce(concat_ws(' ', v.cat_fab, v.cat_fab_l), ''))",
  );
  assertStringIncludes(renderedSql, "'\\m([[:alpha:]]{4,})[sx]\\M'");
});

Deno.test("les chemins selectionnes deviennent des scopes exacts prioritaires", async () => {
  const renderedQueries: string[] = [];
  const db = {
    execute: (query: unknown) => {
      renderedQueries.push(renderChunks(query));
      return Promise.resolve([]);
    },
  } as unknown as DbClient;

  await searchProductSemanticCandidates(db, snapshotId, {
    ...plan,
    concept: "debitmetres",
    positive_terms: ["debitmetre", "flowmeter"],
    selected_paths: ["FLUIDES PROCESS > CONTROLE ET MESURE > DEBIT"],
  });

  const renderedSql = renderedQueries[0];

  assertStringIncludes(
    renderedSql,
    "FLUIDES PROCESS > CONTROLE ET MESURE > DEBIT",
  );
  assertStringIncludes(renderedSql, "selected_scopes");
  assertStringIncludes(
    renderedSql,
    "select *, 0 as selection_priority from selected_scopes",
  );
  assertStringIncludes(
    renderedSql,
    "select *, 1 as selection_priority from classification_scopes",
  );
});

Deno.test("une relance de marque relit le perimetre qualifie sans lexique produit", async () => {
  const detailDb = {
    execute: () =>
      Promise.resolve([{
        marque: "MARQ",
        cat_fab: "A1",
        label: "Gamme industrielle A1",
        cir_path: "MEGA > FAMILLE > PRODUIT",
        total_count: 2,
      }, {
        marque: "MARQ",
        cat_fab: "A2",
        label: "Gamme industrielle A2",
        cir_path: "MEGA > FAMILLE > PRODUIT",
        total_count: 2,
      }]),
  } as unknown as DbClient;
  const details = await getQualifiedProductBrandDetails(
    detailDb,
    snapshotId,
    [{
      kind: "classification_scope",
      cir_path: "MEGA > FAMILLE > PRODUIT",
    }],
    "MARQ",
  );
  assertEquals(details.matched_brand, "MARQ");
  assertEquals(details.distinct_cat_fab, 2);
  assertEquals(details.rows.map((row) => row.cat_fab), ["A1", "A2"]);
});

Deno.test("toutes les series impose une couverture produit sans ambiguite de variante", () => {
  assertEquals(
    requestsCompleteProductCoverage(
      "Toutes marques et toutes séries de vérins pneumatiques",
    ),
    true,
  );
  assertEquals(
    requestsCompleteProductCoverage("Toutes les marques de vérins"),
    false,
  );
});

Deno.test("le parcours semantique n expose jamais execute_readonly_sql", () => {
  assertEquals(
    productSemanticToolDefinitions.map((tool) => tool.function.name),
    [
      "search_product_candidates",
      "submit_product_qualification",
      "request_product_clarification",
    ],
  );
  assertEquals(
    productSemanticToolDefinitions.some((tool) =>
      tool.function.name === "execute_readonly_sql"
    ),
    false,
  );
  assertEquals(
    productSemanticToolDefinitions.every((tool) => tool.function.strict),
    true,
  );
});

Deno.test("le parcours semantique isole le protocole publie des anciens outils", async () => {
  const state = makeDb([candidateRow]);
  let round = 0;
  await runProductSemanticPlanner(
    state.db,
    input,
    {
      ...prompt,
      body:
        "Ancien prompt : utilise search_schema et execute_readonly_sql.\n\nPROTOCOLE DE RECHERCHE PRODUIT SEMANTIQUE :\nUtilise search_product_candidates.",
    },
    snapshotId,
    (messages) => {
      round += 1;
      if (round === 1) {
        const systemContent = messages[0].content ?? "";
        assertEquals(systemContent.includes("search_schema"), false);
        assertEquals(
          systemContent.includes("execute_readonly_sql"),
          false,
        );
        assertStringIncludes(systemContent, "selected_paths");
        assertStringIncludes(systemContent, "libelle terminal");
        return Promise.resolve(response("search_product_candidates", plan));
      }
      return Promise.resolve(response("request_product_clarification", {
        question: "Quel type de vérin pneumatique recherchez-vous ?",
        options: ["Standard", "Guidé"],
      }));
    },
  );
});

Deno.test("la passe 1 embarque l arbre CIR compact du snapshot", async () => {
  const state = makeDb([candidateRow]);
  let round = 0;
  await runProductSemanticPlanner(
    state.db,
    input,
    prompt,
    snapshotId,
    (messages) => {
      round += 1;
      if (round === 1) {
        const userContent = messages[1]?.content ?? "";
        assertStringIncludes(userContent, input.question);
        assertStringIncludes(
          userContent,
          "TAXONOMIE CIR DU SNAPSHOT (chemin | nb CAT_FAB | nb marques)",
        );
        assertStringIncludes(
          userContent,
          "Pneumatique > Actionneurs > Vérins | 12 | 2",
        );
        return Promise.resolve(response("search_product_candidates", plan));
      }
      return Promise.resolve(response("request_product_clarification", {
        question: "Quel type de vérin pneumatique recherchez-vous ?",
        options: ["Standard", "Guidé"],
      }));
    },
  );
});

Deno.test("un chemin hors taxonomie invalide la passe de planification", async () => {
  const state = makeDb([candidateRow]);
  await assertRejects(
    () =>
      runProductSemanticPlanner(
        state.db,
        input,
        prompt,
        snapshotId,
        () =>
          Promise.resolve(response("search_product_candidates", {
            ...plan,
            selected_paths: ["Chemin > Invente > Par Le Modele"],
          })),
      ),
    Error,
    "hors de la taxonomie",
  );
  assertEquals(state.calls(), 1);
});

Deno.test("un chemin residuel selectionne est retire sans devenir un scope", async () => {
  const state = makeDb([candidateRow], [], [taxonomyRow, {
    cir_path: "AUTOMATISME > VARIATEURS > DIVERS",
    distinct_cat_fab: 30,
    distinct_brands: 4,
  }]);
  let round = 0;
  const result = await runProductSemanticPlanner(
    state.db,
    input,
    prompt,
    snapshotId,
    () => {
      round += 1;
      return Promise.resolve(
        round === 1
          ? response("search_product_candidates", {
            ...plan,
            selected_paths: [
              "Pneumatique > Actionneurs > Vérins",
              "AUTOMATISME > VARIATEURS > DIVERS",
            ],
          })
          : response("request_product_clarification", {
            question: "Quel type de vérin pneumatique recherchez-vous ?",
            options: ["Standard", "Guidé"],
          }),
      );
    },
  );
  const searchTrace = result.toolTrace.find((trace) =>
    trace.name === "search_product_candidates"
  );
  assertEquals(
    searchTrace?.arguments.selected_paths,
    ["Pneumatique > Actionneurs > Vérins"],
  );
});

Deno.test("un chemin selectionne tolere les ecarts d espaces sans quitter la liste", async () => {
  const state = makeDb([candidateRow]);
  let round = 0;
  const result = await runProductSemanticPlanner(
    state.db,
    input,
    prompt,
    snapshotId,
    () => {
      round += 1;
      return Promise.resolve(
        round === 1
          ? response("search_product_candidates", {
            ...plan,
            selected_paths: ["  Pneumatique  >  Actionneurs   > Vérins "],
          })
          : response("request_product_clarification", {
            question: "Quel type de vérin pneumatique recherchez-vous ?",
            options: ["Standard", "Guidé"],
          }),
      );
    },
  );
  assertEquals(
    result.conversationContext?.kind,
    "product_semantic_clarification",
  );
  assertEquals(state.calls(), 2);
});

Deno.test("la taxonomie refuse un snapshot au-dela des bornes de chemins et d octets", async () => {
  const overflowRows = Array.from(
    { length: MAX_PRODUCT_TAXONOMY_PATHS + 1 },
    (_, index) => ({
      cir_path: `FAMILLE > BRANCHE ${index}`,
      distinct_cat_fab: 1,
      distinct_brands: 1,
    }),
  );
  const overflowDb = {
    execute: () => Promise.resolve(overflowRows),
  } as unknown as DbClient;
  await assertRejects(
    () => listProductSemanticTaxonomy(overflowDb, snapshotId),
    Error,
    "chemins",
  );

  const heavyRows = Array.from({ length: 400 }, (_, index) => ({
    cir_path: `FAMILLE > ${"X".repeat(80)} > BRANCHE ${index}`,
    distinct_cat_fab: 1,
    distinct_brands: 1,
  }));
  const heavyDb = {
    execute: () => Promise.resolve(heavyRows),
  } as unknown as DbClient;
  await assertRejects(
    () => listProductSemanticTaxonomy(heavyDb, snapshotId),
    Error,
    "octets",
  );
});

Deno.test("ambiguite demande une precision sans lancer de recomptage", async () => {
  const state = makeDb([candidateRow]);
  let round = 0;
  const result = await runProductSemanticPlanner(
    state.db,
    input,
    prompt,
    snapshotId,
    (_messages, tools: OpenRouterToolDefinition[]) => {
      round += 1;
      if (round === 1) {
        return Promise.resolve(response("search_product_candidates", plan));
      }
      assertEquals(
        tools.map((tool) => tool.function.name),
        ["submit_product_qualification", "request_product_clarification"],
      );
      return Promise.resolve(response("request_product_clarification", {
        question:
          "Parlez-vous uniquement des vérins alimentés en air comprimé ?",
        options: ["Oui, pneumatiques", "Non, tous les vérins"],
      }));
    },
  );
  assertEquals(result.evidence.status, "failed");
  assertEquals(
    result.conversationContext?.kind,
    "product_semantic_clarification",
  );
  assertEquals(state.calls(), 2);
});

Deno.test("toutes les series force la qualification des variantes candidates", async () => {
  const state = makeDb([candidateRow], [{
    marque: "FEST",
    distinct_cat_fab: 1,
    distinct_brand_cat_fab: 1,
    distinct_cat_fab_labels: 1,
    distinct_brand_count: 1,
  }]);
  let round = 0;
  const result = await runProductSemanticPlanner(
    state.db,
    {
      ...input,
      question:
        "Combien de CAT_FAB correspondent aux vérins pneumatiques, toutes marques et toutes séries ?",
    },
    prompt,
    snapshotId,
    (messages, tools) => {
      round += 1;
      if (round === 1) {
        return Promise.resolve(response("search_product_candidates", plan));
      }
      assertEquals(
        tools.map((tool) => tool.function.name),
        ["submit_product_qualification"],
      );
      const payload = JSON.parse(messages.at(-1)?.content ?? "{}") as {
        groups: Array<{ group_id: string }>;
      };
      return Promise.resolve(response("submit_product_qualification", {
        accepted_groups: [payload.groups[0].group_id],
        excluded_groups: [],
      }));
    },
  );
  assertEquals(result.evidence.status, "qualified");
  assertEquals(state.calls(), 3);
});

Deno.test("une clarification ne revele jamais les identifiants opaques", async () => {
  const state = makeDb([candidateRow]);
  let round = 0;
  const result = await runProductSemanticPlanner(
    state.db,
    input,
    prompt,
    snapshotId,
    (_messages, _tools) => {
      round += 1;
      return Promise.resolve(
        round === 1
          ? response("search_product_candidates", plan)
          : response("request_product_clarification", {
            question:
              "Faut-il retenir le groupe pg_00000000-0000-4000-8000-000000000000 ?",
            options: [
              "Vérin compact (pg_00000000-0000-4000-8000-000000000000)",
              "Autre groupe",
            ],
          }),
      );
    },
  );
  assertEquals(result.answer.includes("pg_"), false);
  assertEquals(
    result.conversationContext?.kind === "product_semantic_clarification" &&
      JSON.stringify(result.conversationContext.options).includes("pg_"),
    false,
  );
});

Deno.test("une decision utilisateur explicite interdit la boucle de clarification", async () => {
  const state = makeDb([candidateRow], [{
    marque: "FEST",
    distinct_cat_fab: 1,
    distinct_brand_cat_fab: 1,
    distinct_cat_fab_labels: 1,
    distinct_brand_count: 1,
  }]);
  let round = 0;
  const explicitInput: AiAssistantAskInput = {
    ...input,
    question:
      "Retenir uniquement les vérins compacts et exclure tout le reste.",
    conversation_context: {
      version: 1,
      kind: "product_semantic_clarification",
      surface: "pricing.references",
      domain: "pricing_references",
      intent: "product_semantic_search",
      concept: "vérins pneumatiques",
      question: "Quels groupes retenir ?",
      options: ["Compacts", "Autres"],
      snapshot_id: snapshotId,
      import_id: null,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    },
  };
  const result = await runProductSemanticPlanner(
    state.db,
    explicitInput,
    prompt,
    snapshotId,
    (messages, tools) => {
      round += 1;
      if (round === 1) {
        return Promise.resolve(response("search_product_candidates", plan));
      }
      assertEquals(
        tools.map((tool) => tool.function.name),
        ["submit_product_qualification"],
      );
      const payload = JSON.parse(messages.at(-1)?.content ?? "{}") as {
        groups: Array<{ group_id: string }>;
      };
      return Promise.resolve(response("submit_product_qualification", {
        accepted_groups: [payload.groups[0].group_id],
        excluded_groups: [],
      }));
    },
  );
  assertEquals(result.evidence.status, "qualified");
});

Deno.test("un groupe injecte est refuse avant le recomptage", async () => {
  const state = makeDb([candidateRow]);
  let round = 0;
  await assertRejects(
    () =>
      runProductSemanticPlanner(
        state.db,
        input,
        prompt,
        snapshotId,
        () => {
          round += 1;
          return Promise.resolve(
            round === 1
              ? response("search_product_candidates", plan)
              : response("submit_product_qualification", {
                accepted_groups: ["pg_00000000-0000-4000-8000-000000000000"],
                excluded_groups: [],
              }),
          );
        },
      ),
  );
  assertEquals(state.calls(), 2);
});

Deno.test("le total affiche provient exclusivement du recomptage base", async () => {
  const state = makeDb([candidateRow], [{
    marque: "FEST",
    distinct_cat_fab: 7,
    distinct_brand_cat_fab: 9,
    distinct_cat_fab_labels: 8,
    distinct_brand_count: 2,
  }, {
    marque: "PARK",
    distinct_cat_fab: 2,
    distinct_brand_cat_fab: 9,
    distinct_cat_fab_labels: 8,
    distinct_brand_count: 2,
  }]);
  let round = 0;
  const result = await runProductSemanticPlanner(
    state.db,
    input,
    prompt,
    snapshotId,
    (messages) => {
      round += 1;
      if (round === 1) {
        return Promise.resolve(response("search_product_candidates", plan));
      }
      const toolPayload = JSON.parse(messages.at(-1)?.content ?? "{}") as {
        groups: Array<{ group_id: string }>;
      };
      return Promise.resolve(response("submit_product_qualification", {
        accepted_groups: [toolPayload.groups[0].group_id],
        excluded_groups: [],
      }));
    },
  );
  assertEquals(result.evidence.status, "qualified");
  assertStringIncludes(result.answer, "9 couples marque + CAT_FAB");
  assertStringIncludes(result.answer, "FEST (7), PARK (2)");
  assertEquals(result.conversationContext?.kind, "product_semantic_result");
  if (result.conversationContext?.kind === "product_semantic_result") {
    assertEquals(result.conversationContext.concept, "verins pneumatiques");
    assertEquals(result.conversationContext.accepted_selections.length, 1);
    assertEquals(
      result.conversationContext.source_client_request_id,
      input.client_request_id,
    );
  }
  assertEquals(state.calls(), 3);
});

Deno.test("une recherche tronquee interdit la qualification et impose la clarification", async () => {
  const rows = Array.from({ length: 81 }, (_, index) => ({
    ...candidateRow,
    normalized_cat_fab: `groupe ${index}`,
    label: `Groupe ${index}`,
  }));
  const state = makeDb(rows);
  let round = 0;
  const result = await runProductSemanticPlanner(
    state.db,
    input,
    prompt,
    snapshotId,
    (_messages, tools) => {
      round += 1;
      if (round === 1) {
        return Promise.resolve(response("search_product_candidates", plan));
      }
      assertEquals(
        tools.map((tool) => tool.function.name),
        ["request_product_clarification"],
      );
      return Promise.resolve(response("request_product_clarification", {
        question: "La recherche est trop large. Quel sous-type visez-vous ?",
        options: ["Standard", "Guidé"],
      }));
    },
  );
  assertEquals(result.evidence.facts.length, 0);
  assertEquals(state.calls(), 2);
});

Deno.test("une recherche sans candidat interdit un faux total a zero", async () => {
  const state = makeDb([]);
  let round = 0;
  const result = await runProductSemanticPlanner(
    state.db,
    input,
    prompt,
    snapshotId,
    (_messages, tools) => {
      round += 1;
      if (round === 1) {
        return Promise.resolve(response("search_product_candidates", plan));
      }
      assertEquals(
        tools.map((tool) => tool.function.name),
        ["request_product_clarification"],
      );
      return Promise.resolve(response("request_product_clarification", {
        question: "Aucun candidat n'a été trouvé. Quel usage visez-vous ?",
        options: ["Automatisation", "Maintenance"],
      }));
    },
  );
  assertEquals(result.evidence.facts.length, 0);
  assertEquals(
    result.conversationContext?.kind,
    "product_semantic_clarification",
  );
  assertEquals(state.calls(), 3);
});

Deno.test("CP-C3 une faute suggeree repond localement apres un seul round provider", async () => {
  const suggestion = {
    label: "Capteurs/débitmètres",
    matched_term: "debimetre",
    score: 0.46666667,
  };
  const state = makeDb([], [], [taxonomyRow], [suggestion]);
  let providerRounds = 0;
  const result = await runProductSemanticPlanner(
    state.db,
    { ...input, question: "Quelles marques proposent des debimetre ?" },
    prompt,
    snapshotId,
    () => {
      providerRounds += 1;
      return Promise.resolve(response("search_product_candidates", {
        ...plan,
        concept: "debimetre",
        positive_terms: ["debimetre"],
        selected_paths: [],
      }));
    },
  );
  assertEquals(providerRounds, 1);
  assertEquals(state.calls(), 3);
  assertEquals(
    result.answer,
    "Aucune correspondance exacte. Vouliez-vous dire…\n\n1. Capteurs/débitmètres",
  );
  assertEquals(result.evidence.facts, []);
  assertEquals(result.citations, []);
  assertEquals(result.toolTrace.map((trace) => trace.name), [
    "search_product_candidates",
  ]);
  assertEquals(
    result.conversationContext?.kind,
    "product_semantic_clarification",
  );
});

Deno.test("une famille CIR acceptee est etendue sans qualifier chaque CAT_FAB", async () => {
  const scopeRow = {
    selection_kind: "classification_scope",
    normalized_cat_fab: null,
    label: "PNEUMATIQUE > COMPOSANTS > VERINS NORMALISES",
    cir_path: "PNEUMATIQUE > COMPOSANTS > VERINS NORMALISES",
    segment_rows: 46,
    distinct_cat_fab: 46,
    example_brands: ["AIGN", "ASCO", "AVEN", "FEST", "PARK"],
    example_labels: ["Série DNC", "Vérins ISO"],
  };
  const state = makeDb([scopeRow], [{
    marque: "FEST",
    distinct_cat_fab: 37,
    distinct_brand_cat_fab: 75,
    distinct_cat_fab_labels: 75,
    distinct_brand_count: 5,
  }]);
  let round = 0;
  const result = await runProductSemanticPlanner(
    state.db,
    input,
    prompt,
    snapshotId,
    (messages) => {
      round += 1;
      if (round === 1) {
        return Promise.resolve(response("search_product_candidates", plan));
      }
      const payload = JSON.parse(messages.at(-1)?.content ?? "{}") as {
        groups: Array<{ group_id: string; selection_kind?: string }>;
      };
      assertEquals(payload.groups[0]?.selection_kind, "classification_scope");
      return Promise.resolve(response("submit_product_qualification", {
        accepted_groups: [payload.groups[0].group_id],
        excluded_groups: [],
      }));
    },
  );

  assertStringIncludes(result.answer, "75 couples marque + CAT_FAB");
  assertEquals(state.calls(), 3);
});
