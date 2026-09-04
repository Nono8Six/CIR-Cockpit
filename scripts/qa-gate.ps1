# Gate locale finale unique. CI utilise `pnpm run qa:ci`.
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

Invoke-Step "[6/9] Backend lint..." { pnpm run backend:lint }
Invoke-Step "[7/9] Backend typecheck..." { pnpm run backend:typecheck }
Invoke-Step "[8/9] Backend tests..." { pnpm run backend:test }
Invoke-Step "[9/9] Backend integration tests..." { pnpm run backend:test:integration }

Write-Output ""
Write-Output "=========================================="
Write-Output "  QA Gate PASS"
Write-Output "=========================================="
