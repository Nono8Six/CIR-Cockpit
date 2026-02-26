import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '.env.e2e');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000
  },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'pnpm run dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000
      }
});
