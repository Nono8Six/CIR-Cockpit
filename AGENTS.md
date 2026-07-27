# AGENTS.md

Guide operationnel pour les agents autonomes dans CIR Cockpit.

## Source et routage

- Ce fichier est l'entree courte pour Codex et les subagents.
- Ne pas lire `CLAUDE.md` par defaut. `CLAUDE.md` est l'adaptateur Claude Code et importe ces regles.
- Lire les documents lourds seulement quand ils sont utiles:
  - `docs/architecture-cible-cir-cockpit.md`: lecture obligatoire avant toute decision non triviale de produit, modele metier, architecture, donnees, IA, tiers, interaction/activite, pilotage, catalogue, import ou tarification. Identifier la brique concernee, respecter les decisions verrouillees et ne jamais trancher silencieusement une decision marquee `A VALIDER`.
  - `docs/CONFIGURATEURS/plan-execution.md`: point d'entree obligatoire avant tout travail Configurateurs. Mettre a jour les cases, la preuve et le changelog apres chaque checkpoint; ne jamais avancer une tranche sans decision de sortie explicite.
  - `docs/ASSISTANT_IA/plan-mistral-assistant-transversal.md`: lecture obligatoire avant toute modification de l’assistant, du provider, du broker, des outils IA, de la couche semantique ou des evaluations. Respecter l’ordre des phases et ne cocher un checkpoint qu’avec sa preuve runtime.
  - `docs/qa-runbook.md`: avant une livraison finale, une PR/merge/deploiement, une modification de QA, ou une demande explicite de verification complete.
  - `docs/testing.md`: quand la demande touche tests, couverture, E2E ou Playwright.
  - `docs/stack.md`: quand la demande touche versions, dependances, runtime, CI ou outillage.
  - `docs/LOGIQUE_REMISE_CIR/cahier-des-charges/00-sommaire.md`: pour les besoins metier de tarification, en gardant `docs/architecture-cible-cir-cockpit.md` prioritaire sur les hypotheses anciennes.
- Docs volumineux (`docs/architecture-cible-cir-cockpit.md`, `docs/ASSISTANT_IA/plan-mistral-assistant-transversal.md`): lire d'abord la structure (titres/sommaire) puis seulement les sections utiles. Pour une decision transverse ou une nouvelle brique, lire aussi les principes non negociables, le contexte metier concerne, le contrat IA et les decisions ouvertes associees.
- `.mcp.json` est ignore par Git et local-only. Verifier les MCP reellement exposes par l'environnement actif avant de s'y fier.

## Regles de travail

- Lire d'abord les fichiers directement concernes, puis agir. Ne pas explorer tout le repo si le perimetre est clair.
- Respecter le worktree sale: ne jamais revert les changements non faits par l'agent.
- Modifier le minimum utile. Ne pas ajouter de fonctionnalite, refactor, doc ou fichier non demande.
- Zero donnees mockees, hardcodees, TODO non resolus ou texte decoratif dans le code livre.
- Preferer modifier un fichier existant plutot que creer un nouveau fichier.
- Zod: source unique dans `shared/schemas`, payloads API en `.strict()`, `safeParse` sur entrees/sorties externes, details de validation en francais.
- Erreurs: utiliser `createAppError()` / mappers / `reportError()` / `notifyError()`. Pas de `throw new Error()`, `console.error()` ou `toast.error()` directs hors exceptions existantes documentees.
- Garder les imports via alias `@/*` cote frontend et eviter les imports circulaires.

## Inspiration UI/UX

- Pour toute demande de revue, refonte, polish, audit ou decision UI/UX/design, consulter les inspirations actuelles avant de proposer ou modifier l'interface: Ramp (`https://ramp.com/`), Stripe (`https://stripe.com/fr`), Attio (`https://attio.com/`), Linear (`https://linear.app/`), Mistral (`https://mistral.ai/`) et SmoothUI (`https://smoothui.dev/`) pour les micro-interactions et composants animes.
- Utiliser ces sites comme references de direction visuelle, densite, hierarchie, micro-interactions, clarte SaaS et qualite de finition, sans copier leur contenu, leur marque, leurs assets proprietaires ou leurs textes.
- Si l'acces reseau ou navigateur est indisponible, le signaler explicitement et s'appuyer seulement sur les principes deja connus.

## Skills obligatoires

Invoquer le skill pertinent avant d'ecrire du code:

- `cir-cockpit-agent-router`: orientation repo locale, choix des docs/MCP/skills utiles et reduction du contexte charge.
- `cir-cockpit-qa-validation`: choix de validation CIR Cockpit par impact et rapport QA court.
- `cir-cockpit-api-contracts`: contrats tRPC, schemas Zod partages, services RPC front et routes/actions backend.
- `cir-cockpit-design`: tokens, densite et regles PO du design system local; a invoquer avant les skills design generiques pour toute UI visible.
- `vercel-react-best-practices`: composants, hooks ou pages React.
- `vercel-composition-patterns`: refactoring de composants React.
- `web-design-guidelines`: audit UI, accessibilite, UX.
- `impeccable`: design, redesign, polish, onboarding, empty state, formulaire, dashboard ou composant visible.
- `design-taste-frontend`: decision visuelle d'implementation UI.
- `layers-intro` puis `layers-*`: modele produit, vocabulaire metier, parcours, onboarding complexe, architecture d'information, objets/relations ou decisions UX profondes.
- `supabase-postgres-best-practices`: DB, migrations, RLS, indexes, queries, Edge Functions accedant a la DB.
- `cir-error-handling`: systeme d'erreurs.
- `systematic-debugging`: bug, echec test ou comportement inattendu avant correction.
- `vitest`: creation ou mise a jour de tests front.
- `playwright-cli`: verification de parcours UI/E2E.
- `pnpm`: scripts, workspace, dependances ou package manager.
- `trpc-type-safety`: procedure ou migration tRPC.
- `drizzle-orm`: schema ou queries Drizzle.
- `find-skills`: competence manquante ou capability inconnue.

