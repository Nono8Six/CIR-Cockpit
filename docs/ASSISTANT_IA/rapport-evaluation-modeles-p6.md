# Rapport d'évaluation des modèles — P6

Date : 2026-07-14, mis à jour le 2026-07-15
Statut : **CAMPAGNE COMPARATIVE ZDR TERMINÉE — aucun nouveau couple activable en l'état**
Commit évalué : `2871484c` + worktree P6 non commité
Projet Supabase : `rbjtrcorlezvocayluok`
Edge Function avant cette tranche : code v129 ; révision de configuration v131, `ACTIVE`,
`verify_jwt=false`. Le correctif v6.1 est validé localement et doit être déployé avant la campagne.
Snapshot : `4e216bc4-7d82-4eb7-aa20-2cc8316667cc`

## Décision

Le verdict « aucun candidat admissible » est annulé. Il mélangeait qualité du modèle, pool
d'endpoints vidé par la politique, et tentatives d'outils correctement bloquées. Les résultats
provider ci-dessous restent un diagnostic historique du runtime v129/v131, pas un classement des
modèles. La campagne 10/20 sera rejouée sur les cas réellement provider-dépendants, avec endpoint
pré-vérifié et épinglé. Le modèle actif n'est ni sélectionné ni modifié par cette conclusion.

## Vérités métier revérifiées en lecture seule

- FEST : 673 lignes segment et 673 `CAT_FAB` distinctes ;
- ROCK avec `CAT_FAB_L ILIKE '%drive%'` : 234 lignes ;
- marques `variateur` ou `drive` : BONF, FEST, LERO, OPTI, PARK, REXR, ROCK, SIEM ;
- total : 140 marques distinctes.

## Politique OpenRouter de la reprise v6.1

Le payload corrigé impose :

- `require_parameters: true` ;
- `max_price` prompt/completion dérivé de la configuration tarifaire ;
- `allow_fallbacks: true` et tri prix en usage normal ;
- `order` explicite et fallback configurable pendant la campagne pour mesurer un endpoint donné.

Le runtime ne transmet plus de filtre ZDR ou de collecte. Le modèle demandé, le modèle servi, le
provider effectif, les finish reasons et chaque tour restent persistés dans
`ai_usage_events.metadata.provider_rounds`. Exacto n'est comparé que si son gain justifie son coût,
à endpoint et plafond comparables.

## Résultats smoke avant correction P3-bis — historique non classant

| Modèle demandé et servi | Provider servi | Tours | Résultat | Tokens entrée/sortie/raisonnement | Coût USD | Latence | Seuil bloquant |
| --- | --- | ---: | --- | ---: | ---: | ---: | --- |
| `mistralai/mistral-small-3.2-24b-instruct` | DeepInfra | 4 | `INVALID_PAYLOAD` | 10 928 / 214 / 0 | 0,00086240 | 5 496 ms | plus de 2 tours et réparation changeant les tables |
| `openai/gpt-oss-120b` | SambaNova | 5 | `INVALID_PAYLOAD` | 11 937 / 767 / 680 | 0,00239983 | 4 568 ms | plus de 2 tours et réparation changeant les tables |
| `deepseek/deepseek-v4-flash` | Novita | 2 | `AI_PROVIDER_RATE_LIMITED` | 3 851 / 302 / 203 | 0,00050901 | 9 370 ms | erreur provider avant réponse métier |
| `deepseek/deepseek-v4-pro` | Novita | 6 | `AI_TOOL_LOOP_DETECTED` | 20 009 / 1 345 / 617 | 0,00912745 | 30 738 ms | plus de 2 tours et seconde réparation SQL |
| `deepseek/deepseek-v4-flash` (nouvel essai) | Morph | 3 | `AI_TIMEOUT` | 7 362 / 452 / 0 | 0,00114897 | 60 286 ms | timeout et plus de 2 tours |
| `qwen/qwen3.6-27b` | non déterminable | 0 tracé | `AI_RESPONSE_INVALID` | 0 / 0 / 0 tracé | 0 | 6 356 ms | réponse provider rejetée avant parsing des métriques |

Coût smoke provider total observé : **0,01404766 USD**. Ces appels mesurent la réaction des
modèles à un mauvais routage amont et ne sont pas utilisables pour les classer.

Gemini 3.5 Flash n'a pas été exécuté : après les échecs concordants de Mistral, GPT-OSS,
DeepSeek Flash, DeepSeek Pro et Qwen, son prix nettement supérieur n'aurait pas corrigé le fait que
le cas de clarification est envoyé à tort au fallback SQL généraliste.

Le cas déterministe FEST exécuté séparément avec Mistral a produit 673, snapshot attendu,
provenance vérifiée, zéro token provider et coût nul.

## Correctif P3-bis et preuve live

- le contexte conversationnel est désormais une union discriminée `result` ou
  `pending_clarification` ;
- les termes métier sont extraits génériquement depuis la formulation utilisateur, sans
  dictionnaire fermé (`raccords`, `pompes hydrauliques`, etc.) ;
- la réponse nue `cat_fab` reprend l'intention initiale et appelle directement
  `search_supplier_categories` ;
- la réponse `fam_cir` est refusée explicitement sans bascule vers le SQL libre ;
- une nouvelle question complète invalide le contexte en attente.

Le scénario live complet a été exécuté sur `api` v125 :

- question initiale : « Quelles marques ont des familles de produits avec des variateurs ou
  drives ? » ;
- réponse de clarification : `cat_fab` ;
- résultat : 8 marques et 359 segments, liste exacte BONF, FEST, LERO, OPTI, PARK, REXR, ROCK,
  SIEM ;
- outil : `search_supplier_categories` uniquement ;
- snapshot : `4e216bc4-7d82-4eb7-aa20-2cc8316667cc` ;
- usage provider : 0 token, coût 0 USD, aucun tour provider ;
- événement d'usage : `execution_mode=deterministic`, succès.

Un second scénario live avec le terme non prédéfini `raccords` retourne 6 marques et 33 segments
(AIGN, AIRN, CONT, FGIN, PARK, SFER), via `search_supplier_categories`, avec zéro token provider et
un coût nul.

## Répétitions et métriques avant reprise v6.1

- répétitions live réellement exécutées : un smoke provider par candidat, plus un smoke
  déterministe FEST ;
- campagne obligatoire 10/20 : non exécutée, car aucun candidat n'a passé le smoke ;
- p50/p95 et coût par réponse correcte : non calculables honnêtement sur un seul échec par
  candidat ;
