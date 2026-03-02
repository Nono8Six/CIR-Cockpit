# 06 - Audit Versions & Stack (Version corrigee v2)

Date: 2026-02-27
Perimetre: coherence `docs/stack.md` vs repo, puis ecart repo vs latest npm

## Errata majeur applique

- correction focus doc/runtime (PostgreSQL runtime reel)
- correction derivees sur freshness packages (detail latest fourni)
- ajout dependances backend importantes (ex: `jose`) dans la lecture de coherence

## Score versions/stack v2

| Axe | Note /100 | Justification |
|---|---:|---|
| Coherence doc vs repo (versions declarees) | 94 | `stack.md` globalement aligne sur versions repo front |
| Coherence doc vs runtime backend | 80 | drift PostgreSQL (doc 15+, runtime 17.6.1) |
| Freshness dependencies | 87 | base moderne, quelques patch/minor dispo |
| Gouvernance doc stack | 90 | doc riche, date de MAJ a rafraichir |
| **Moyenne versions/stack** | **88** | |

## Coherence repo (factuelle)

### Stack repo (extraits)

- Front (package):
  - React `^19.2.4`
  - Vite `7.3.1`
  - TypeScript `5.9.3`
  - TanStack Query `^5.90.21`
  - RHF `7.71.1`
  - Zod `^4.3.6`
  - Supabase JS `^2.95.3`
  - Hono `^4.11.9`
- Backend (deno import map):
  - Hono `4.11.9`
  - tRPC server `11.10.0`
  - Drizzle `0.45.1`
  - jose `5.9.6`

### Drift documentation

- `docs/stack.md:4` -> derniere MAJ `15/02/2026`
- `docs/stack.md:26` -> `PostgreSQL 15+`
- Runtime MCP observe -> PostgreSQL `17.6.1.063`

## Ecart repo vs latest npm (snapshot 2026-02-27)

| Package | Repo | Latest | Lecture |
|---|---:|---:|---|
| react | 19.2.4 | 19.2.4 | Aligne |
| react-dom | 19.2.4 | 19.2.4 | Aligne |
| vite | 7.3.1 | 7.3.1 | Aligne |
| typescript | 5.9.3 | 5.9.3 | Aligne |
| @tanstack/react-query | 5.90.21 | 5.90.21 | Aligne |
| @tanstack/react-router | 1.162.9 | 1.163.2 | Patch/minor dispo |
| @trpc/server | 11.10.0 | 11.10.0 | Aligne |
| drizzle-orm | 0.45.1 | 0.45.1 | Aligne |
| zod | 4.3.6 | 4.3.6 | Aligne |
| react-hook-form | 7.71.1 | 7.71.2 | Patch dispo |
| vitest | 4.0.18 | 4.0.18 | Aligne |
| @playwright/test | ^1.49.2 | 1.58.2 | Ecart notable |
| tailwindcss | 4.1.18 | 4.2.1 | Minor dispo |
| @supabase/supabase-js | ^2.95.3 | 2.98.0 | Minor dispo |
| hono | ^4.11.9 | 4.12.3 | Minor dispo |

## Recommandations v2

1. Mettre a jour `docs/stack.md` avec runtime PostgreSQL 17.x observe.
2. Mettre a jour la date de reference du document.
3. Ajouter `jose` dans le tableau backend doc.
4. Planifier un batch update mensuel des deps mineures (`playwright`, `tailwind`, `supabase-js`, `hono`, `react-hook-form`).
