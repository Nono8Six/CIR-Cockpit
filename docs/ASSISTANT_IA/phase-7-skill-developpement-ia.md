# Phase 7 — Skill durable pour développer l'IA de CIR Cockpit

> Prérequis : phases 1 à 6 terminées et leurs changelogs remplis. Lire `00-plan-general.md`.
> Périmètre : `.agents/skills`, `AGENTS.md` et documentation IA. Gate QA : `pnpm run qa:docs`.
> Objectif : rendre l'architecture IA réellement livrée disponible à tout agent qui ajoute,
> corrige ou audite une feature IA, sans devoir relire l'intégralité de ce chantier historique.

## 1. Résultat attendu

Créer le skill repo `.agents/skills/cir-cockpit-ai-development/`. Sa métadonnée de déclenchement
est toujours visible dans le catalogue des skills et `AGENTS.md` impose son invocation pour toute
tâche IA CIR Cockpit. Son corps et ses références détaillées se chargent uniquement lorsque la
tâche touche l'IA : c'est le fonctionnement attendu de la divulgation progressive, plus fiable
qu'injecter toute l'architecture dans chaque conversation sans rapport.

À la fin de la phase, une conversation neuve demandant « ajoute une nouvelle feature IA » sait :

- où se trouvent broker, registre d'outils, gouvernance, contrats, routes, UI admin et évaluations ;
- comment une feature traverse modèle, prompt, quotas, accès, usage et administration ;
- comment ajouter un outil sans exposer la DB ni contourner l'isolation agence ;
- quelles validations et évaluations sont obligatoires avant livraison.

## 2. Construire le skill depuis le code livré

### 2.1 Sources de vérité à inventorier

Lire les changelogs des phases 1 à 6 puis vérifier le code réel. Le skill ne doit documenter que
des chemins, contrats et décisions réellement présents. Inventaire minimal à confirmer :

- `shared/schemas/ai.schema.ts` et `shared/schemas/aiAssistant.schema.ts` ;
- `backend/drizzle/schema.ts` et migrations IA ;
- `backend/functions/api/services/ai/aiGovernance.ts`, broker, accès et registre d'outils ;
- `backend/functions/api/trpc/router.ts` et miroir `shared/api/trpc.ts` ;
- services/hooks/composants assistant et Admin > IA côté frontend ;
- tests de contrat, évaluations offline/live et section Assistant IA du runbook QA.

Supprimer du futur skill toute hypothèse devenue fausse pendant l'implémentation. Les fichiers de
phase restent l'historique de décision ; le skill décrit l'état opérationnel final.

### 2.2 Structure cible

Créer uniquement les fichiers utiles :

```text
.agents/skills/cir-cockpit-ai-development/
├── SKILL.md
├── agents/
│   └── openai.yaml
└── references/
    ├── architecture.md
    └── feature-workflow.md
```

Pas de `README.md`, changelog ou copie des plans. Garder `SKILL.md` court ; les détails de schéma
et checklists vivent dans les deux références, directement liées depuis le skill.

### 2.3 Métadonnée et déclenchement

Frontmatter obligatoire :

```yaml
---
name: cir-cockpit-ai-development
description: Architecture and workflow for any CIR Cockpit AI work. Use before adding, changing, debugging, reviewing, or testing AI features, assistant tools, prompts, models, provider routing, quotas, access grants, usage tracking, AI admin UI, or AI evaluations.
---
```

Créer `agents/openai.yaml` via l'outil du skill `skill-creator`, avec :

- `display_name: "CIR Cockpit AI Development"` ;
- description courte claire ;
- `default_prompt` mentionnant explicitement `$cir-cockpit-ai-development` ;
- `policy.allow_implicit_invocation: true`.

La description doit être assez large pour déclencher aussi sur une correction de quota, un nouvel
outil ou l'admin IA, pas seulement sur le mot « assistant ».

### 2.4 Contenu essentiel de `SKILL.md`

Le corps du skill doit imposer ce parcours concis :

1. Lire `AGENTS.md`, vérifier `git status --short`, puis lire les fichiers réellement touchés.
2. Charger `references/architecture.md` pour toute décision transverse ou tout diagnostic.
3. Charger `references/feature-workflow.md` pour ajouter/modifier une feature, un outil, un prompt,
   un modèle, une règle d'accès/quota ou une surface UI IA.