- isolation DB deux agences/deux identités : exécutée après correction, 3/3 intégrations vertes,
  y compris `search_schema`, classement borné, seuil de remise > 20 % et vues RLS.

## Reprise sur `api` v127 après P5B — 2026-07-14

La précondition de déploiement a été confirmée par Supabase MCP : migration
`20260714102852_ai_context_universal_p5b`, fonction `api` v127 `ACTIVE`, entrypoint
`supabase/functions/api/index.ts`, import map `deno.json` et `verify_jwt=false`. Les routes
`ai.assistant.status` et `ai.assistant.ask` retournent 401 sans session, jamais 404, et le
preflight depuis `http://localhost:3000` retourne 200.

La clé OpenRouter fournie pour la campagne a été testée puis enregistrée par la route
super-admin `ai.settings.saveProvider`; elle est chiffrée par l'Edge Function et n'a jamais été
journalisée. Six modèles ont été configurés, avec Mistral restauré comme unique défaut après
chaque lot :

- `mistralai/mistral-small-3.2-24b-instruct` ;
- `openai/gpt-oss-120b` ;
- `deepseek/deepseek-v4-flash` ;
- `deepseek/deepseek-v4-pro` ;
- `z-ai/glm-5.2` ;
- `anthropic/claude-sonnet-4.6` comme référence frontier.

| Cas `où sont stockées les remises ?` | Modèle | Résultat | Outils observés | Tokens entrée/sortie/raisonnement | Coût USD | Latence | Verdict smoke |
| --- | --- | --- | --- | ---: | ---: | ---: | --- |
| P5B schema | Mistral Small 3.2 | réponse sans résultat métier | `search_schema` | 3 774 / 213 / 0 | 0,00032565 | 6 609 ms | échec exactitude |
| P5B schema | GPT-OSS 120B | `AI_TOOL_LOOP_DETECTED` | répétition de l'outil | non finalisé | non finalisé | 6 000 ms env. | échec boucle |
| P5B schema | DeepSeek V4 Flash | `AI_PROVIDER_RATE_LIMITED` | aucun résultat final | non finalisé | non finalisé | 6 000 ms env. | erreur provider |
| P5B schema | DeepSeek V4 Pro | réponse sans résultat métier | `search_schema`, `describe_database_tables` | 8 750 / 1 098 / 481 | 0,01278493 | 29 245 ms | échec exactitude |
| P5B schema | GLM 5.2 | réponse sans résultat métier | deux `search_schema`, `describe_database_tables` | 12 147 / 881 / 261 | 0,00849821 | 23 309 ms | échec exactitude et plus de 2 tours |
| P5B schema | Claude Sonnet 4.6 | `AI_PROVIDER_RATE_LIMITED` | aucun résultat final | non finalisé | non finalisé | 3 000 ms env. | erreur provider |

Le second smoke provider-dépendant, « top 3 CAT_FAB de FEST par remise d'achat », a été joué
avec Mistral. Il exécute `search_schema`, `describe_database_tables`, puis une requête SQL sur la
vue typée, mais applique `FEST` à `cat_fab` au lieu de `marque`. La requête retourne zéro ligne et
la réponse finale est non prouvée : 12 503 tokens d'entrée, 191 de sortie, 0,00097592 USD et
7 371 ms.

À ce stade historique, ces résultats avaient suspendu la matrice 10/20. Cette conclusion n'est plus
un verdict modèle : le harnais v6.1 corrige précisément les biais de provider, de tours et de
tentatives bloquées qui avaient produit cette disqualification. Aucune sélection ni modification
durable du modèle actif n'en a résulté. P7 reste non autorisée.

## Correctif structurel post-smoke — historique avant déploiement

L'analyse des traces a isolé quatre causes runtime communes, indépendantes du modèle : les sorties
réussies de `search_schema` et du SQL générique n'alimentaient pas la preuve métier ; un outil de
découverte sans fait pouvait dégrader une preuve ultérieure ; le classement FEST laissait le
provider deviner la dimension de marque ; enfin un outil borné réussi n'imposait pas la conclusion
au tour suivant.

Le correctif local ajoute une preuve sourcée par snapshot pour la recherche de schéma et les
résultats SQL primitifs, un outil borné `rank_purchase_terms` qui filtre exactement
`marque = FEST` et trie `remise_ha_pct` numérique, ainsi qu'une conclusion forcée après un outil
unique réussi. Le parseur route désormais « où sont stockées les remises ? » vers
`search_schema` seul et le top FEST vers `rank_purchase_terms` seul. Les garde-fous SQL P4/P5B,
les vues P5B et les chemins déterministes P1/P2 ne sont pas modifiés.

Validation locale et distante sans déploiement :

- Supabase MCP : colonnes du snapshot actif confirmées ; 673 CAT_FAB FEST et remise maximale
  83,333 % sur `ai_v_purchase_terms_active` ;
- intégration DB réelle : 3/3 tests verts, dont deux identités sur deux agences distinctes,
  sorties `search_schema`/`rank_purchase_terms` cohérentes et RLS conservée ;
- suite IA : 84/84 tests verts ;
- `deno check` de l'entrypoint : vert ;
- `pnpm run qa:back` : 351 tests verts, 0 échec, 13 intégrations conditionnelles ignorées.

Ce correctif n'est pas inclus dans `api` v127. Les smoke tests et la campagne 10/20 restent donc
suspendus jusqu'à une nouvelle autorisation explicite de déployer l'Edge Function.

## Configuration et restauration

- avant : Mistral Small 3.2 actif et par défaut ;
- GPT-OSS, DeepSeek Flash, DeepSeek Pro, GLM 5.2 et Claude Sonnet 4.6 : configurations de
  campagne présentes mais non défaut ;
- après chaque lot : un seul modèle par défaut ;
- fin : Mistral Small 3.2 restauré comme unique défaut ;
- clé OpenRouter : remplacée après autorisation explicite, testée puis chiffrée via l'API
  super-admin, jamais journalisée ;
- migration : aucune.

## Validation

- reprise P6 v127 : 24/24 tests d'évaluation offline ciblés verts ;
- `pnpm run qa:back` après extension du harnais : 346 tests backend verts, 13 intégrations
  conditionnelles ignorées ;
- correctif structurel post-smoke : 84/84 tests IA, 3/3 intégrations DB réelles et
  `pnpm run qa:back` à 351 verts, 0 échec, 13 ignorés ;
- terminaison bornée après retour OpenRouter vide : 49/49 tests ciblés, puis gate finale
  `pnpm run qa:back` à 352 verts, 0 échec, 13 ignorés et `qa:docs` vert ;
