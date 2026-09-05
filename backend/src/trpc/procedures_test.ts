import { test, vi } from "vitest";
import { assertEquals, assertRejects } from "#test/assert";

import type { AuthContext } from "../types.ts";

const authMocks = vi.hoisted(() => ({
  authenticateAccessToken: vi.fn(),
  authenticateSuperAdminAccessToken: vi.fn(),
}));

vi.mock("../middleware/auth/auth.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../middleware/auth/auth.ts")>()),
  authenticateAccessToken: authMocks.authenticateAccessToken,
  authenticateSuperAdminAccessToken:
    authMocks.authenticateSuperAdminAccessToken,
}));

import {
  authedProcedure,
  passwordChangeProcedure,
  router,
  superAdminProcedure,
} from "./procedures.ts";

test("must_change_password blocks ordinary and super-admin procedures but allows the dedicated procedure", async () => {
  const authContext: AuthContext = {
    userId: "11111111-1111-4111-8111-111111111111",
    role: "super_admin",
    agencyIds: [],
    activeAgencyId: null,
    isSuperAdmin: true,
    mustChangePassword: true,
  };
  authMocks.authenticateAccessToken.mockResolvedValue({
    callerId: authContext.userId,
    authContext,
  });
  authMocks.authenticateSuperAdminAccessToken.mockResolvedValue({
    callerId: authContext.userId,
    authContext,
  });

  const protectedRouter = router({
    ordinary: authedProcedure.query(() => "ordinary"),
    admin: superAdminProcedure.query(() => "admin"),
    changePassword: passwordChangeProcedure.mutation(() => "changed"),
  });
  const caller = protectedRouter.createCaller({
    req: new Request("http://localhost/trpc", {
      headers: { Authorization: "Bearer token" },
    }),
    resHeaders: new Headers(),
    requestId: "req-password-guard",
  });

  for (const call of [() => caller.ordinary(), () => caller.admin()]) {
    const error = await assertRejects(call);
    assertEquals(Reflect.get(error, "code"), "FORBIDDEN");
    assertEquals(Reflect.get(Reflect.get(error, "cause"), "status"), 403);
  }
  assertEquals(await caller.changePassword(), "changed");
});
