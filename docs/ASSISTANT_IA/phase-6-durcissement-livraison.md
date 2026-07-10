# Phase 6 — Durcissement, coûts, sécurité & livraison

> Prérequis : toutes les phases 1 à 5 terminées (lire tous les changelogs). Lire `00-plan-general.md`.
> Périmètre : transverse (backend + frontend + docs). Gate QA : `pnpm run qa` complet + runbook.
> Objectif : rendre l'assistant sûr à exploiter (budget, abus, rétention, latence) et le livrer
> proprement (QA complète, doc, déploiement Edge Function).

## 1. Spécification détaillée

### 1.1 Rate limiting & anti-abus

- Brancher l'assistant sur le rate limit centralisé
  (`backend/functions/api/services/rate-limiting/rateLimit.ts`) :
  limite d'appels `ai.assistant.ask` par utilisateur/fenêtre, en plus des quotas coût/tokens.
- Vérifier les bornes de la boucle (MAX_TOOL_ROUNDS, timeout 60 s, plafond 50 lignes/outil)
  livrées en phase 1 ; ajouter un plafond de **tokens d'entrée total** par requête (historique +
  contexte + résultats d'outils) pour éviter l'explosion de coût sur longue conversation.
- Garde anti-boucle : détecter un même outil rappelé à l'identique plusieurs fois (fan-out) et
  couper.
- Revalider l'admission atomique/idempotente livrée en phase 1 avec un test concurrent : au moins
  20 requêtes simultanées sur un même périmètre proche de la limite ne dépassent jamais le nombre
  admis ; plusieurs appels avec le même `client_request_id` produisent au plus un appel provider.
- Purger/réconcilier les réservations expirées après crash/timeout et indexer les chemins chauds
  des quotas/usages (`feature`, scope user/agence, statut, `created_at`) d'après `EXPLAIN`, sans
  ajouter d'index spéculatif.

### 1.2 Alertes budget

- Seuils de coût (jour/mois) configurables : quand la conso approche/atteint un seuil, exposer
  un signal consommé par la Vue d'ensemble admin (phase 5) et, si un mécanisme de notification
  interne existe (`notifyError`/canal admin), émettre une alerte. Ne pas inventer un canal
  externe non demandé.
- S'appuyer sur `ai_usage_events` (déjà la source de vérité du coût réel).

### 1.3 Rétention & confidentialité

- Politique de rétention des `ai_usage_events` et des traces d'outils : définir une durée et
  un job de purge (cohérent avec l'infra existante — `pg_cron` si déjà utilisé, sinon tâche
  documentée). Trancher la durée avec le PO (proposition : 90 j détaillé, agrégats conservés).
- Définir séparément le TTL court des réservations et enveloppes de réponse d'idempotence ; purger
  les réservations expirées et ne jamais transformer ce mécanisme en historique de conversation.
- Vérifier qu'aucune donnée sensible superflue n'est stockée dans les traces (les `arguments`
  d'outils et résultats peuvent contenir des références produits/clients — minimiser ce qui est
  persisté ; ne stocker que ce qui sert l'audit).
- Vérifier la configuration OpenRouter finale : routage provider, politique `data_collection`
  ou option ZDR si disponible pour le modèle retenu, et absence d'envoi de données brutes non
  nécessaires au LLM. Si le modèle choisi ne permet pas une politique de confidentialité
  suffisante, consigner le risque et proposer un modèle/provider alternatif avant livraison.
- Vérifier `require_parameters:true`, la politique de fallback et la journalisation de l'ID de
  génération, du modèle/provider réellement servi et des finish reasons. Aucun retry aveugle
  après une réponse potentiellement facturée.
- Confirmer : aucune clé API en clair nulle part ; `verify_jwt=false` reste un choix documenté
  (auth gérée en code) — ne pas y toucher sans décision explicite.

### 1.4 Latence & décision SSE (réévaluation D4)

- Mesurer la latence réelle des questions cibles (p50/p95) d'après `ai_usage_events`.
- Si acceptable (< ~10-15 s p95) : garder le mode mutation non-streaming, clore la question.
- Sinon : décider et documenter le passage au streaming SSE (endpoint Hono dédié dans l'Edge
  Function `api`, le front bascule sur un flux). **Ne l'implémenter que si les mesures le
  justifient.** Consigner la décision et les chiffres.

### 1.5 Tests de sécurité IA

- Prompt injection documentaire : vérifier qu'un contenu hostile dans les données (ex. un
  libellé de produit disant « ignore tes règles ») ne fait pas sortir le modèle de son cadre
  ni déclencher d'outil non autorisé. Les outils étant en lecture seule et bornés, l'impact est
  limité, mais tester le refus.