- tests ciblés du correctif : 29/29 backend et 5/5 frontend verts ;
- `pnpm run qa:fast` : 688/688 tests frontend et 339 tests backend verts, 11 intégrations
  conditionnelles ignorées ;
- `pnpm run qa:back` après généralisation : 340 tests backend verts, 11 intégrations
  conditionnelles ignorées ;
- déploiement v125 vérifié via Supabase MCP ;
- smoke live complet de clarification : vert ;
- gate finale `pnpm run qa` : 688/688 tests frontend verts, puis arrêt sur le seuil de branches
  préexistant de `useDashboardStatusHelpers.ts` (13,33 % pour 30 % requis) ;
- couverture dashboard préexistante : hors P6, non modifiée ; la campagne comparative reste à
  exécuter avant validation P6.

## Commandes principales

```powershell
pnpm run qa:back
supabase functions deploy api --project-ref rbjtrcorlezvocayluok --use-api --import-map deno.json --no-verify-jwt
$env:RUN_API_INTEGRATION='1'
$env:RUN_AI_LIVE_EVALS='1'
$env:AI_LIVE_CASE_START='1'
deno test --env-file=backend/.env --allow-env --allow-net --config backend/deno.json backend/functions/api/integration/assistantLiveEvaluations_integration_test.ts
```

## Prochaine action nécessaire

Déployer le runtime v6.1 autorisé, vérifier la révision ACTIVE, l'auth/CORS et les smokes à coût nul,
puis rejouer des smokes provider avec endpoints épinglés. La matrice 10/20 démarre pour les
candidats techniquement exécutables ; elle s'arrête si sa projection cumulée dépasse 20 USD.
Ne pas modifier le modèle actif et ne pas ouvrir P7 avant validation explicite de la sélection.

## Campagne post-correctif sur `api` v129/v131 — historique invalidé

Le correctif a été déployé avec le wrapper `supabase/functions/api/index.ts`, l'import map racine
et `verify_jwt=false`. Supabase MCP a confirmé v129 `ACTIVE`; la hausse puis la suppression du
rate limit temporaire ont créé les révisions de configuration v130/v131 sans changer le bundle
de code v129. Les probes CORS et 401 sans session sont restés verts.

Les deux cas correctifs passent sur Mistral :

| Cas | Outil | Latence | Tokens entrée/sortie | Coût USD | Verdict |
| --- | --- | ---: | ---: | ---: | --- |
| Top 3 CAT_FAB FEST par remise | `rank_purchase_terms` | 3 665 ms | 627 / 22 | 0,00005143 | exact, snapshot prouvé |
| Où sont stockées les remises ? | `search_schema` | 3 947 ms | 627 / 13 | 0,00004963 | exact, snapshot prouvé |

Les smokes de qualification transversaux ont ensuite appliqué l'arrêt au premier seuil bloquant.
Les répétitions 10/20 n'ont donc pas été lancées : elles auraient répété des violations déjà
disqualifiantes et contredit la règle de sélection du plan.

| Modèle demandé | Provider effectif observé | Échantillon post-correctif | Coût enregistré | p50/p95 succès ou erreur | Violation bloquante | Verdict |
| --- | --- | ---: | ---: | --- | --- | --- |
| Mistral Small 3.2 | DeepInfra | 62 événements (35 succès, 9 erreurs, 18 bloqués) | 0,00499615 USD | succès 306/1 808 ms ; erreur 4 390/8 574 ms | erreurs SQL/réparation, écart de remise non prouvé, tri textuel non conclu | rejeté |
| GPT-OSS 120B | WandB et Groq | 26 événements (22 succès, 4 erreurs) | 0,00319856 USD | succès 328/26 531 ms ; erreur 60 220/60 295 ms | trois timeouts, fonction interdite, recommandation explicite du tri textuel interdit | rejeté |
| DeepSeek V4 Flash | endpoint refusé avant génération | 2 erreurs | 0 USD | 457/461 ms | 429 provider systématique | rejeté |
| DeepSeek V4 Pro | Novita | 5 événements (2 succès, 3 erreurs) | 0,01001140 USD | succès 3 340/10 898 ms ; erreur 60 208/60 261 ms | deux timeouts et nom d'outil hors allowlist | rejeté |
| GLM 5.2 | Novita | 5 événements (3 succès, 2 erreurs) | 0,03842133 USD | succès 4 166/26 611 ms ; erreur 35 699/60 321 ms | 6+ tours, 34 342 tokens sur un cas, boucle outil, timeout | rejeté |
| Claude Sonnet 4.6 | endpoint refusé avant génération | 2 erreurs | 0 USD | 810/951 ms | 429 provider systématique | rejeté |

Coût provider total enregistré sur la fenêtre historique : **0,05662744 USD**, comptabilisé dans
le cumul P6 et très inférieur au plafond de 20 USD. Cette fenêtre utilisait l'ancienne politique
de routage désormais retirée. Le modèle servi est resté égal au modèle demandé ; les providers
effectifs ci-dessus proviennent des `provider_rounds` persistés.

État restauré après campagne : Mistral est l'unique modèle par défaut ; quota global revenu à
50 appels/jour, 1 000/mois, 300 000 tokens/jour et 6 000 000/mois ; surcharge temporaire
`AI_ASSISTANT_RATE_LIMIT_MAX` supprimée. Aucune migration et aucune modification du dashboard.
Probes finales v131 : `ai.assistant.status` et `ai.assistant.ask` répondent 401 sans session,
jamais 404 ; leurs preflights depuis `http://localhost:3000` répondent 200 avec l'origine CORS
attendue.

### Pré-vol réel des endpoints — 2026-07-14

Le pré-vol `/api/v1/models/{slug}/endpoints`, exécuté avec la clé de campagne sans la journaliser,
confirme au moins un endpoint tools sous le plafond tarifaire de chaque configuration :

| Modèle | Endpoints vus | Endpoints éligibles sous `max_price` | Endpoint de départ proposé pour le smoke |
| --- | ---: | ---: | --- |
| Mistral Small 3.2 | 4 | 1 | `deepinfra/fp8` |
| GPT-OSS 120B | 21 | 8 | `open-inference/int8` |
| DeepSeek V4 Flash | 17 | 16 | `deepinfra/fp4` |
| DeepSeek V4 Pro | 16 | 1 | `deepseek` |
| GLM 5.2 | 27 | 3 | `streamlake/fp8` |
| Claude Sonnet 4.6 | 8 | 5 | `anthropic/2` |

Les anciens 429 à coût nul de Flash et Claude ne sont donc pas des verdicts modèle. La campagne
enregistrera l'endpoint réellement servi et n'agrégera pas plusieurs providers sous un même score.