## Docs et MCP

- Context7 est requis pour une decision d'implementation sur React, TanStack, tRPC, Drizzle, Vitest, Playwright, Zod ou autre librairie/framework. Pas requis pour une simple relecture documentaire ou un changement de texte.
- Supabase MCP est requis avant toute action DB, migration, RLS, Edge Function, deploy ou diagnostic runtime Supabase.
- Si le site doit etre verifie en direct dans Codex, utiliser le navigateur in-app Codex [@Navigateur](plugin://browser@openai-bundled) en priorite pour ouvrir, naviguer et inspecter le rendu. Garder Playwright/E2E pour les scenarios automatises, traces, screenshots reproductibles ou demandes explicites.
- Chrome DevTools/Playwright seulement si un parcours UI doit etre verifie; ne pas lancer d'E2E automatiquement sans demande utilisateur.
- shadcn MCP seulement pour rechercher/installer/verifier des composants UI.

## Migrations Supabase: convention globale MCP-first

- Cette convention s'applique a toutes les briques et tous les schemas, sans exception par domaine.
- Supabase distant est la verite de l'etat runtime; `backend/migrations/` est l'historique SQL durable, relisible et reconstructible. Une migration n'est terminee que lorsqu'elle existe des deux cotes avec la meme version, le meme nom et le meme SQL.
- Toute ecriture de schema sur le projet lie passe par `apply_migration` du MCP Supabase, apres autorisation explicite du PO. Ne pas utiliser `supabase db push`, le SQL Editor du Dashboard ou une connexion directe comme voie concurrente.
- Avant l'ecriture: inspecter l'etat distant en lecture seule, preparer une migration additive et transactionnelle quand PostgreSQL le permet, relire les RLS/ACL/fonctions concernees et definir les preuves et le rollback.
- Apres succes de `apply_migration`: relire immediatement `supabase_migrations.schema_migrations`, recuperer le SQL exact enregistre par Supabase sans le retaper, puis l'ecrire dans `backend/migrations/<version_distante>_<nom>.sql`.
- Verifier pendant cette meme operation l'egalite du nom, de la version et d'une empreinte du SQL normalise entre le distant et le fichier genere. Cette empreinte est une preuve d'extraction ponctuelle, pas une seconde liste durable a maintenir.
- Rejouer ensuite les controles runtime cibles, les advisors pertinents et `pnpm run repo:check`. Si la generation locale ou la parite echoue apres l'application distante, arreter les migrations suivantes et traiter cette migration comme incomplete.
- Ne pas creer de dossier miroir par brique, de liste `remote-only`, de manifeste de checksums ecrit a la main ni de script d'integrite specifique a un domaine. La parite globale reste centralisee dans `scripts/check-repo-state.mjs`.
- Ne jamais modifier une migration historique deja appliquee. Toute correction passe par une nouvelle migration additive. Les anciens ecarts de versions restent geres par les compatibilites existantes jusqu'a une reconciliation explicitement autorisee.
- Procedure detaillee et format des fichiers: `backend/migrations/README.md`.

## Politique QA optimisee

Choisir la validation par impact, pas par reflexe:

| Perimetre | Validation standard |
| --- | --- |
| Analyse, plan, audit sans edition | Aucune suite QA; lecture et commandes read-only ciblees si utiles |
| Docs/config agents/QA uniquement | `pnpm run qa:docs` |
| Frontend uniquement | `pnpm run qa:front` ou commandes Vitest ciblees + typecheck/lint selon impact |
| Backend uniquement | `pnpm run qa:back` ou Deno lint/check/test cible selon impact |
| Shared/API/erreurs/contrats transverses | Checks front + back cibles, ou `pnpm run qa:fast` si large |
| Livraison finale, merge, PR, deploy, demande explicite | Lire `docs/qa-runbook.md`, puis `pnpm run qa` et probes conditionnelles |

Details:

- `repo:check:local` = hygiene repo sans appel reseau Supabase; utilise par `qa:docs` et `qa:front`. La parite des migrations distantes reste verifiee par `repo:check` (qa:back, qa:fast, qa).
- `qa:docs` = gate legere docs/config.
- `qa:front` = gate frontend sans coverage/build.
- `qa:back` = gate backend sans integration distante.
- `qa:fast` = gate intermediaire large, pas un reflexe apres chaque petite modification.
- `qa` = gate final complet local.
- `RUN_E2E=1 pnpm --dir frontend run test:e2e` seulement si parcours UI impacte et demande/confirme.
- `pnpm run qa:audit` seulement pour audit dependances avec reseau.

## Edge Function api

- Source de verite: `backend/functions/api/`.
- Wrapper CLI obligatoire: `supabase/functions/api/index.ts` vers `backend/functions/api/index.ts`.
- Import map de deploy: `deno.json` racine.
- `supabase/config.toml` doit garder `[functions.api] verify_jwt = false`; l'auth est geree dans le code backend.
- Commande de reference: `supabase functions deploy api --project-ref <project_ref> --use-api --import-map deno.json --no-verify-jwt`.
- Apres deploy backend/API: verifier via Supabase MCP `list_edge_functions`, routes tRPC impactees et preflight CORS impacte.
