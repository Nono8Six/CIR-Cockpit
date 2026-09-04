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
    testTimeout: 15000,
    hookTimeout: 15000,
    maxWorkers: 4,
    include: ["src/**/*_test.ts"],
    exclude: [
      "**/node_modules/**",
      "src/integration/**",
    ],
    env: {
      NODE_ENV: "test",
    },
  },
});
