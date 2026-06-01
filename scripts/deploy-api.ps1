Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRef = "rbjtrcorlezvocayluok"
$FunctionName = "api"
$ImportMap = "deno.json"

function Invoke-External {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Label,
    [Parameter(Mandatory = $true)]
    [scriptblock]$Command
  )

  Write-Host $Label
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "Commande externe en echec ($LASTEXITCODE): $Label"
  }
}

function Test-Command {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Commande introuvable: $Name"
  }
}

function Test-CiEnvironment {
  return $env:CI -eq "true" -or $env:GITHUB_ACTIONS -eq "true"
}

function Assert-LocalCliAuthMode {
  if (Test-CiEnvironment) {
    return
  }

  $processToken = $env:SUPABASE_ACCESS_TOKEN
  $userToken = [Environment]::GetEnvironmentVariable("SUPABASE_ACCESS_TOKEN", "User")
  $machineToken = [Environment]::GetEnvironmentVariable("SUPABASE_ACCESS_TOKEN", "Machine")

  if (
    -not [string]::IsNullOrWhiteSpace($userToken) -or
    -not [string]::IsNullOrWhiteSpace($machineToken)
  ) {
    throw @"
SUPABASE_ACCESS_TOKEN est defini en local et peut masquer le profil Supabase CLI.
Correction durable:
  [Environment]::SetEnvironmentVariable("SUPABASE_ACCESS_TOKEN", `$null, "User")
  [Environment]::SetEnvironmentVariable("SUPABASE_ACCESS_TOKEN", `$null, "Machine")
  Remove-Item Env:SUPABASE_ACCESS_TOKEN -ErrorAction SilentlyContinue
  supabase login
"@
  }

  if (-not [string]::IsNullOrWhiteSpace($processToken)) {
    Write-Host "SUPABASE_ACCESS_TOKEN herite du processus courant: ignore pour utiliser le profil CLI local."
    Remove-Item Env:SUPABASE_ACCESS_TOKEN -ErrorAction SilentlyContinue
  }
}

function Assert-SupabaseProjectAccess {
  $output = & supabase projects list --output json 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw @"
Supabase CLI n'est pas authentifie pour l'API Supabase.
Commande a executer une seule fois:
  supabase login

Sortie CLI:
$output
"@
  }

  if (($output -join "`n") -notmatch [regex]::Escape($ProjectRef)) {
    throw "Le projet Supabase attendu ($ProjectRef) n'est pas visible via supabase projects list."
  }
}

Test-Command "supabase"
Assert-LocalCliAuthMode
Assert-SupabaseProjectAccess

Invoke-External "Deploy Edge Function $FunctionName..." {
  supabase functions deploy $FunctionName `
    --project-ref $ProjectRef `
    --use-api `
    --import-map $ImportMap `
    --no-verify-jwt
}
