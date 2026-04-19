import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const envFile = "backend/.env.test";
const args = [
  "test",
  "--allow-env",
  "--allow-net",
  "--no-check",
  "--config",
  "backend/deno.json",
  "backend/functions/api/integration",
];

if (existsSync(envFile)) {
  args.splice(1, 0, `--env-file=${envFile}`);
}

const result = spawnSync("deno", args, {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
