# 03 - Audit Shared (Version corrigee v2)

Date: 2026-02-27
Perimetre: `shared/` (schemas Zod, error model/catalog, supabase types)

## Errata majeur applique

- correction du nombre de codes erreur: 68 (et non 70)
- correction volumetrie `supabase.types.ts`: 942 lignes
- precision sur stale types: potentiel (derniere modif git 2026-02-15), pas preuve automatique de divergence fonctionnelle

## Score shared v2

| Axe | Note /100 | Justification |
|---|---:|---|
| Schemas Zod partages | 92 | organisation propre, usage front/back cohérent |
| Error model/catalog | 91 | architecture solide, 68 codes bien structures |
| Types Supabase | 84 | fichier source unique robuste, mais risque de stale entre migrations |
| Structure & maintenabilite | 90 | bonne separation, quelques fichiers longs |
| Tests shared | 88 | couverture presente mais perfectible |
| **Moyenne shared** | **90** | |

## Findings prioritaires

### Moyen S-1 - `supabase.types.ts` potentiellement stale

- Evidence:
  - `shared/supabase.types.ts` (942 lignes)
  - derniere modif git: `2026-02-15 20:15:57 +0100`
- Impact: drift possible schema/types apres migrations recentes.
- Action:
  1. regenerer les types apres chaque migration structurelle
  2. ajouter controle documentaire date-generation

### Moyen S-2 - Fichiers partages proches du seuil de confort

- Evidence:
  - `shared/errors/catalog.ts`: 240 lignes
  - `shared/schemas/interaction.schema.ts`: 190 lignes
- Impact: cout de maintenance en hausse si croissance continue.
- Action: extractions thematiques progressives si nouvelles regles metier arrivent.

### Mineur S-3 - Harmonisation doc des counts

- Point corrige en v2:
  - `ErrorCode` union lines detectees: 68
  - `ERROR_CATALOG` entries: 68
- Action: conserver un script de verification pour eviter les derivees de comptage.

## Points forts verifies

1. Source unique d’erreur partagee (`types.ts` + `catalog.ts`).
2. Schemas partages utilisables cote front et back.
3. Zero `@ts-ignore/@ts-expect-error` detecte sur shared.
4. Type generation Supabase centralisee.

## Inventaire shared corrige

| Metrique | Valeur |
|---|---:|
| ErrorCode (union) | 68 |
| Entrees catalog | 68 |
| `shared/supabase.types.ts` | 942 lignes |
| `shared/errors/catalog.ts` | 240 lignes |
| `shared/schemas/interaction.schema.ts` | 190 lignes |

## Preuves (commandes de reference v2)

```bash
git log -1 --format='%ci' -- shared/supabase.types.ts
# comptage union ErrorCode et catalog via regex sur shared/errors/*.ts
```