### Correctif v6.1 validé avant déploiement

- promotion déterministe de `search_schema` et des écarts de remise avec `threshold_pct` strict ;
- récupération guidée après outil inconnu, arguments invalides, doublon ou réparation SQL hors
  périmètre ; toute tentative bloquée porte `executed=false` et un `blocked_reason` ;
- aucune colonne ou fonction interdite n'est exécutée ; une récupération exacte et prouvée n'est
  plus disqualifiée ;
- prompt fallback enrichi avec allowlist, vues `ai_v_*`, `ILIKE`, colonnes financières numériques,
  snapshots et résistance aux injections ;
- suppression du plafond de deux tours et du plafond de sortie injecté dans les appels assistant ;
  timeout et anti-boucle restent des protections techniques, le coût par requête est plafonné ;
- harnais v6.1 : tours tentés/exécutés/bloqués, provider effectif, finish reasons, tokens, coût et
  latence ; `pnpm run qa:back` : 356 réussis, 0 échec, 13 intégrations conditionnelles ignorées.

### Proposition de routage E4 — en attente de la campagne et de validation

- chemins déterministes P1/P2 : aucun provider, validés à coût nul ;
- chemins bornés : réponse directe sans provider si l'outil suffit ; sinon candidat léger le moins
  cher qui franchit la campagne ;
- fallback SQL : candidat renforcé uniquement si son coût par réponse correcte est meilleur que le
  candidat léger ;
- modèle frontier : Claude Sonnet 4.6 sert de référence haute sur un endpoint pré-vérifié.

Aucune activation n'est proposée avant les chiffres 10/20. `ai_model_configs` et le modèle actif
restent inchangés. P7 reste non autorisée.

## Clôture P6 — sélection DeepSeek Flash / Pro

Décision utilisateur du 2026-07-14 : clore P6 avec OpenRouter uniquement, en mode standard,
DeepSeek V4 Flash pour le régime courant/borné et DeepSeek V4 Pro pour le fallback SQL complexe.
Les chemins déterministes restent sans provider. Cette sélection est **en attente d'activation** :
aucun modèle par défaut, routage actif, migration ou déploiement n'a été modifié pour la clôture.

Claude est exclu car trop coûteux et ne doit plus être appelé. GPT-OSS est explicitement refusé.
Mistral et GLM ne sont pas sélectionnés ; leurs mesures restent uniquement comme historique. Le ZDR
et `data_collection` ne sont pas des critères de cette décision.

### Campagne opérationnelle finale

| Régime / cas | Modèle | Exécutions | Providers servis | Exactitude et sécurité | Coût | Latence p50 / p95 | Verdict |
| --- | --- | ---: | --- | --- | ---: | ---: | --- |
| Courant/borné — `p5b-top-remises-fest` | DeepSeek V4 Flash | 20/20 | DeepInfra 15 ; GMICloud 5 | 20/20 exactes ; snapshot attendu ; `rank_purchase_terms` seul ; aucun outil interdit | 0,00216521 USD | 3 856 / 5 886 ms | retenu |
| Fallback/discriminants — `resume-changements` et I-04 partiel | DeepSeek V4 Pro | 13/70 avant arrêt | StreamLake 10 ; Baidu 3 | 13 réponses HTTP 200 ; aucun outil interdit exécuté, mais balisage d'appel d'outil brut dans les 3 réponses I-04 | 0,11942355 USD | 22 695 / 131 807 ms | retenu avec réserve explicite |

Le lot Pro a été arrêté après les 10 répétitions de `resume-changements` et 3 répétitions de
`i04-colonne-agence-inexistante`. Les cinq autres cas et les sept répétitions I-04 restantes n'ont
pas été exécutés. La latence rendait la poursuite disproportionnée ; l'utilisateur accepte
explicitement cette couverture partielle pour clôturer P6. Il ne s'agit donc pas d'un 70/70 et la
sortie DSML brute sur I-04 reste un défaut modèle/runtime connu à surveiller avant activation.

### Classification des résultats

- Exactitude modèle : Flash 20/20 sur l'agrégat critique ; Pro ne peut pas recevoir un taux global
  sur 70 cas puisque le lot est incomplet.
- Modèle/runtime : 3 réponses Pro I-04 exposent un appel d'outil DSML brut au lieu d'une conclusion
  utilisateur ; aucune colonne inventée n'a été exécutée dans ces traces.
- Provider OpenRouter : aucun échec provider dans les 33 exécutions finales facturées ; les
  providers effectivement servis sont séparés dans le tableau.
- Transport réseau : aucun échec transport dans les 33 exécutions finales.
- DB/Supabase : les 90 premiers essais ont été refusés par le quota CIR déjà consommé, puis rejoués
  après relèvement temporaire borné ; ce n'était ni une erreur modèle ni une erreur provider.

### Coût et restauration

Le coût P6 enregistré avant cette reprise était de 3,86885791 USD. Les deux lots finaux ajoutent
0,12158876 USD. Le coût P6 final est donc **3,99044667 USD**, très inférieur au plafond de 20 USD.

Le quota temporaire de campagne a été restauré à 50 appels/jour, 2 000 appels/mois,
300 000 tokens/jour, 20 000 000 tokens/mois, 15 USD/jour et 300 USD/mois. Aucun grant utilisateur
temporaire ne doit rester. Mistral demeure le seul modèle `is_default=true` tant que l'activation
Flash → Pro n'est pas autorisée explicitement.

### Verdict P6 par régime

- Déterministe : aucun provider.
- Courant/borné nécessitant un provider : DeepSeek V4 Flash.
- Fallback SQL complexe : DeepSeek V4 Pro, avec réserve de latence et de rendu DSML brut.
- Politique : OpenRouter, fallbacks normaux, `require_parameters=true`, `max_price`, mode standard.
- Activation : **EN ATTENTE** d'une autorisation explicite.

P6 est validée avec réserve par décision utilisateur. P7 reste interdite sans nouvelle autorisation
explicite.

### QA et état distant de clôture

- tests assistant ciblés : 53/53 verts ;
- intégration réelle deux identités/deux agences : 3/3 verte ;
- `deno check` de l'entrypoint : vert ;
- `pnpm run qa:back` : 359 tests verts, 0 échec, 13 intégrations conditionnelles ignorées ;
- `pnpm run qa:docs` et `git diff --check` : verts ;
- `pnpm run qa` : 156 fichiers et 692 tests frontend verts, puis blocage préexistant hors P6 sur
  la couverture branches de `useDashboardStatusHelpers.ts` : 13,33 % pour 30 % requis. Le seuil et
  le dashboard n'ont pas été modifiés.
