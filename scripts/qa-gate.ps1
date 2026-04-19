# IMPORTANT: ce script a un miroir dans qa-gate.sh -- les garder synchronises.
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Label,

    [Parameter(Mandatory = $true)]
    [scriptblock]$Command
  )

  Write-Output $Label
  & $Command

  if ($LASTEXITCODE -ne 0) {
    throw "Commande externe en echec ($LASTEXITCODE): $Label"
  }
}

Write-Output "=========================================="
Write-Output "  CIR Cockpit - QA Gate"
Write-Output "=========================================="
Write-Output ""

Invoke-Step "[0/9] Repo hygiene..." { pnpm run repo:check }
Invoke-Step "[1/9] Frontend typecheck..." { pnpm --dir frontend run typecheck }
Invoke-Step "[2/9] Frontend lint..." { pnpm --dir frontend run lint }
Invoke-Step "[3/9] Frontend tests + coverage thresholds..." { pnpm --dir frontend run test:coverage }
Invoke-Step "[4/9] Frontend error compliance..." { pnpm --dir frontend run check:error-compliance }
Invoke-Step "[5/9] Frontend build..." { pnpm --dir frontend run build }


if ($env:RUN_E2E -eq "1") {
  Invoke-Step "[opt] Frontend e2e..." { pnpm --dir frontend run test:e2e }
}

Invoke-Step "[6/9] Backend lint..." { deno lint backend/functions/api }
Invoke-Step "[7/9] Backend typecheck..." { deno check --config backend/deno.json backend/functions/api/index.ts }
Invoke-Step "[8/9] Backend tests..." { deno test --env-file=backend/.env --allow-env --no-check --config backend/deno.json backend/functions/api }

Write-Output ""
Write-Output "=========================================="
Write-Output "  QA Gate PASS"
Write-Output "=========================================="
