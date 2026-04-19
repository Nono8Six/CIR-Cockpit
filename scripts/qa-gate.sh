#!/usr/bin/env bash
# IMPORTANT: ce script a un miroir dans qa-gate.ps1 -- les garder synchronises.
set -euo pipefail

echo "=========================================="
echo "  CIR Cockpit - QA Gate"
echo "=========================================="
echo

echo "[0/9] Repo hygiene..."
pnpm run repo:check
echo "[1/9] Frontend typecheck..."
pnpm --dir frontend run typecheck
echo "[2/9] Frontend lint..."
pnpm --dir frontend run lint
echo "[3/9] Frontend tests + coverage thresholds..."
pnpm --dir frontend run test:coverage
echo "[4/9] Frontend error compliance..."
pnpm --dir frontend run check:error-compliance

echo "[5/9] Frontend build..."
pnpm --dir frontend run build

if [[ "${RUN_E2E:-0}" == "1" ]]; then
  echo "[opt] Frontend e2e..."
  pnpm --dir frontend run test:e2e
fi

echo "[6/9] Backend lint..."
deno lint backend/functions/api
echo "[7/9] Backend typecheck..."
deno check --config backend/deno.json backend/functions/api/index.ts
echo "[8/9] Backend tests..."
deno test --env-file=backend/.env --allow-env --no-check --config backend/deno.json backend/functions/api

echo
echo "=========================================="
echo "  QA Gate PASS"
echo "=========================================="
