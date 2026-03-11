# 05 - Audit DevOps & QA (Version corrigee v2)

Date: 2026-02-27
Perimetre: workspace pnpm, Husky, QA gate, Vitest coverage, Playwright, CI/CD

## Errata majeur applique

- correction cross-platform: script bash QA present (`scripts/qa-gate.sh`) en plus du script PowerShell
- maintien du constat critique CI: aucun workflow cloud detecte
- confirmation precise coverage scope Vitest et E2E skip patterns

## Score DevOps/QA v2

| Axe | Note /100 | Justification |
|---|---:|---|
| Workspace pnpm | 95 | config claire, scripts centralises |
| Hooks git (Husky) | 90 | pre-commit + pre-push actifs |
| QA gate locale | 88 | pipeline locale complete front+back |
| Coverage representativite | 68 | thresholds solides mais scope coverage limite |
| Playwright E2E | 74 | 6 specs, mais execution conditionnelle env |
| CI/CD cloud | 20 | aucun workflow detecte |
| Hygiene deps/securite | 70 | pas d’automatisation audit deps dans pipeline cloud |
| **Moyenne DevOps/QA** | **78** | |

## Findings prioritaires

### Critique QA-1 - CI/CD cloud absente

- Preuve: `.github/workflows` absent
- Impact:
  1. pas de quality gate centralisee sur PR
  2. enforcement local contournable (`--no-verify`)
- Action:
  1. ajouter workflow CI (typecheck/lint/test/build)
  2. branch protection + required checks

### Majeur QA-2 - Coverage Vitest scope restreint

- Evidence: `frontend/vitest.config.ts:21-27`
- Constat: coverage cible 6 sous-repertoires de services, exclut hooks/composants/utils.
- Impact: metrique globale de couverture optimiste.
- Action: etendre coverage include / clarifier KPI “coverage de perimetre critique” vs “coverage globale”.

### Majeur QA-3 - E2E skip conditionnels tres presents

- Evidence:
  - `frontend/e2e/auth.spec.ts:17`
  - occurrences `test.skip(...)` detectees dans les 6 specs
- Impact: execution E2E reelle potentiellement rare selon env locale.
- Action:
  1. rendre la condition d’execution explicite dans la sortie QA
  2. documenter setup `.env.e2e` strict

### Moyen QA-4 - Root QA cible PowerShell mais alternative bash existe

- Evidence:
  - root `package.json:20` -> `pwsh -NoLogo -File scripts/qa-gate.ps1`
  - `scripts/qa-gate.sh` existe
- Impact: experience heterogene selon OS, mais non bloquante car script bash fourni.
- Action: proposer `pnpm run qa:sh` ou script node wrapper cross-platform.

### Moyen QA-5 - lint-staged front-only

- Evidence: `package.json:26-29`
- Constat: pattern `frontend/src/**/*.{ts,tsx}` uniquement.
- Impact: shared/backend non lintes en pre-commit.
- Action: etendre lint-staged (shared + deno lint backend) ou garder decision explicite documentee.

## Inventaire corrige

| Metrique | Valeur |
|---|---:|
| Script QA PowerShell | Present |
| Script QA Bash | Present |
| Husky pre-commit | Present |
| Husky pre-push | Present |
| CI workflows cloud | Absents |
| Specs Playwright | 6 |
| Occurrences `test.skip(` en E2E | 10 |

## Preuves (commandes de reference v2)

```bash
test -d .github/workflows || echo "NO_CI_WORKFLOWS"
rg -n 'test\.skip\(' frontend/e2e
cat scripts/qa-gate.ps1
cat scripts/qa-gate.sh
```