4. Préserver les invariants : données structurées via outils backend, aucun SQL produit par le LLM,
   outils lecture seule par défaut, Zod strict entrée/sortie, isolation agence côté service,
   admission quota atomique/idempotente, résultats bornés, traces minimisées, clés serveur seules.
5. Recouper les évolutions OpenRouter avec la documentation officielle actuelle ; ne jamais figer
   dans le skill un « dernier modèle » voué à devenir obsolète.
6. Choisir la gate QA par impact et exécuter les évaluations IA pour tout changement de modèle,
   prompt, routage ou contrat d'outil.

Le skill route vers les autres skills du repo au lieu de recopier leurs règles :
`cir-cockpit-api-contracts`, `cir-error-handling`, `drizzle-orm`,
`supabase-postgres-best-practices`, `cir-cockpit-design`, `vitest`,
`playwright-cli` et `cir-cockpit-qa-validation` selon le périmètre.

### 2.5 Référence `architecture.md`

Documenter avec des chemins vérifiés et un petit flux lisible :

```text
UI -> tRPC strict -> broker -> accès -> réservation quota -> OpenRouter
                     |                              ^
                     +-> registre d'outils -> services métier/RLS
                     +-> usage, coût, générations, traces minimisées
```

Inclure :

- source de vérité de `AiFeature` et propagation Drizzle/Zod/front ;
- résolution provider/modèle/prompt et portée réelle du défaut modèle ;
- boucle tool calling, formats provider, limites, finish reasons et idempotence ;
- registre versionné, schémas entrée/sortie, plafonds lignes/octets et citations ;
- ordre accès/quota/appel/journalisation ;
- frontières agence/superadmin et données autorisées vers le modèle ;
- observabilité, rétention, évaluations et chemins des tests ;
- API OpenRouter retenue et raison, sans dupliquer une liste de modèles datée.

### 2.6 Référence `feature-workflow.md`

Fournir une checklist actionnable pour une nouvelle feature IA :

1. Définir objectif, questions métier, source déterministe et feature key.
2. Décider si un outil existant suffit ; sinon créer service métier puis contrat d'outil strict.
3. Propager feature, modèle/prompt, quota, accès, usage et admin sans enum oublié.
4. Ajouter tRPC + miroir + service front uniquement si une surface l'exige.
5. Seed/versionner le prompt de façon idempotente.
6. Écrire tests de contrat, sécurité inter-agence, concurrence/idempotence si impactée et cas
   d'évaluation métier.
7. Vérifier politique OpenRouter actuelle, modèle/provider réellement servis, coût et latence.
8. Lancer la gate QA adaptée, mettre à jour docs et changelog concernés.

Inclure aussi les anti-patterns : appel provider depuis le navigateur, accès DB/SQL par le LLM,
agrégation de milliers de lignes par le modèle, sortie outil non validée, UUID métier brut dans
l'UI, quota check-then-insert, retry facturable non idempotent, sélecteur modèle non persistant.

## 3. Inscription durable dans le dépôt

Mettre à jour `AGENTS.md` :

- ajouter `cir-cockpit-ai-development` dans « Skills obligatoires » pour toute tâche touchant IA,
  assistant, outils, prompts, modèles, provider, quotas, accès, usages, admin IA ou évaluations ;
- garder `cir-cockpit-agent-router` en premier, puis invoquer le skill IA spécialisé ;
- ne pas copier le contenu technique du skill dans `AGENTS.md`.

Mettre aussi à jour `.agents/skills/cir-cockpit-agent-router/SKILL.md` afin que son routage envoie
explicitement les travaux IA vers le nouveau skill. Cette double inscription rend le déclenchement
robuste dans les agents qui suivent `AGENTS.md` comme dans ceux qui s'appuient sur le catalogue.

## 4. Validation du skill

1. Lancer le validateur `quick_validate.py` fourni par `skill-creator` sur le dossier du skill.
2. Vérifier que `agents/openai.yaml` correspond au frontmatter et autorise l'invocation implicite.
3. Contrôler tous les chemins cités avec `Test-Path`/`rg`; aucun chemin historique ou fichier
   supposé ne doit rester.