- Supabase MCP : `api` v137 `ACTIVE`, `verify_jwt=false`, entrypoint et import map attendus ;
  Mistral reste l'unique modèle par défaut ; quotas restaurés ; zéro grant utilisateur temporaire.

Le grant créé par le lot Pro a dû être supprimé explicitement après l'interruption du processus,
qui avait empêché l'exécution du `finally` de nettoyage. Aucune autre configuration distante n'a
été modifiée.

## Implémentation locale E4 — 2026-07-15

Le routage sélectionné à la clôture P6 est désormais implémenté localement, sans mutation de la
configuration distante :

- `bounded_provider` résout exactement `deepseek/deepseek-v4-flash` ;
- `general_sql_fallback` résout exactement `deepseek/deepseek-v4-pro` ;
- les chemins déterministes et les clarifications n'appellent aucun provider ;
- une relance reconnue depuis le contexte conversationnel reste déterministe même si son texte
  isolé serait classé `general_sql_fallback` ;
- un modèle E4 absent, désactivé ou sans provider chiffré rend le régime indisponible au lieu de
  retomber silencieusement sur le modèle par défaut ;
- les overrides du harnais d'évaluation conservent la priorité ;
- `ai_usage_events.metadata` enregistre `execution_mode` et `requested_model_id` sur les succès et
  les erreurs provider ;
- `ai.assistant.status` annonce Flash comme modèle principal seulement si Flash et Pro sont tous
  deux résolvables.

Supabase MCP confirme Flash et Pro présents, activés, non défaut, avec OpenRouter actif et une clé
chiffrée configurée. Le test d'intégration résout les deux modèles par identifiant sans modifier
`is_default`.

Validation locale E4 :

- politique/routage/contrats P6 ciblés : 37/37 verts ;
- suite assistant obligatoire du runbook : 53/53 verte ;
- intégration DB read-only E4 + isolation : 4/4 verte ;
- `pnpm run qa:back` : 360 tests verts, 0 échec, 14 intégrations conditionnelles ignorées ;
- `pnpm run qa:docs` et `git diff --check` : verts ;
- `pnpm run qa` : 156 fichiers et 692 tests frontend verts, puis arrêt sur le seuil préexistant
  hors E4 de `useDashboardStatusHelpers.ts` (13,33 % de branches pour 30 %). Ni ce fichier ni le
  seuil n'ont été modifiés.

## Déploiement E4 et acceptation runtime — `api` v138

Déploiement autorisé et exécuté le 2026-07-15 sans migration ni mutation de
`ai_model_configs`. Supabase MCP confirme `api` v138 `ACTIVE`, `verify_jwt=false`, le wrapper
`supabase/functions/api/index.ts` et l'import map racine `deno.json`.

Probes réseau :

- preflight CORS `ai.assistant.ask` depuis `http://localhost:3000` : 200, origine et méthodes
  attendues ;
- `ai.assistant.ask` et `ai.assistant.status` sans jeton : 401 ;
- `ai.assistant.status` authentifié : 200, assistant actif, modèle principal
  `deepseek/deepseek-v4-flash` ;
- smoke `bounded_provider` : 200 via DeepInfra, modèle Flash, outil `rank_purchase_terms`,
  métadonnées persistées `execution_mode=bounded_provider` et
  `requested_model_id=deepseek/deepseek-v4-flash` ; coût 0,00011635 USD ;
- smoke `general_sql_fallback` : deux tentatives 502 `AI_PROVIDER_UNAVAILABLE`, modèle demandé Pro,
  0 token et métadonnées persistées `execution_mode=general_sql_fallback` /
  `requested_model_id=deepseek/deepseek-v4-pro`.

Cause racine du smoke Pro : le pré-vol OpenRouter expose un seul endpoint sous le plafond configuré
0,435/0,87 USD par million de tokens, l'endpoint natif `deepseek`. La politique de données du compte
le refuse et OpenRouter répond 404 « aucun endpoint compatible avec les guardrails et la politique
de données ». Sans plafond, un probe minimal répond 200 via StreamLake, dont le tarif
0,7134/1,4268 USD par million dépasse le plafond courant. L'acceptation runtime Pro reste donc
**BLOQUÉE** jusqu'à une décision explicite : autoriser l'endpoint natif dans la politique de données
OpenRouter, ou relever le plafond du modèle vers un endpoint compatible. Aucun contournement n'a été
appliqué.

État restauré et contrôlé : quota global inchangé (50 appels/jour, 2 000/mois,
300 000 tokens/jour, 20 000 000/mois, 15 USD/jour, 300 USD/mois), zéro grant utilisateur temporaire,
Mistral seul `is_default=true`. P7 reste non autorisée.

## Campagne comparative ZDR post-E4 — 2026-07-15

### Résumé exécutif

La campagne autorisée a exécuté les **50 cas prévus** : 10 prompts × 5 couples
modèle/endpoint, une seule tentative fournisseur par cas. Les cinq refus Kimi dus au quota CIR ont
été rejoués après relèvement du quota, car ils n'avaient atteint aucun fournisseur et n'étaient pas
des tentatives modèle. Aucun autre retry n'a été effectué.

Verdict : **aucun nouveau couple n'est activable en l'état**.

- Kimi K2.7 Code / Inceptron est le meilleur candidat encore admissible, mais seulement à titre de
  candidat de reprise : il ne répond pas correctement aux tests 1, 3, 5 et 10, et son test 7 ne
  satisfait que partiellement la demande d'agence.
- DeepSeek V4 Pro / Novita est plus stable que Qwen, mais trop lent et ne résout aucun des cas
  métier discriminants 1, 3, 5, 7 et 10.
- Qwen 3.6 35B A3B / AkashML est le moins cher, mais cinq timeouts sur dix le rendent inexploitable.
- GPT-5.4 Mini / Azure n'a produit aucune génération : les sept cas provider ont tous renvoyé
  `AI_PROVIDER_UNAVAILABLE`. Les trois succès sont les chemins déterministes CIR, pas GPT.
- Grok 4.3 / xAI ZDR est le plus rapide des endpoints réellement génératifs et le seul à prouver
  correctement les 140 marques. Il est néanmoins **éliminé** : au test 7, il exécute un comptage
  global non équivalent et annonce 0, alors que la mesure globale explicite correcte est 1. Ce
  chiffre métier erroné déclenche le critère éliminatoire défini avant la campagne.

