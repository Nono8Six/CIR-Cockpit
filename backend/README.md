# Backend (Node 24)

API métier CIR Cockpit : Hono, tRPC, Zod, Drizzle, Supabase Auth/PostgreSQL.

## Dossiers

- `src/` : serveur Node, routeur tRPC, middleware, services
- `drizzle/` : schema et client Drizzle
- `migrations/` : SQL versionne
- `tests/` : probes SQL d'invariants

## Commandes

```bash
pnpm run backend:dev
pnpm --dir backend run typecheck
pnpm --dir backend run test
```
