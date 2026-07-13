import { assert, assertEquals } from "std/assert";
import postgres from "postgres";

import { getContext, postApi, readString, readValue } from "./helpers.ts";

const enabled = Deno.env.get("RUN_AI_LIVE_EVALS") === "1";
const databaseUrl = Deno.env.get("DATABASE_URL")?.trim() ?? "";
const caseStart = Number.parseInt(Deno.env.get("AI_LIVE_CASE_START") ?? "0", 10);

const cases = [{
  id: "fest-festo-cat-fab",
  question: "Combien il y a des familles produit chez FEST (FESTO) ? dans cat_fab",
  history: [],
}, {
  id: "marques-variateurs-drives-clarification",
  question: "cat_fab",
  history: [{ role: "user", content: "Tu peux me dire les marques qui ont des familles de produits avec des variateurs ou drives, tu vois ?" }, { role: "assistant", content: "Souhaitez-vous parler des familles CIR ou des CAT_FAB ?" }],
}, {
  id: "relance-rock",
  question: "tes sur ? et rock ?",
  history: [{ role: "user", content: "Tu peux me dire les marques qui ont des familles de produits avec des variateurs ou drives, tu vois ?" }, { role: "assistant", content: "BONF, FEST, LERO, OPTI, PARK, REXR et SIEM." }],
}, {
  id: "nombre-marques",
  question: "Il y a combien de marque différentes ?",
  history: [],
}, {
  id: "resume-changements",
  question:
    "Tu peux me dire les changements par rapport au dernier fichier tarif ?",
  history: [],
}] as const;

const decodeSubject = (token: string): string => {
  const payload = token.split(".")[1] ?? "";
  const normalized = payload.replaceAll("-", "+").replaceAll("_", "/");
  const decoded = JSON.parse(
    atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")),
  );
  return typeof decoded.sub === "string" ? decoded.sub : "";
};

Deno.test({
  name:
    "assistant OpenRouter live evaluation campaign reports model provider cost and latency",
  ignore: !enabled || databaseUrl.length === 0,
  fn: async () => {
    const context = await getContext();
    const userId = decodeSubject(context.userToken);
    assert(userId.length > 0, "Identité du compte d intégration introuvable.");
    const sql = postgres(databaseUrl, { max: 2, prepare: false });
    const existing = await sql`
      select allowed from public.ai_feature_grants
      where feature = 'assistant.referentiels' and scope = 'user' and user_id = ${userId}::uuid
    `;
    try {
      await sql`
        insert into public.ai_feature_grants(feature, scope, user_id, allowed)
        values ('assistant.referentiels', 'user', ${userId}::uuid, true)
        on conflict (feature, user_id) where scope = 'user'
        do update set allowed = true, updated_at = now()
      `;

      const report: Array<Record<string, unknown>> = [];
      for (const evaluation of cases.slice(Number.isFinite(caseStart) ? Math.max(0, caseStart) : 0)) {
        for (let repetition = 1; repetition <= 1; repetition += 1) {
          const started = performance.now();
          const result = await postApi("ai.assistant.ask", context.userToken, {
            question: evaluation.question,
            history: evaluation.history,
            page_context: { surface: "pricing.references" },
            client_request_id: crypto.randomUUID(),
          });
          const latencyMs = Math.round(performance.now() - started);
          assertEquals(
            result.status,
            200,
            `${evaluation.id}: statut API inattendu (${JSON.stringify(result.payload)}).`,
          );
          const citations = readValue(result.payload, "citations");
          assert(
            Array.isArray(citations),
            `${evaluation.id}: citations absentes.`,
          );
          const actualTools = citations.map((citation) =>
            readString(citation, "tool")
          );
          const usage = readValue(result.payload, "usage");
          const cost = readValue(result.payload, "cost");
          report.push({
            case_id: evaluation.id,
            repetition,
            latency_ms: latencyMs,
            model_id: readString(result.payload, "model_id"),
            provider: readString(usage, "provider"),
            answer: readString(result.payload, "answer"),
            cost_amount: readValue(cost, "amount"),
            tools: actualTools,
            tool_trace: readValue(result.payload, "tool_trace"),
            usage,
          });
        }
      }
      console.log(`AI_LIVE_EVALUATION_REPORT=${JSON.stringify(report)}`);
    } finally {
      if (existing.length === 0) {
        await sql`delete from public.ai_feature_grants where feature = 'assistant.referentiels' and scope = 'user' and user_id = ${userId}::uuid`;
      } else {
        await sql`update public.ai_feature_grants set allowed = ${
          existing[0].allowed
        } where feature = 'assistant.referentiels' and scope = 'user' and user_id = ${userId}::uuid`;
      }
      await sql.end({ timeout: 5 });
    }
  },
});