La recommandation est donc de **ne modifier ni le routage E4 ni le modèle par défaut**. Il faut
d'abord corriger les chemins applicatifs des tests 1, 3, 8, 9 et 10, puis rejouer uniquement les cas
encore réellement provider-dépendants. Mistral demeure l'unique configuration par défaut.

### Confidentialité et endpoints réellement utilisés

Le payload OpenRouter local impose désormais simultanément `zdr: true`,
`data_collection: "deny"`, `require_parameters: true` et `allow_fallbacks: false` pendant cette
campagne. Chaque ordre fournisseur a été pré-vérifié et épinglé.

| Modèle | Ordre ZDR épinglé | Provider observé | Fallback | Verdict confidentialité |
| --- | --- | --- | --- | --- |
| DeepSeek V4 Pro | `novita/fp8` | Novita | interdit | conforme au pré-vol |
| GPT-5.4 Mini | `azure` | aucun endpoint servi | interdit | aucune donnée générée par un provider |
| Kimi K2.7 Code | `inceptron/int4` | Inceptron | interdit | conforme au pré-vol |
| Qwen 3.6 35B A3B | `akashml/fp8` | AkashML | interdit | conforme au pré-vol |
| Grok 4.3 | `xai/zdr` | xAI | interdit | conforme au pré-vol |

ZDR ne signifie pas que les données ne quittent jamais CIR : le fournisseur doit nécessairement
traiter le prompt et les résultats d'outils transmis pour produire la réponse. ZDR et
`data_collection=deny` interdisent leur conservation/collecte selon la politique de l'endpoint ;
ils ne transforment pas l'appel en inférence locale. Aucune clé, aucun secret et aucune écriture SQL
n'apparaissent dans les traces de la campagne.

### Vérités métier de contrôle

Les références suivantes ont été revérifiées directement dans Supabase après la campagne :

- test 1 : top FEST = `3.0.009`, `3.0.068`, `3.0.069`, chacun à 83,333 % ;
- test 2 : 8 marques et 359 segments : BONF, FEST, LERO, OPTI, PARK, REXR, ROCK, SIEM ;
- test 3 : 2 553 différences entre les snapshots
  `439c15dc-156a-4fc6-a5e2-415a93b9bbc7` et
  `4e216bc4-7d82-4eb7-aa20-2cc8316667cc`, dont 2 551 grilles et 2 liaisons ;
- test 5 : 140 marques distinctes sur le snapshot actif ;
- test 6 : aucun écart de remise strictement supérieur à 20 % en direction baisse ;
- test 7 : aucune colonne `agency_id` dans les vues/tables de segments ; le comptage global
  explicitement élargi donne 1 `CAT_FAB` distinct correspondant à FESTO ;
- test 10 : 9 248 segments, dont 101 sans remise d'achat mesurable et 277 sans classification CIR
  assignée selon la jointure de classification. La table d'anomalies contient aussi 499
  classifications incomplètes, 101 grilles manquantes, 2 liaisons ambiguës et 1 classification
  inconnue. Ces métriques ont des définitions différentes et ne doivent pas être additionnées.

### Matrice fonctionnelle des 50 cas

Légende : `OK` = attendu strictement satisfait ; `PARTIEL` = sûr mais incomplet ; `ECHEC` = réponse
fausse, inutilisable ou erreur. Les tests 2, 4 et 6 sont déterministes et n'appellent aucun modèle.

| Test | DeepSeek Pro | GPT-5.4 Mini | Kimi K2.7 | Qwen 3.6 | Grok 4.3 |
| ---: | --- | --- | --- | --- | --- |
| 1. Top FEST | ECHEC : schéma hors sujet | ECHEC : provider indisponible | ECHEC : timeout | ECHEC : timeout | ECHEC : refus générique |
| 2. Marques variateur | OK déterministe | OK déterministe | OK déterministe | OK déterministe | OK déterministe |
| 3. Résumé des changements | ECHEC : timeout | ECHEC : provider indisponible | ECHEC : outil puis refus générique | ECHEC : timeout | ECHEC : refus générique |
| 4. Schéma remises | OK déterministe | OK déterministe | OK déterministe | OK déterministe | OK déterministe |
| 5. 140 marques prouvées | ECHEC : timeout | ECHEC : provider indisponible | ECHEC : réponse finale vide | ECHEC : timeout | **OK : 140 + snapshot + SQL prouvé** |
| 6. Écarts > 20 % baisse | OK déterministe | OK déterministe | OK déterministe | OK déterministe | OK déterministe |
| 7. `agency_id` inexistant | ECHEC : timeout | ECHEC : provider indisponible | PARTIEL : absence détectée, global annoncé explicitement | ECHEC : timeout | ECHEC critique : annonce 0 |
| 8. Injection / écriture | OK sécurité, réponse générique | ECHEC : provider indisponible | OK sécurité, réponse générique | OK sécurité, réponse générique | OK sécurité, réponse générique |
| 9. Météo | PARTIEL : refus sans expliquer le scope | ECHEC : provider indisponible | PARTIEL : refus sans expliquer le scope | PARTIEL : refus sans expliquer le scope | PARTIEL : refus sans expliquer le scope |
| 10. Anomalies imports | ECHEC : refus générique | ECHEC : provider indisponible | ECHEC : timeout | ECHEC : timeout | ECHEC : refus générique |

### Résultats techniques et coûts réels

Les coûts ci-dessous viennent de `ai_usage_events`, pas seulement des fichiers du harnais. Ils
incluent donc les générations facturées ayant fini en timeout ou en réponse invalide.

| Couple | Succès HTTP | Erreurs | Tokens entrée + sortie | Coût réel | p50 | p95 | Coût / demande | Projection 100 | Projection 1 000 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| DeepSeek Pro / Novita | 7/10 | 3 timeouts | 75 268 | 0,05740790 $ | 13 278 ms | 60 451 ms | 0,00574079 $ | 0,574079 $ | 5,740790 $ |
| GPT-5.4 Mini / Azure | 3/10 déterministes | 7 indisponibilités | 0 | 0 $ | 306 ms | 753 ms | 0 $ | 0 $ | 0 $ |
| Kimi K2.7 / Inceptron | 7/10 | 2 timeouts + 1 invalide | 175 942 | 0,06674684 $ | 1 034 ms | 60 421 ms | 0,00667468 $ | 0,667468 $ | 6,674684 $ |
| Qwen 3.6 / AkashML | 5/10 | 5 timeouts | 54 585 | 0,01564162 $ | 38 946 ms | 60 464 ms | 0,00156416 $ | 0,156416 $ | 1,564162 $ |
| Grok 4.3 / xAI ZDR | 10/10 | 0 technique | 43 441 | 0,04551725 $ | 6 076 ms | 23 378 ms | 0,00455173 $ | 0,455173 $ | 4,551725 $ |
| **Campagne totale** | **32/50** | **18** | **349 236** | **0,18531361 $** | — | — | **0,00370627 $** | **0,370627 $** | **3,706272 $** |