4. Faire un forward test en contexte isolé (subagent sans conclusions préinjectées si disponible,
   sinon conversations neuves manuelles documentées) sur au moins trois scénarios :
   - « Ajoute une feature IA qui explique un nouveau rapport métier » ;
   - « Modifie le modèle et le prompt de l'assistant référentiels » ;
   - « Corrige un dépassement de quota sous concurrence ».
5. Vérifier que l'agent invoque le skill, charge la bonne référence, retrouve les contrats réels,
   propose les tests/QA adaptés et n'invente ni table ni endpoint.
6. Faire un scénario négatif non IA : la métadonnée peut rester visible, mais le corps et les
   références ne doivent pas être chargés inutilement.
7. Lancer `pnpm run qa:docs` et `git diff --check`.

## 5. Checkpoints à valider

- [ ] Architecture finale inventoriée depuis le code et les changelogs 1 à 6 ; aucune hypothèse historique obsolète.
- [ ] Skill `.agents/skills/cir-cockpit-ai-development/` créé avec `SKILL.md` concis.
- [ ] `references/architecture.md` décrit le flux, les contrats, la sécurité et les chemins réels.
- [ ] `references/feature-workflow.md` fournit la checklist complète et les anti-patterns.
- [ ] `agents/openai.yaml` généré, cohérent, `allow_implicit_invocation:true`.
- [ ] `AGENTS.md` et `cir-cockpit-agent-router` imposent/routent le skill pour tout travail IA.
- [ ] Validation `quick_validate.py` verte et chemins cités vérifiés.
- [ ] Trois forward tests IA concluants + un test négatif sans chargement inutile.
- [ ] `pnpm run qa:docs` et `git diff --check` verts.

## 6. Prompt d'exécution (à coller dans une conversation neuve)

```text
Tu travailles sur C:\GitHub\CIR_Cockpit\CIR-Cockpit. Implémente la phase 7 du chantier
Assistant IA : le skill durable de développement IA CIR Cockpit.

Avant toute édition : lis AGENTS.md, invoque cir-cockpit-agent-router puis skill-creator. Lis
docs/ASSISTANT_IA/00-plan-general.md, cette phase 7 et les changelogs des phases 1 à 6. Vérifie
git status --short et préserve toutes les modifications qui ne sont pas les tiennes.

Le code final fait foi. Inspecte les schémas, migrations, broker, gouvernance, accès, outils,
routes tRPC, miroir shared, frontend Admin/chat, tests, évaluations et qa-runbook réellement
livrés. Crée ensuite `.agents/skills/cir-cockpit-ai-development/` selon les sections 2 et 3.
Le skill doit expliquer l'architecture opérationnelle et la méthode sûre pour ajouter une feature,
sans recopier les plans ni figer un modèle « dernier cri ».

Génère agents/openai.yaml avec les scripts de skill-creator et valide avec quick_validate.py.
Mets à jour AGENTS.md et le routeur local pour rendre le skill obligatoire sur tout travail IA.
Vérifie tous les chemins cités, exécute les trois forward tests IA et le scénario négatif, puis
lance pnpm run qa:docs et git diff --check. Coche les checkpoints, remplis ce changelog et mets à
jour le suivi du plan général. Ne committe et ne déploie rien sans demande explicite.
```

## 7. Notes de risque

- « Toujours dans le contexte » ne signifie pas charger toute la documentation à chaque requête :
  la métadonnée est permanente, le corps se déclenche sur les tâches IA et les références restent
  progressives. Forcer tout le contenu en permanence dégraderait le contexte des tâches non IA.
- Un skill écrit avant la fin de l'implémentation fossiliserait des chemins spéculatifs. C'est la
  raison pour laquelle cette phase vient après le durcissement et la livraison.
- Les identifiants de modèles, prix et capacités OpenRouter changent. Le skill doit imposer une
  vérification officielle actuelle, pas embarquer une liste prétendument définitive.
- Le skill n'est pas une nouvelle source de vérité applicative : code, migrations, contrats et
  tests restent prioritaires en cas d'écart.

## 8. Changelog

<!-- À remplir en fin de phase. -->

_(vide — phase non encore exécutée)_