- Vérifier l'isolation `agency_id` de bout en bout : un membre d'une agence ne peut jamais, via
  l'assistant, obtenir les données d'une autre agence (test avec deux contextes).
- Vérifier que le refus d'accès (phase 4) et le dépassement de quota renvoient des états propres,
  pas des fuites d'information.

### 1.6 Évaluations métier et non-régression

Créer une suite d'évaluations versionnée, séparée des tests unitaires ordinaires :

- cas déterministes sur fixtures contrôlées : les 4 questions PO + variantes ambiguës, jeu sans
  résultat, alias de marque, bruit d'arrondi, résultat tronqué, outil en erreur et tentative
  d'injection dans une donnée ;
- attentes machine-checkables : outil(s) attendu(s), arguments essentiels, chiffres/groupes
  exacts issus du backend, citations correspondant uniquement aux outils exécutés, absence de
  donnée inter-agence et respect des plafonds ;
- exécution sans réseau avec provider simulé pour la CI, puis campagne live explicite avec la clé
  OpenRouter de développement sur chaque modèle candidat (au moins 3 répétitions par cas pour
  mesurer la variabilité) ;
- rapport versionné dans le changelog : taux de réussite factuelle, erreurs de tool calling,
  latence p50/p95, tokens et coût par question, modèle **et provider** réellement servis ;
- seuil de livraison : zéro chiffre inventé, zéro fuite inter-agence, zéro outil non autorisé,
  100 % des agrégats critiques exacts. Toute régression bloque un changement de modèle, prompt,
  contrat d'outil ou politique de routage.

La campagne live n'entre pas dans la CI si elle exige un secret/réseau ; elle devient une probe
conditionnelle documentée dans `docs/qa-runbook.md`. Conserver Chat Completions en v1. La Responses
API OpenRouter étant encore en bêta au 2026-07-10, toute migration future exige un plan et la
requalification complète de cette suite.

### 1.7 Documentation

- `docs/qa-runbook.md` : ajouter une section « Assistant IA » (probes conditionnelles : contrats
  ai.assistant/access, migration grants, points de sécurité à revérifier avant livraison).
- `docs/LOGIQUE_REMISE_CIR/cahier-des-charges/METIER/08-intelligence-artificielle.md` : noter
  que IA-7 est livré en version conversationnelle et référencer ce plan.
- Documenter la commande des évaluations offline et de la campagne live, leurs secrets requis,
  seuils de réussite et format de rapport. Préparer les faits d'architecture consommés par le
  skill durable de la phase 7 ; ne pas créer ce skill avant que le code final fasse foi.
- Consigner les faits durables réellement livrés dans les docs/changelogs et les transmettre à la
  phase 7 ; aucune mémoire externe ne doit devenir une source de vérité implicite.

### 1.8 Déploiement (uniquement sur demande explicite de l'utilisateur)

- Suivre la procédure Edge Function du repo : source `backend/functions/api/`, wrapper
  `supabase/functions/api/index.ts`, import map `deno.json` racine, `verify_jwt=false`.
- Commande de référence : `supabase functions deploy api --project-ref <ref> --use-api
  --import-map deno.json --no-verify-jwt`.
- Après déploiement : vérifier via Supabase MCP `list_edge_functions`, tester `ai.assistant.ask`
  et le préflight CORS ; confirmer la présence de la clé/config provider côté projet lié.

## 2. Checkpoints à valider