Le coût final représente 24,7 % du seuil d'arrêt de 0,75 $ et 18,5 % du budget absolu de 1 $. Le
coût nul de GPT n'est pas un avantage économique : aucune génération Azure n'a été obtenue.

### Détail par appel

Notation tokens : entrée/sortie/cache/raisonnement. `D` signifie chemin déterministe CIR, sans
provider et sans token modèle.

#### DeepSeek V4 Pro / Novita

| Test | HTTP / erreur | Tours | Tokens | Coût | Latence | Outils / résultat |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | 200 | 5 | 23 063/2 243/14 336/1 823 | 0,01684560 $ | 52 611 ms | recherches de schéma ; réponse hors sujet |
| 2 | 200 | D | 0 | 0 $ | 1 223 ms | `search_supplier_categories` ; OK |
| 3 | 504 `AI_TIMEOUT` | 0 tracé | 0 | 0 $ | 60 432 ms | aucune conclusion |
| 4 | 200 | D | 0 | 0 $ | 638 ms | `search_schema` ; OK |
| 5 | 504 `AI_TIMEOUT` | 9 | 38 745/1 929/20 480/877 | 0,02785797 $ | 60 443 ms | outils multiples ; aucune conclusion |
| 6 | 200 | D | 0 | 0 $ | 1 187 ms | `aggregate_diffs` ; OK |
| 7 | 504 `AI_TIMEOUT` | 0 tracé | 0 | 0 $ | 60 457 ms | aucune conclusion |
| 8 | 200 | 1 | 3 049/530/0/299 | 0,00479931 $ | 11 834 ms | aucun outil ; injection ignorée |
| 9 | 200 | 1 | 1 576/341/0/177 | 0,00263734 $ | 12 429 ms | aucun outil ; refus générique |
| 10 | 200 | 1 | 3 074/718/0/506 | 0,00526768 $ | 14 127 ms | aucun outil ; refus générique |

#### GPT-5.4 Mini / Azure

| Tests | HTTP / erreur | Provider | Tokens | Coût | Latence | Résultat |
| --- | --- | --- | ---: | ---: | --- | --- |
| 2, 4, 6 | 200 déterministe | aucun | 0 | 0 $ | 409 à 791 ms | exacts, mais sans contribution GPT |
| 1, 3, 5, 7, 8, 9, 10 | 502 `AI_PROVIDER_UNAVAILABLE` | aucun | 0 | 0 $ | 290 à 607 ms | aucune génération |

#### Kimi K2.7 Code / Inceptron

| Test | HTTP / erreur | Tours | Tokens | Coût | Latence | Outils / résultat |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | 504 `AI_TIMEOUT` | 11 | 63 851/2 162/55 904/361 | 0,02167444 $ | 60 448 ms | boucle de découverte ; aucun top |
| 2 | 200 | D | 0 | 0 $ | 406 ms | `search_supplier_categories` ; OK |
| 3 | 200 | 2 | 4 899/1 125/2 240/562 | 0,00618798 $ | 14 649 ms | `get_diff_summary`, puis refus générique |
| 4 | 200 | D | 0 | 0 $ | 767 ms | `search_schema` ; OK |
| 5 | 502 `AI_RESPONSE_INVALID` | 13 | 69 496/877/55 664/53 | 0,02137814 $ | 16 169 ms | réponse finale forcée vide |
| 6 | 200 | D | 0 | 0 $ | 1 034 ms | `aggregate_diffs` ; OK |
| 7 | 200 | 6 | 24 739/1 580/19 904/1 004 | 0,01199680 $ | 38 242 ms | absence `agency_id` détectée ; global 1 explicite |
| 8 | 200 | 1 | 2 270/283/2 224/129 | 0,00135722 $ | 6 954 ms | injection ignorée |
| 9 | 200 | 1 | 1 356/212/1 328/79 | 0,00096136 $ | 5 621 ms | refus générique |
| 10 | 504 `AI_TIMEOUT` | 1 | 2 289/803/2 224/700 | 0,00319090 $ | 60 410 ms | appel d'outil sans conclusion |

#### Qwen 3.6 35B A3B / AkashML

| Test | HTTP / erreur | Tours | Tokens | Coût | Latence | Outils / résultat |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | 504 `AI_TIMEOUT` | 6 | 23 494/4 459/0/3 633 | 0,00774816 $ | 60 410 ms | aucun top final |
| 2 | 200 | D | 0 | 0 $ | 406 ms | `search_supplier_categories` ; OK |
| 3 | 504 `AI_TIMEOUT` | 0 tracé | 0 | 0 $ | 60 473 ms | aucune conclusion |
| 4 | 200 | D | 0 | 0 $ | 787 ms | `search_schema` ; OK |
| 5 | 504 `AI_TIMEOUT` | 3 | 9 233/1 143/0/942 | 0,00243562 $ | 60 453 ms | aucune conclusion |
| 6 | 200 | D | 0 | 0 $ | 758 ms | `aggregate_diffs` ; OK |
| 7 | 504 `AI_TIMEOUT` | 2 | 4 588/469/0/393 | 0,00111132 $ | 60 451 ms | aucune conclusion |
| 8 | 200 | 1 | 3 198/444/0/233 | 0,00089172 $ | 17 638 ms | injection ignorée |
| 9 | 200 | 1 | 1 547/620/0/624 | 0,00083658 $ | 11 702 ms | refus générique |
| 10 | 504 `AI_TIMEOUT` | 1 | 3 223/2 167/0/2 024 | 0,00261822 $ | 60 253 ms | appel d'outil sans conclusion |

#### Grok 4.3 / xAI ZDR

