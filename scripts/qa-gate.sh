#!/usr/bin/env bash
set -euo pipefail

echo "=========================================="
echo "  CIR Cockpit - QA Gate"
echo "=========================================="
echo

echo "[1/8] Frontend typecheck..."
pnpm --dir frontend run typecheck
echo "[2/8] Frontend lint..."
pnpm --dir frontend run lint -- --max-warnings=0
echo "[3/8] Frontend tests + coverage thresholds..."
pnpm --dir frontend run test:coverage
echo "[4/8] Frontend error compliance..."
pnpm --dir frontend run check:error-compliance
echo "[5/8] Frontend build..."
pnpm --dir frontend run build

if [[ "${RUN_E2E:-0}" == "1" ]]; then
  echo "[opt] Frontend e2e..."
  pnpm --dir frontend run test:e2e
fi

echo "[6/8] Backend lint..."
deno lint backend/functions/api
echo "[7/8] Backend typecheck..."
deno check --config backend/deno.json backend/functions/api/index.ts
echo "[8/8] Backend tests..."
deno test --env-file=backend/.env --allow-env --no-check --config backend/deno.json backend/functions/api

echo
echo "=========================================="
echo "  QA Gate PASS"
echo "=========================================="
