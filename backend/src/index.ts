import { serve } from "@hono/node-server";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import path from "node:path";

import app from "./app.ts";
import { getConfig, loadConfig } from "./config.ts";
import { resetDbClientForTests } from "../drizzle/index.ts";

const envFile = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.env",
);

try {
  loadEnvFile(envFile);
} catch {
  // Local tests and CI may start without a backend/.env file.
}

loadConfig();
const config = getConfig();

const server = serve({
  fetch: app.fetch,
  hostname: config.host,
  port: config.port,
}, (info) => {
  console.log(`CIR Cockpit API listening on http://${info.address}:${info.port}`);
});

const shutdown = async (signal: string): Promise<void> => {
  console.log(`Received ${signal}, shutting down`);
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
  await resetDbClientForTests();
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
