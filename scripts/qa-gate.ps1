$ErrorActionPreference = "Stop"

Write-Output "=========================================="
Write-Output "  CIR Cockpit - QA Gate"
Write-Output "=========================================="
Write-Output ""

Write-Output "[1/8] Frontend typecheck..."
pnpm --dir frontend run typecheck

Write-Output "[2/8] Frontend lint..."
pnpm --dir frontend run lint -- --max-warnings=0

Write-Output "[3/8] Frontend tests + coverage thresholds..."
pnpm --dir frontend run test:coverage

Write-Output "[4/8] Frontend error compliance..."
pnpm --dir frontend run check:error-compliance

Write-Output "[5/8] Frontend build..."
pnpm --dir frontend run build

if ($env:RUN_E2E -eq "1") {
  Write-Output "[opt] Frontend e2e..."
  pnpm --dir frontend run test:e2e
}

Write-Output "[6/8] Backend lint..."
deno lint backend/functions/api

Write-Output "[7/8] Backend typecheck..."
deno check --config backend/deno.json backend/functions/api/index.ts

Write-Output "[8/8] Backend tests..."
deno test --env-file=backend/.env --allow-env --no-check --config backend/deno.json backend/functions/api

Write-Output ""
Write-Output "=========================================="
Write-Output "  QA Gate PASS"
Write-Output "=========================================="
