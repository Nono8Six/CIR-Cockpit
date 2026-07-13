import { assertEquals, assertRejects } from "std/assert";

import type { AuthContext, DbClient } from "../../types.ts";
import {
  type AssistantAccessGrant,
  getAiUsageByMember,
  resolveAssistantAccess,
  resolveAssistantAccessFromGrants,
} from "./aiAccess.ts";

const auth = (overrides: Partial<AuthContext> = {}): AuthContext => ({
  userId: "00000000-0000-4000-8000-000000000001",
  role: "tcs",
  agencyIds: ["00000000-0000-4000-8000-000000000002"],
  activeAgencyId: "00000000-0000-4000-8000-000000000002",
  isSuperAdmin: false,
  ...overrides,
});

Deno.test("assistant access maps database failures without leaking SQL details", async () => {
  const db = {
    execute: () => Promise.reject(new Error("Identite d acces IA invalide.")),
  } as unknown as DbClient;
  const error = await assertRejects(
    () => resolveAssistantAccess(db, auth(), "assistant.referentiels"),
    Error,
    "Impossible de verifier l acces a l assistant IA.",
  );
  assertEquals(Reflect.get(error, "code"), "DB_READ_FAILED");
  assertEquals(Reflect.get(error, "status"), 500);
  assertEquals(error.message.includes("Identite d acces IA invalide"), false);
});

const grants: AssistantAccessGrant[] = [{
  scope: "global",
  agency_id: null,
  user_id: null,
  allowed: false,
}, {
  scope: "agency",
  agency_id: "00000000-0000-4000-8000-000000000002",
  user_id: null,
  allowed: true,
}, {
  scope: "user",
  agency_id: null,
  user_id: "00000000-0000-4000-8000-000000000001",
  allowed: false,
}];

Deno.test("assistant access resolves user before active agency before global", () => {
  assertEquals(resolveAssistantAccessFromGrants(auth(), grants), {
    allowed: false,
    reason: "Acces non autorise",
    origin: "user",
  });
  assertEquals(
    resolveAssistantAccessFromGrants(
      auth({ userId: "00000000-0000-4000-8000-000000000003" }),
      grants,
    ),
    {
      allowed: true,
      reason: null,
      origin: "agency",
    },
  );
});

Deno.test("assistant access ignores agencyIds when activeAgencyId is null", () => {
  const result = resolveAssistantAccessFromGrants(
    auth({
      userId: "00000000-0000-4000-8000-000000000003",
      activeAgencyId: null,
      agencyIds: ["00000000-0000-4000-8000-000000000002"],
    }),
    grants,
  );
  assertEquals(result, {
    allowed: false,
    reason: "Acces non autorise",
    origin: "global",
  });
});

Deno.test("assistant access gives superadmin an unconditional bypass", () => {
  assertEquals(
    resolveAssistantAccessFromGrants(
      auth({
        role: "super_admin",
        isSuperAdmin: true,
        activeAgencyId: null,
        agencyIds: [],
      }),
      grants,
    ),
    { allowed: true, reason: null, origin: "superadmin" },
  );
});

Deno.test("usage by member returns named strict per-feature consumption", async () => {
  const db = {
    execute: () =>
      Promise.resolve([{
        user_id: "00000000-0000-4000-8000-000000000001",
        display_name: "Marie Martin",
        email: "marie@example.test",
        feature: "assistant.referentiels",
        calls: 3,
        input_tokens: 120,
        output_tokens: 45,
        total_tokens: 170,
        cost_amount: 0.0032,
        currency: "USD",
      }]),
  } as unknown as DbClient;
  const response = await getAiUsageByMember(db, "admin", "request-test", {
    feature: "assistant.referentiels",
    days: 30,
  });
  assertEquals(response.members, [{
    user_id: "00000000-0000-4000-8000-000000000001",
    display_name: "Marie Martin",
    email: "marie@example.test",
    feature: "assistant.referentiels",
    calls: 3,
    input_tokens: 120,
    output_tokens: 45,
    total_tokens: 170,
    cost_amount: 0.0032,
    currency: "USD",
  }]);
});
