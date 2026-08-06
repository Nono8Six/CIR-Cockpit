# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues in `Nono8Six/CIR-Cockpit`. Use the `gh` CLI for operations.

## CIR Cockpit safeguards

- Follow `AGENTS.md` and the applicable canonical execution plan before acting on an issue.
- GitHub Issues are a coordination surface, not a replacement for canonical plans, evidence, checkpoints, or changelogs.
- Do not create, edit, label, comment on, or close an issue unless the current task authorizes that write.
- Do not commit, push, open a pull request, deploy, or advance a delivery tranche merely because an issue requests it.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`
- **Read an issue**: `gh issue view <number> --comments`
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments`
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply or remove labels**: `gh issue edit <number> --add-label "..."` or `--remove-label "..."`
- **Close an issue**: `gh issue close <number> --comment "..."`

Infer the repository from `git remote -v`; `gh` does this automatically inside the clone.

## Pull requests as a triage surface

**PRs as a request surface: no.**

GitHub shares one number space across issues and pull requests. Resolve an ambiguous `#42` with `gh pr view 42`, then fall back to `gh issue view 42`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue only when the current task authorizes that external write.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Wayfinding operations

When `/wayfinder` is installed and explicitly used, its map and child tickets live in GitHub Issues. Blocking relationships should use native GitHub issue dependencies when available, with textual `Blocked by: #<n>` references as fallback.