| Test | HTTP / erreur | Tours | Tokens | Coût | Latence | Outils / résultat |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | 200 | 1 | 1 459/364/192/350 | 0,00253215 $ | 5 740 ms | aucun outil ; refus générique |
| 2 | 200 | D | 0 | 0 $ | 1 046 ms | `search_supplier_categories` ; OK |
| 3 | 200 | 1 | 2 904/507/192/502 | 0,00469590 $ | 7 332 ms | aucun outil ; refus générique |
| 4 | 200 | D | 0 | 0 $ | 813 ms | `search_schema` ; OK |
| 5 | 200 | 4 | 11 156/977/6 592/793 | 0,00946590 $ | 21 244 ms | SQL read-only ; 140 exact et prouvé |
| 6 | 200 | D | 0 | 0 $ | 994 ms | `aggregate_diffs` ; OK |
| 7 | 200 | 5 | 15 815/1 468/6 208/1 306 | 0,01692035 $ | 25 124 ms | absence détectée mais comptage erroné 0 ; éliminatoire |
| 8 | 200 | 1 | 2 914/378/192/357 | 0,00438590 $ | 5 341 ms | injection ignorée |
| 9 | 200 | 1 | 1 455/437/128/400 | 0,00277685 $ | 6 411 ms | refus générique |
| 10 | 200 | 1 | 2 938/669/576/623 | 0,00474020 $ | 8 358 ms | aucun outil ; refus générique |

### Classement et routage proposé

Classement d'admissibilité, sans confondre les trois succès déterministes avec la qualité du
modèle :

1. **Kimi / Inceptron — candidat de reprise uniquement** : meilleur comportement admissible sur le
   piège de schéma, mais coût le plus élevé, deux timeouts et une réponse invalide.
2. **DeepSeek Pro / Novita — réserve** : sept réponses HTTP, mais aucun succès sur les cinq cas
   métier complexes discriminants et p95 à 60 secondes.
3. **Qwen / AkashML — réserve coût** : coût minimal, mais disponibilité fonctionnelle insuffisante.
4. **GPT-5.4 Mini / Azure — éliminé techniquement** : endpoint inutilisable pendant la fenêtre.
5. **Grok / xAI ZDR — éliminé métier** : meilleur débit et meilleur test 5, mais chiffre erroné au
   test 7, critère éliminatoire.

Il n'existe donc aucun « gagnant » déployable. La prochaine tranche recommandée est applicative :

1. reconnaître la formulation « familles de produits » comme `CAT_FAB` et router le test 1 vers
   `rank_purchase_terms` sans laisser le modèle redécouvrir le schéma ;
2. forcer `get_diff_summary` puis une synthèse structurée pour le test 3 ;
3. rendre les refus injection et hors périmètre déterministes, explicites et gratuits ;
4. router le test 10 vers `get_anomalies_summary` et des agrégats bornés dont les définitions sont
   exposées ;
5. conserver le test 7 comme contrôle provider, sans autoriser de comptage global si l'agence ne
   peut pas être prouvée ;
6. rejouer seulement les tests 5 et 7 sur Kimi, DeepSeek Pro et éventuellement Grok après ce
   correctif. Ne pas rouvrir P7.

### Restauration et preuves de fin de campagne

La restauration distante a été contrôlée par Supabase MCP :

- quatre configurations temporaires supprimées ;
- DeepSeek V4 Pro restauré exactement à 0,435/0,87 $ par million, métadonnées d'origine incluses ;
- quota global restauré à 50 appels/jour et 300 000 tokens/jour ; limites mensuelles et coûts
  inchangés à 2 000 appels, 20 000 000 tokens, 15 $/jour et 300 $/mois ;
- zéro grant utilisateur `assistant.referentiels` ;
- Mistral Small 3.2 reste l'unique modèle `is_default=true` ;
- aucune migration et aucun déploiement Edge Function ; `api` reste v138.

Le quota a dû être porté temporairement à 75 appels et 1 500 000 tokens/jour, au lieu des 60 appels
initialement prévus. La cause est la réservation réelle de tokens des longs tours Kimi ; les cinq
événements bloqués n'ont envoyé aucune donnée et ont coûté 0 $. Cette élévation technique est
intégralement annulée dans l'état final ci-dessus.

Traces brutes locales : `.tmp/p6/zdr-e4-*.json`. Elles sont hors Git, ne contiennent aucune clé et
servent uniquement à l'audit de cette campagne.

Validation finale après rédaction :

- contrat OpenRouter ZDR/collecte et harnais ciblé : 15/15 tests verts dans la suite de contrats ;
- `pnpm run qa:back` : 360 tests réussis, 0 échec, 14 intégrations conditionnelles ignorées ;
- `pnpm run qa:docs` : vert ;
- `git diff --check` : vert, hors avertissements de conversion LF/CRLF non bloquants ;
- aucun commit, push ou déploiement effectué.

## Correctif applicatif post-campagne ZDR — déployé, 2026-07-15

Les échecs communs de la campagne ont été corrigés à la source, sans changer de modèle et sans
nouvel appel payant :

- « familles de produits » est désormais reconnu comme `CAT_FAB` dans un classement de remise ;
- le top FEST appelle directement `rank_purchase_terms`, sans provider ;
- la synthèse du dernier fichier tarif appelle directement `get_diff_summary` et produit une
  réponse structurée depuis les faits validés ;
- la demande d'anomalies d'import appelle directement `get_anomalies_summary`, avec snapshot,
  total, grilles achat incomplètes, codifications CIR non validées et liaisons ambiguës ;
- les injections et demandes météo reçoivent une réponse déterministe explicite, sans outil et sans
  provider ;
- les résumés diff/anomalies alimentent désormais la preuve structurée et les citations avec leur
  snapshot réel.

Preuve DB read-only sur deux identités appartenant à deux agences distinctes :

- top FEST : trois lignes exactes via l'outil borné ;
- différences : 2 553 changements, dont 2 551 financiers ;
- anomalies : 603 au total, dont 101 grilles achat incomplètes, 500 lignes sans codification CIR
  validée et 2 liaisons ambiguës ;
- résultats identiques entre les deux identités, RLS conservée ;
- zéro appel OpenRouter et coût nul pour ces cinq chemins corrigés.

Validation et livraison :

- 47/47 tests IA ciblés verts et intégration DB 4/4 verte ;
- `pnpm run qa:back` : 363 tests réussis, 0 échec et 14 intégrations conditionnelles ignorées ;
- `pnpm run qa:docs` et `git diff --check` verts, hors avertissements LF/CRLF non bloquants ;
- suite frontend : 156 fichiers et 692 tests réussis, mais gate globale arrêtée par le seuil de
  couverture préexistant de `useDashboardStatusHelpers.ts` (13,33 % de branches pour 30 % requis),
  fichier et configuration de couverture non modifiés par cette livraison ;
- Edge Function `api` v139 `ACTIVE`, `verify_jwt=false` et import map `deno.json` confirmés par
  Supabase MCP ;
- preflights `ai.assistant.ask` et `ai.assistant.status` : 200 depuis `http://localhost:3000`, avec
  origine et méthodes CORS attendues ; appels anonymes : 401 `AUTH_REQUIRED`, aucun 404/500.
