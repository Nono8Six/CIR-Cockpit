import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = existsSync(path.join(repoRoot, "backend/.env.test"))
  ? path.join(repoRoot, "backend/.env.test")
  : path.join(repoRoot, "backend/.env");

const args = [
  "--dir",
  "backend",
  "exec",
  "vitest",
  "run",
  "--config",
  "vitest.integration.config.ts",
  "--reporter=dot",
  "--silent=passed-only",
];

const result = spawnSync("pnpm", args, {
  cwd: repoRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "test",
    ...(existsSync(envFile) ? { VITEST_ENV_FILE: envFile } : {}),
  },
  shell: true,
});

process.exit(result.status ?? 1);
