import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "#test/assert": new URL("./src/test/assert.ts", import.meta.url).pathname,
    },
  },
  test: {
    environment: "node",
    globals: false,
    testTimeout: 60000,
    hookTimeout: 60000,
    include: ["src/integration/**/*_test.ts"],
    exclude: ["**/node_modules/**"],
    env: {
      NODE_ENV: "test",
    },
    passWithNoTests: true,
  },
});
