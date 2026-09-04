param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]] $CodexArgs
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
& codex --profile cockpit -C $repoRoot @CodexArgs
exit $LASTEXITCODE
