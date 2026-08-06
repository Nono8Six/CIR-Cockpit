# Domain Docs

How engineering skills consume CIR Cockpit domain documentation without creating a second source of truth.

## Authority and precedence

1. Follow the routing and constraints in `AGENTS.md`.
2. Read the applicable sections of `docs/architecture-cible-cir-cockpit.md` and the canonical execution plan required by `AGENTS.md`.
3. Treat `CONTEXT.md` and ADRs as supplemental domain documentation. They must not duplicate, silently override, or replace canonical CIR documents.
4. Never decide silently a point marked `A VALIDER`.

## Before exploring

- Read `CONTEXT.md` at the repository root when it exists.
- Read relevant decisions under `docs/adr/` when that directory exists.
- If those files do not exist, proceed silently and follow the existing CIR documentation.
- Create domain documentation lazily only when a resolved vocabulary or architectural decision is not already represented canonically.

## File structure

This repository uses a single-context layout:

```text
/
├── CONTEXT.md
└── docs/adr/
    ├── 0001-example-decision.md
    └── 0002-example-decision.md
```

This setup does not create `CONTEXT.md` or example ADRs.

## Use canonical vocabulary

When output names a domain concept, use the term defined by the current CIR architecture, execution plan, or `CONTEXT.md`.

If a required concept is absent, report the gap rather than inventing terminology or silently inferring a business rule.

## Flag conflicts

If an output contradicts an existing ADR or canonical CIR decision, surface the conflict explicitly. A new ADR cannot silently overturn a locked decision or an active phase gate.