- [ ] Rate limit `ai.assistant.ask` branché + plafond tokens + garde anti-fan-out ; test concurrent prouve quota atomique et idempotence ; réservations expirées gérées.
- [ ] Alertes budget (seuils jour/mois) exposées à l'admin ; source = `ai_usage_events`.
- [ ] Politique de rétention + purge des usages/traces définie et en place ; minimisation des traces vérifiée.
- [ ] Politique OpenRouter/provider vérifiée (`require_parameters`, fallback, data_collection/ZDR, modèle compatible tools, génération/provider/finish reasons auditables).
- [ ] Aucune clé en clair ; isolation `agency_id` testée bout-en-bout (2 agences) ; refus accès/quota propres.
- [ ] Test prompt injection documentaire : le modèle reste dans son cadre, pas d'outil non autorisé.
- [ ] Suite d'évaluations versionnée : offline déterministe verte + campagne live comparée ; seuils exactitude/sécurité/coût/latence respectés.
- [ ] Latence mesurée (p50/p95) ; décision streaming SSE tranchée et documentée (implémentée seulement si justifiée).
- [ ] `docs/qa-runbook.md` section Assistant IA ajoutée ; cahier des charges IA-7 et faits d'architecture durables à jour pour la phase 7.
- [ ] `pnpm run qa` complet vert.
- [ ] (Si demandé) Déploiement Edge Function `api` effectué et vérifié (list_edge_functions, ask, CORS).

## 3. Prompt d'exécution (à coller dans une conversation neuve)

```
Tu travailles sur le repo CIR Cockpit (C:\GitHub\CIR_Cockpit\CIR-Cockpit). Tâche : implémenter
la Phase 6 du chantier Assistant IA (durcissement, coûts, sécurité, livraison).

Avant tout code :
1. Lis AGENTS.md puis invoque le skill cir-cockpit-agent-router.
2. Lis docs/ASSISTANT_IA/00-plan-general.md.
3. Lis les changelogs des phases 1 à 5 (état réel livré : bornes de la boucle, contrats, UI
   admin, accès membres). Le code fait foi.
4. Lis docs/ASSISTANT_IA/phase-6-durcissement-livraison.md : c'est ta spécification.
5. Comme c'est une phase de livraison, lis docs/qa-runbook.md. Invoque les skills
   cir-cockpit-qa-validation, systematic-debugging (si un test échoue), cir-error-handling.
   MCP Supabase pour rétention/purge et déploiement.
6. `git status --short` — ne touche pas aux modifications qui ne sont pas les tiennes.

Lis le code réel avant d'éditer :
- backend/functions/api/services/rate-limiting/rateLimit.ts (rate limit central à réutiliser)
- backend/functions/api/services/ai/assistantBroker.ts (bornes de la boucle, coût, usage)
- backend/functions/api/services/ai/aiGovernance.ts (recordUsage, computeCost)
- infra de purge existante (pg_cron ?), notifyError / canal admin
- configuration provider/model livrée en phase 1 (tool calling, routage OpenRouter, politique data)

Implémente les sections 1.1 à 1.7. Pour la latence (1.4), MESURE avant de décider le SSE : ne
l'implémente que si p95 le justifie, et documente la décision avec les chiffres. Tests de
sécurité (1.5) : isolation agency_id sur 2 contextes, prompt injection, refus accès/quota.
Construis ensuite la suite d'évaluations de 1.6 : offline reproductible et campagne OpenRouter
live conditionnelle, avec seuils bloquants et rapport modèle/provider/coût/latence.
Contraintes habituelles : Zod .strict() FR, erreurs via httpError/createAppError, aucun mock dans
le code applicatif et aucun TODO livré (le provider simulé reste limité aux tests), minimisation
des données persistées dans les traces, politique provider explicitement validée avant livraison.

Mets à jour docs/qa-runbook.md (section Assistant IA), le cahier des charges IA-7 et les faits
d'architecture destinés à la phase 7. Lance `pnpm run qa` COMPLET jusqu'au vert (lis le runbook
pour les probes conditionnelles).

Déploiement : NE DÉPLOIE PAS sans que l'utilisateur le demande explicitement. S'il le demande,
suis la procédure Edge Function (source backend/functions/api, wrapper supabase/functions/api,
import map deno.json racine, verify_jwt=false) et vérifie via Supabase MCP après coup.

Quand tout passe : coche les checkpoints, remplis le changelog de la phase 6, marque le chantier
comme livré dans le tableau de suivi (§8) de 00-plan-general.md.
```

## 4. Notes de risque

- La décision SSE doit être pilotée par la mesure, pas par principe : ne pas ajouter de
  complexité de streaming si la latence non-streaming est acceptable.
- La purge ne doit pas supprimer les agrégats de coût nécessaires au suivi budgétaire : purger
  le détail, garder les agrégats si besoin.
- Le déploiement est une action sortante et irréversible côté projet lié : uniquement sur
  demande explicite, avec vérification post-déploiement.

## 5. Changelog

<!-- À remplir en fin de phase. -->

_(vide — phase non encore exécutée)_
