# Rapport d'évaluation des modèles — P6

Date : 2026-07-14
Statut : **EN COURS après correction P3-bis**
Commit évalué : `af40d5c83e1846e79ba6b01f17aabe321eb07dcb` + worktree P6 non commité
Projet Supabase : `rbjtrcorlezvocayluok`
Edge Function : `api` v127, `ACTIVE`, `verify_jwt=false`
Snapshot : `4e216bc4-7d82-4eb7-aa20-2cc8316667cc`

## Décision

Les smoke tests initiaux ne départagent pas les modèles : ils ont tous reçu à tort un cas qui
devait rester déterministe. Le défaut de routage P3 a été corrigé et vérifié en direct. Les
résultats provider ci-dessous sont conservés comme diagnostic historique, mais ne constituent
plus un motif de disqualification. La campagne 10/20 doit être rejouée sur les seuls cas réellement
provider-dépendants avant toute sélection. Le modèle actif initial
`mistralai/mistral-small-3.2-24b-instruct` reste restauré.

## Vérités métier revérifiées en lecture seule

- FEST : 673 lignes segment et 673 `CAT_FAB` distinctes ;
- ROCK avec `CAT_FAB_L ILIKE '%drive%'` : 234 lignes ;
- marques `variateur` ou `drive` : BONF, FEST, LERO, OPTI, PARK, REXR, ROCK, SIEM ;
- total : 140 marques distinctes.

## Politique OpenRouter effective

Le payload déployé impose :

- `require_parameters: true` ;
- `allow_fallbacks: false` ;
- `data_collection: deny` ;
- `zdr: true`.

Pour les trois smoke tests, le modèle demandé est égal au modèle servi et le provider servi est
persisté dans `ai_usage_events.metadata.provider_rounds`. Exacto n'a pas été testé : sa
compatibilité ZDR effective n'a pas été démontrée et le routage standard échoue déjà.

## Résultats smoke avant correction P3-bis

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

## Répétitions et métriques

- répétitions live réellement exécutées : un smoke provider par candidat, plus un smoke
  déterministe FEST ;
- campagne obligatoire 10/20 : non exécutée, car aucun candidat n'a passé le smoke ;
- p50/p95 et coût par réponse correcte : non calculables honnêtement sur un seul échec par
  candidat ;
- isolation live deux agences/deux identités : non exécutée après disqualification des trois
  candidats ; les tests offline d'injection de deux identités restent verts.

## Configuration et restauration

- avant : Mistral Small 3.2 actif et par défaut ;
- GPT-OSS et DeepSeek Flash : configurations temporaires créées successivement ;
- après chaque lot : un seul modèle par défaut ;
- fin : configurations temporaires supprimées, Mistral Small 3.2 restauré ;
- clé OpenRouter : non modifiée et jamais journalisée ;
- migration : aucune.

## Validation

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

Rejouer les candidats sur des cas réellement provider-dépendants, puis lancer la matrice 10/20
pour les candidats qui franchissent ces nouveaux smoke tests. Le cas de clarification corrigé
reste un contrôle architectural déterministe et ne doit plus servir à départager les modèles.
