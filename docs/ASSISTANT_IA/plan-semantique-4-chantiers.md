# Plan d'exécution — Assistant sémantique : 4 chantiers

- Date de rédaction : 2026-07-20
- Auteur : Claude, sur diagnostic runtime du 2026-07-20 validé par sondes SQL en lecture seule
- Statut : en cours — CP-C1 validé ; CP-C2 implémenté et prouvé, décision PO en attente ; activation model-first maintenue en NO-GO
- Document parent : `docs/ASSISTANT_IA/plan-mistral-assistant-transversal.md` (le « plan directeur »)
- Position : continuation directe du checkpoint ouvert `CP-P5-SEMANTIC-PLANNER` (GO contrôlé, NO-GO P5 global) plus une version minimale du registre de capacités P4 pour le routage

---

## 1. Pourquoi ce plan

Le planificateur sémantique en deux passes fonctionne en production depuis le 2026-07-20 (flag `AI_ASSISTANT_SEMANTIC_PLANNER_ENABLED=true`, Edge Function `api` v188, cas d'ancrage vérins et variateur verts). Deux questions PO du jeu réel échouent pourtant de façon structurelle, pas accidentelle :

1. « Quelles marques proposent des débitmètres ? » — routage correct vers le planificateur, mais recherche incapable de trouver la famille réelle.
2. « Combien de familles produit à la CIR proposent des servomoteurs électriques ? » — n'atteint jamais le planificateur, part en clarification en conserve « FAM ou CAT_FAB ? » dont une branche répond « pas encore disponible ».

### 1.1 Preuves mesurées (snapshot `a687848e-cc1a-4f31-a6a9-c01f653e7cd5`)

| Fait | Valeur | Conséquence |
| --- | --- | --- |
| Volume vue `ai_v_product_semantics` | 9 314 lignes, 140 marques, 6 657 CAT_FAB distincts | Petit volume, aucune contrainte d'index |
| Chemins CIR distincts | **327** | L'arbre entier tient dans un prompt (≈ 3-4K tokens) |
| Débitmètres réels | `FLUIDES PROCESS > CONTROLE ET MESURE > DEBIT` : 23 CAT_FAB, 5 marques ; libellé terminal « DEBIT » | Le mot « débitmètre » n'apparaît dans aucun libellé de la branche |
| Libellés CAT_FAB contenant « débitmètre » | 1 seul (« Capteurs/débitmètres », PARK, sous `HYDRAULIQUE > FILTRES > MONITORING`) | La recherche lexicale exacte trouve 1 marque au lieu de 5 |
| Servomoteurs électriques | « SERVOMOTEURS ELECTRIQUES Pieces detachees » (SPIR) sous `ROBINETTERIE > VANNES DE RÉGULATION` ; cousin sémantique `AUTOMATISME > VARIATEURS, SERVO-VAR` | Ambiguïté réelle actionneur de vanne / servo-variateur : cas idéal de clarification |
| CAT_FAB purement numériques | 754 | Bruit lexical assumé, la taxonomie est le signal fiable |
| Erreurs runtime récentes (`ai_usage_events`) | `AI_RESPONSE_INVALID` « La qualification sémantique ne couvre pas exactement les groupes candidats », `AI_PROVIDER_CONTRACT_INVALID` | Une réponse provider mal formée devient un 502 utilisateur sans tour de réparation |

### 1.2 Causes structurelles

1. **Le routeur regex est le gardien de l'intelligence.** `parseAssistantReferenceIntent` (470 lignes de regex françaises) décide seul quelles questions atteignent Mistral. « Famille produit » n'est reconnu comme synonyme de CAT_FAB que dans une seule regex ; « à la CIR » (l'entreprise) n'est pas modélisé.
2. **Le chercheur est aveugle à la taxonomie.** La passe 1 demande à Mistral des équivalents lexicaux exacts sans jamais lui montrer l'espace des libellés. Le prompt interdit les hyperonymes dans `positive_terms` (correctif variateur), ce qui interdit « débit » ; `classification_hints` est contractualisé mais jamais lu par le SQL. Le correctif variateur et le cas débitmètre sont lexicalement contradictoires : seule la taxonomie visible résout les deux.
3. **Zéro tolérance lexicale.** LIKE strict partout. Le chemin déterministe `search_supplier_categories` cherche la phrase littérale entière : « servomoteur electrique » au singulier ne matche pas « SERVOMOTEURS ELECTRIQUES ». `pg_trgm` est installé mais inutilisé.
4. **Les violations de contrat remontent en 502.** Aucune auto-réparation quand la partition acceptés/exclus est incomplète.
5. **La présentation est un template dense.** UUID de snapshot inline, énumération des marques sur une ligne, alors que `AssistantMessageContent.tsx` sait déjà rendre titres et puces markdown.

---

## 2. Position par rapport au plan directeur

### 2.1 Conformité aux décisions verrouillées (§11.1)

Ce plan respecte toutes les décisions verrouillées : Mistral direct, outils et preuves conservés, lecture seule, recomptage backend, recherche structurée et FTS **avant** toute vectorisation (aucun embedding introduit ici), erreurs via le catalogue CIR, livraison par briques avec checkpoints.

L'arbre CIR injecté en passe 1 n'est ni le schéma complet ni le catalogue complet (non-objectifs §1.2 du plan directeur) : c'est une surface sémantique bornée de 327 libellés de classification, versionnée par snapshot.

### 2.2 Amendements à consigner dans le plan directeur

Deux écarts assumés, à inscrire dans le plan directeur au démarrage du chantier concerné, jamais en silence :

1. **Chantier 2 — routage.** Le plan directeur (§4.1, §4.2) place le routeur d'intention déterministe en gardien universel L0. L'amendement : le routeur regex devient un fast-path (refus sécurité, hors-scope, questions structurelles exactes à zéro token) ; toute autre question passe par une passe de compréhension Mistral avec choix forcé parmi les capacités typées. C'est l'application du principe §4.1 (« le modèle reçoit un contexte minimal lui permettant de choisir une capacité ») que l'implémentation actuelle ne réalise pas.
2. **Chantier 4 — budget d'appels.** `CP-P5-SEMANTIC-PLANNER` consigne « deux appels provider maximum ». L'amendement : troisième appel autorisé uniquement comme tour de réparation après violation de contrat de qualification, tracé comme tel dans les métadonnées d'usage.

### 2.3 Rattachement des chantiers

| Chantier | Rattachement plan directeur |
| --- | --- |
| 1 — Taxonomie visible | Phase 5 (couche sémantique), continuation directe de CP-P5-SEMANTIC-PLANNER |
| 2 — Routage model-first | Phase 4 minimale (registre de capacités) + amendement §4.2 |
| 3 — Tolérance lexicale | Phase 5 (« FTS, trigram et index adaptés ») |
| 4 — Clarifications, présentation, réparation | Phase 5 (checkpoint « les dix questions trouvent la bonne surface ou demandent une clarification ») + §4.8 (récupération) |

---

## 3. Non-objectifs

- Aucun embedding, aucune base vectorielle (décision verrouillée : seulement après un taux d'échec mesuré de la recherche structurée).
- Aucune écriture métier, aucun élargissement du périmètre SQL lisible.
- Aucun changement de provider ni de modèle par défaut (`mistral-large-2512` reste épinglé ; la rétrogradation Small est une décision P8 sur évaluations).
- Aucune refonte du broker au-delà des points nommés ; la décomposition structurelle reste la phase 3.
- Aucun dictionnaire produit/marque codé en dur en production (règle générique déjà actée au CP-P5) ; les noms de produits ne vivent que dans les jeux de régression.

---

## 4. Règles communes d'exécution

- **Un chantier = une conversation vierge = un checkpoint.** Aucun chantier suivant sans GO PO du précédent.
- Chaque chantier reste derrière `AI_ASSISTANT_SEMANTIC_PLANNER_ENABLED` (chantiers 1, 3, 4) ; le chantier 2 introduit son propre flag `AI_ASSISTANT_MODEL_ROUTING_ENABLED` pour un rollback indépendant.
- Preuve runtime obligatoire au format du plan directeur : demande, tokens entrée/sortie/cache, latence, coût, groupes inspectés/acceptés/exclus, recomptage SQL témoin.
- QA par impact : tests Deno ciblés (`assistantIntentRouting_test.ts`, `assistantSemanticPlanner_test.ts`, `assistantConversationContext_test.ts`, `assistantSemanticTools_test.ts`, `mistralAdapter_test.ts`) puis `pnpm run qa:back` ; `qa:fast` si `shared/` est touché ; `qa:front` si l'UI est touchée.
- Déploiement : `supabase functions deploy api --project-ref <project_ref> --use-api --import-map deno.json --no-verify-jwt`, puis probes `OPTIONS 200`, `POST` sans Bearer `401 AUTH_REQUIRED`, appel UI authentifié `200`.
- Rollback : flag à `false` ; les chemins déterministes existants restent disponibles.
- Prompts : toute évolution du prompt publié `assistant.referentiels` passe par une migration qui archive la version courante et publie la suivante avec `change_note` explicite (motif `PROTOCOLE DE RECHERCHE PRODUIT SEMANTIQUE`, marqueur unique conservé).

---

## 5. Chantier 1 — Donner des yeux au planificateur (taxonomie visible)

**Objectif :** la passe 1 voit l'arbre CIR du snapshot et sélectionne des branches par sens, en plus des variantes lexicales pour les libellés CAT_FAB hors branche. Corrige le cas débitmètres sans casser le correctif variateur.

### 5.1 Travaux

1. **Requête taxonomie** dans `referenceProductSemantics.ts` : liste des `cir_path` distincts du snapshot avec `count(distinct normalized_cat_fab)` et `count(distinct marque)` par chemin, triée, bornée à 400 chemins et 24 Ko (au-delà, erreur explicite — le jour où la taxonomie explose, la compression devient un chantier dédié).
2. **Contrat de plan étendu** dans `assistantSemanticPlanner.ts` : `productSearchPlanSchema` gagne `selected_paths` (chemins CIR exacts choisis parmi la liste fournie, max 12) ; `classification_hints` est supprimé du contrat (paramètre mort) ou recâblé comme alias de `selected_paths` — décision au moment du code, une seule des deux formes survit.
3. **Passe 1 enrichie** : le message utilisateur de planification embarque la question et l'arbre compact (une ligne par chemin : `chemin | nb CAT_FAB | nb marques`). Le prompt v11 explique : choisir les branches qui désignent le produit (le libellé terminal fait foi, règle de portée du CP-P5 conservée), fournir en plus des variantes lexicales pour attraper les libellés CAT_FAB isolés hors branche.
4. **Validation serveur** : `selected_paths` doit être un sous-ensemble strict de la liste fournie (comparaison exacte après normalisation d'espaces) ; tout chemin inconnu invalide la passe.
5. **Construction des candidats** : groupes `classification_scope` issus de `selected_paths` en priorité, puis groupes lexicaux (`direct_label` et scopes lexicaux actuels) issus de `positive_terms`, union bornée aux 80 groupes et 64 Ko existants. La passe 2 de qualification et le recomptage `aggregateQualifiedProductGroups` sont inchangés.
6. **Prompt v11** par migration : retirer l'interdiction qui force les hyperonymes hors de la recherche (elle devient inutile : les termes larges vivent dans la sélection de branches), conserver la règle de portée par libellé terminal et la règle anti-famille-parente.

### 5.2 Fichiers touchés

- `backend/functions/api/services/pricing/references/referenceProductSemantics.ts`
- `backend/functions/api/services/ai/assistantSemanticPlanner.ts` (+ test)
- `backend/migrations/<ts>_ai_product_semantic_taxonomy_pass.sql` (prompt v11)
- `shared/schemas/aiAssistant.schema.ts` uniquement si le contexte conversationnel doit porter les chemins sélectionnés (a priori non : `accepted_selections` les porte déjà)

### 5.3 Budget

- Entrée passe 1 : +3 à 4K tokens (taxonomie) ; entrée passe 2 réduite quand les branches remplacent des dizaines de groupes lexicaux bruités. Cible initiale : ≤ 10K tokens entrée par question, coût médian ≤ 0,01 USD, latence ≤ 20 s.
- Budget réel mesuré au CP-C1 et entériné par le PO le 2026-07-20 : ~22-24K tokens d'entrée par question (la taxonomie reste dans l'historique des deux passes), coût 0,0115-0,0143 USD, latence 14-28 s. Quota journalier `assistant.referentiels` relevé durablement de 300K à 1 000 000 tokens sur la même décision (garde-fou coût journalier 15 USD et plafond mensuel 20M inchangés).
- Toujours 2 appels provider maximum.

### 5.4 Checkpoint CP-C1

- [x] « Quelles marques proposent des débitmètres ? » retourne les 5 marques de la branche DEBIT plus PARK (label direct), sans clarification bloquante, avec recomptage SQL témoin identique.
- [x] Le cas d'ancrage vérins pneumatiques reste vert (75 couples / 5 marques, identique CP-P5). Variateur : 6 marques sans PHOE, 308 couples au lieu de 305 (+4 labels « servo drives » réels de la branche DIVERS qualifiés individuellement, −1 label armorstart) — 308/6 sans PHOE validé par le PO le 2026-07-20 comme nouveau total d'ancrage, snapshot inchangé.
- [x] Aucun chemin hors liste accepté par la validation serveur (test unitaire), chemins résiduels (DIVERS/AUTRES) rétrogradés structurellement (test unitaire).
- [x] Budget tokens/coût/latence consigné et entériné par le PO le 2026-07-20 (~22-24K entrée par question, §5.3 amendé, quota journalier porté à 1M tokens).
- [x] Décision PO : GO le 2026-07-20.

### 5.5 Prompt de lancement (conversation vierge)

> Lis `docs/ASSISTANT_IA/plan-semantique-4-chantiers.md` (chantier 1) et la section CP-P5-SEMANTIC-PLANNER de `docs/ASSISTANT_IA/plan-mistral-assistant-transversal.md`. Implémente le chantier 1 exactement dans son périmètre : requête taxonomie bornée, `selected_paths` validés serveur, passe 1 enrichie, prompt v11 par migration, tests ciblés puis `qa:back`. Ne touche ni au routage regex ni aux templates de réponse. Termine par la preuve runtime UI du cas débitmètres et remplis CP-C1.

---

## 6. Chantier 2 — Routage model-first (l'IA comprend la question)

**Objectif :** plus aucune question légitime n'est bloquée par une regex. Le modèle comprend « famille produit » = CAT_FAB, « la CIR » = l'entreprise, et choisit la capacité ; les regex ne servent plus qu'aux fast-paths exacts.

### 6.1 Travaux

1. **Carte de domaine** compacte (constante versionnée côté backend, pas un prompt DB séparé) : vocabulaire métier — CAT_FAB = famille produit du fabricant (synonymes : famille produit, catégorie fabricant, gamme) ; FAM/FAM_LIB = famille de la classification interne CIR ; CIR = l'entreprise (distributeur) ; marque = fournisseur ; snapshot = version des référentiels — plus la liste des capacités disponibles avec une ligne de description chacune.
2. **Outil de routage** `classify_assistant_request` (schéma Zod strict) : `intent` (enum des intentions existantes), `terms` normalisés, `marques` détectées, `needs_clarification` avec question et options réelles. Une passe Mistral, `tool_choice` forcé, `mistral-large-2512` (la rétrogradation vers un modèle plus petit est une décision P8 sur évaluations, pas une intuition).
3. **Réduction du routeur regex** dans `assistantIntentRouting.ts` : conservés en fast-path zéro token — refus sécurité, hors-scope, `segment_count` avec marque explicite, `supplier_brand_count`, `purchase_terms_ranking`, `schema_location`, seuils de diff chiffrés, résumés anomalies/santé. Supprimés — la clarification en conserve « FAM ou CAT_FAB ? », la branche morte « famille CIR pas encore disponible » (`getUnsupportedPendingClarificationAnswer`), et le fallback par défaut vers `general_sql` pour toute question non reconnue : ces cas partent en routage model-first.
4. **Dispatch inchangé** : l'intention choisie par le modèle emprunte exactement les chemins d'exécution actuels (outils déterministes, planificateur sémantique, SQL borné en dernier recours). Le modèle route, il n'exécute rien.
5. **Nettoyage legacy** : `ASSISTANT_MODEL_POLICY` (IDs DeepSeek) remplacé par la résolution provider par défaut réellement utilisée ; `getAssistantStatus` cesse d'exiger les deux modèles DeepSeek.
6. **Flag dédié** `AI_ASSISTANT_MODEL_ROUTING_ENABLED` ; à `false`, comportement actuel intégral.

### 6.2 Fichiers touchés

- `backend/functions/api/services/ai/assistantIntentRouting.ts` (+ test, réécriture partielle)
- `backend/functions/api/services/ai/assistantBroker.ts` (insertion de la passe de routage, retrait des branches en conserve)
- `backend/functions/api/services/ai/aiGovernance.ts` (statut, politique modèle)
- `docs/ASSISTANT_IA/plan-mistral-assistant-transversal.md` (amendement §2.2.1 consigné)

### 6.3 Budget

- +1 appel provider léger pour les questions non couvertes par un fast-path (entrée cible ≤ 2K tokens : carte de domaine + question + contexte conversationnel court). Les questions fast-path restent à zéro token.
- Mesure CP-C2 : les tokens sont aujourd'hui cumulés au niveau de la demande et ne permettent pas d'isoler exactement la passe de routage. Sa latence provider est de 0,9 à 1,2 s sur 5 des 6 essais, avec un outlier à 37,8 s ; le caractère « léger » est donc confirmé en régime nominal, pas encore comme borne de latence. Ajouter des métriques par round avant toute optimisation de modèle en phase 8.

### 6.4 Checkpoint CP-C2

- [x] « Combien de familles produit à la CIR proposent des servomoteurs électriques ? » atteint le planificateur sémantique et aboutit : preuve runtime déployée (demande `55e736d0…`), `tool_trace = classify_assistant_request → search_product_candidates → submit_product_qualification`, réponse `qualified` 88 couples / 5 marques, recomptage SQL témoin identique. La complétion end-to-end reste ~50 % stable (partition/oscillation → chantiers 3-4).
- [x] Les 15 cas de routage existants restent verts : matrice `assistantIntentRouting_test.ts` inchangée et verte, `parseAssistantReferenceIntent` non modifié ; preuve runtime `ai_usage_events` — fast-paths à zéro token, aucun n'appelle `classify_assistant_request`.
- [x] Le refus sécurité et le hors-scope restent déterministes sans appel provider : preuve runtime (`usage=null`, `cost=null`, `tool_trace=[]`, aucun round provider).
- [~] La clarification en conserve et sa branche morte sont **neutralisées dans le chemin model-first** (flag ON) ; elles restent dans le code uniquement pour le rollback flag OFF (`AI_ASSISTANT_MODEL_ROUTING_ENABLED=false` = comportement actuel intégral) et seront supprimées au démantèlement du flag après GO. Écart assumé et consigné (§4.2 du plan directeur).
- [x] Amendement consigné dans le plan directeur (§4.2, « Amendement du 2026-07-21 — routage model-first »).
- [ ] Décision PO sur le chantier : GO / NO-GO. Recommandation technique du 2026-07-22 : **GO CP-C2 pour autoriser le chantier 3, mais NO-GO d'activation** ; conserver le flag à `false` jusqu'aux preuves CP-C3/CP-C4 et au jeu d'or vert.

### 6.5 Prompt de lancement (conversation vierge)

> Lis `docs/ASSISTANT_IA/plan-semantique-4-chantiers.md` (chantier 2), l'amendement §2.2.1 et les sections §4.1-4.3 du plan directeur. Implémente le routage model-first derrière `AI_ASSISTANT_MODEL_ROUTING_ENABLED` : carte de domaine, outil `classify_assistant_request` strict, réduction du routeur regex aux fast-paths listés, dispatch inchangé, nettoyage `ASSISTANT_MODEL_POLICY`. Consigne l'amendement dans le plan directeur. Preuve runtime : la question servomoteurs de bout en bout. Remplis CP-C2.

---

## 7. Chantier 3 — Tolérance lexicale (pluriels, fautes, « vouliez-vous dire »)

**Objectif :** plus aucun échec silencieux pour une différence de pluriel ou une faute de frappe, sur les deux chemins de recherche (sémantique et déterministe).

### 7.1 Travaux

1. **Folding singulier/pluriel** dans la tokenisation partagée : au moment du match, les tokens alphabétiques de longueur ≥ 5 perdent leur `s`/`x` final des deux côtés. `inox`, `ATEX`, `kits`, `plus`, `flex`, `VFD` et les références alphanumériques restent intacts. Les tableaux publics `requested_terms`, `canonical_terms` et `query_terms` conservent la provenance ; seul le matching est replié. Appliqué à `referenceProductSemantics.ts` (recherche sémantique) et `referenceImports.ts` (`categoryTermCondition` : motif ordonné de tokens au lieu du LIKE de phrase littérale).
2. **Secours trigram** : uniquement quand la recherche sémantique retourne zéro groupe, une requête séparée et paramétrée compare les tokens de requête de longueur ≥ 5 aux tokens des vrais libellés du snapshot via `extensions.similarity()`. Maximum du score token/token, seuil 0,35, dédoublonnage par libellé, ordre score décroissant puis libellé, cinq suggestions maximum. Une suggestion déclenche la réponse locale « Aucune correspondance exacte. Vouliez-vous dire… », conserve le contexte de clarification et supprime le second round provider ; elle ne devient jamais un résultat.
3. **Décision explicite hors périmètre :** pas de FTS `to_tsvector('french', ...)` tant que le jeu d'or ne montre pas un échec que le folding ne couvre pas ; pas d'index trigram. La requête finale est mesurée à 147 ms sur 6 816 libellés du snapshot actif, contre environ 125 ms lors de la préparation, avec 0 bloc disque lu.

### 7.2 Fichiers touchés

- `backend/functions/api/services/pricing/references/referenceSemantics.ts` (+ folding partagé)
- `backend/functions/api/services/pricing/references/referenceProductSemantics.ts`
- `backend/functions/api/services/pricing/references/referenceImports.ts`
- Tests : `assistantSemanticTools_test.ts`, tests référentiels existants

### 7.3 Checkpoint CP-C3

- [~] « servomoteur électrique » et « Servomoteurs électriques » se replient tous deux en `servomoteur electrique` ; contrôle SQL direct du 2026-07-22 : 1 CAT_FAB / 1 ligne sur le chemin déterministe et 1 identité candidate sur le chemin sémantique pour chaque formulation. Sur l'API v198, les réponses end-to-end divergent toutefois à cause des plans et partitions Mistral : demande `1ae1f956…` = 116 couples / 5 marques au singulier, demande `593c015e…` = 87 couples / 6 marques au pluriel. Le folding est symétrique, mais le critère d'équivalence end-to-end n'est pas satisfait.
- [~] `debimetre` classe uniquement le vrai libellé `Capteurs/débitmètres` au-dessus du seuil (score 0,615385) dans la requête trigram et le test planificateur produit la réponse locale exacte, sans fait/total/citation et avec un seul round provider. Sur l'API v198, la formulation naturelle est autocorrigée par la passe 1 avant le zéro-candidat : demande `088bab5e…`, 25 couples / 6 marques, deux rounds, coût 0,011528 USD. La branche de suggestion est déployée mais ce témoin ne l'atteint donc pas.
- [x] Les agrégats ne sont pas modifiés ; les modes déterministes `any/all`, FEST/FESTO, les contrats et les suites de régression IA restent verts. `qa:back` final : 449 réussites / 0 échec / 14 intégrations ignorées ; `qa:fast` vert le 2026-07-23.
- [x] Aucun composant UI, schéma partagé, migration, prompt, FTS ou index ajouté. Commit `1f2c61c` poussé sur `origin/codex/mistral-phase-1b-total`, Edge Function `api` v198 ACTIVE, wrapper/import map et `verify_jwt=false` confirmés. `OPTIONS 200` et appel sans Bearer `401 AUTH_REQUIRED`. Aucune migration artificielle : parité locale/distante déjà complète.
- [x] `AI_ASSISTANT_MODEL_ROUTING_ENABLED` reste à `false` après déploiement : la question CP-C2 retourne la clarification déterministe FAM/CAT_FAB en 1,7 s, sans outil, usage ni appel provider (demande `9dd3ed65…`).
- [ ] Décision PO : **NO-GO technique recommandé en l'état**. La livraison est active, mais CP-C3 ne peut pas être déclaré vert tant que le contrat attendu n'est pas aligné avec la liberté de planification de la passe 1 (ou rendu déterministe avant cette passe).

### 7.4 Prompt de lancement (conversation vierge)

> Lis `docs/ASSISTANT_IA/plan-semantique-4-chantiers.md` (chantier 3). Implémente le folding pluriel symétrique TS/SQL dans la tokenisation partagée, la tokenisation de phrase dans `categoryTermCondition`, et le secours trigram à seuil 0,35 pour les suggestions de clarification. Pas de FTS, pas d'index. Tests ciblés puis `qa:back`. Remplis CP-C3.

---

## 8. Chantier 4 — Clarifications réelles, réparation, présentation

**Objectif :** quand l'assistant hésite, il pose une vraie question construite sur les données ; quand Mistral se trompe de format, on répare au lieu de jeter ; la réponse finale est lisible.

### 8.1 Travaux

1. **Clarifications ancrées** : quand la passe 2 choisit `request_product_clarification`, les options proposées doivent référencer des groupes candidats réels (libellé + chemin + comptes). Le contexte `product_semantic_clarification` porte les sélecteurs des options pour que la réponse utilisateur (« les vannes », « le premier ») se résolve déterministiquement sans nouvelle recherche complète. Zéro option hallucinée : une option sans groupe correspondant invalide la passe.
2. **Cas zéro candidat honnête sans suggestion** : le chantier 3 répond déjà localement lorsqu'une suggestion trigram existe. Le chantier 4 traite définitivement le zéro-candidat sans suggestion, encore envoyé provisoirement dans le flux de clarification existant.
3. **Tour de réparation** : sur violation de partition (`accepted + excluded ≠ candidats`), un unique appel correctif renvoie l'erreur précise au modèle ; en cas de second échec, l'erreur actuelle est conservée. Métadonnées d'usage : `repair_round: true`. Amendement « 3 appels max dont 1 réparation » consigné (§2.2.2).
4. **Templates markdown** : les réponses locales (qualification, relances, déterministe) passent en markdown structuré que `AssistantMessageContent.tsx` sait déjà rendre — phrase de résultat en tête, puis puces par marque (top 10 + « et N autres »), ligne « Critères », UUID de snapshot retiré du texte (il reste dans citations/evidence, affiché par `AssistantSources`).
5. **Vérification UI** : rendu contrôlé dans le chat (dialog centré existant), aucun changement de composant attendu au-delà d'éventuels ajustements mineurs.

### 8.2 Fichiers touchés

- `backend/functions/api/services/ai/assistantSemanticPlanner.ts` (+ test)
- `backend/functions/api/services/ai/assistantBroker.ts` (templates des réponses locales)
- `shared/schemas/aiAssistant.schema.ts` (sélecteurs d'options dans le contexte de clarification)
- `frontend/src/components/pricing-references/components/assistant/` (vérification, ajustements mineurs)

### 8.3 Checkpoint CP-C4

- [ ] Une clarification servomoteurs présente les options réelles (vannes de régulation vs servo-variateurs) avec comptes, et la réponse « les vannes » aboutit sans re-planification complète.
- [ ] Une question sans correspondance obtient une réponse honnête + suggestions, pas un total ni une clarification vide.
- [ ] Un cas de partition invalide simulé est réparé en un tour (test), tracé `repair_round`.
- [ ] La réponse qualifiée s'affiche en liste lisible sans UUID inline ; snapshot visible dans Sources.
- [ ] Décision PO : GO / NO-GO.

### 8.4 Prompt de lancement (conversation vierge)

> Lis `docs/ASSISTANT_IA/plan-semantique-4-chantiers.md` (chantier 4) et la section §4.8 du plan directeur. Implémente : options de clarification ancrées aux groupes réels avec sélecteurs dans le contexte, réponse honnête zéro-candidat, tour de réparation unique tracé, templates markdown des réponses locales. Consigne l'amendement budget d'appels dans le plan directeur. Vérifie le rendu dans l'UI. Remplis CP-C4.

---

## 9. Jeu d'or étendu (entrée au jeu d'or P5)

Cas à ajouter aux évaluations, en plus des cas d'ancrage vérins et variateur conservés :

| Cas | Attendu | Chantier qui le rend vert |
| --- | --- | --- |
| « Quelles marques proposent des débitmètres ? » | 5 marques (branche DEBIT) + PARK (label direct), réponse qualifiée | 1 |
| « Combien de familles produit à la CIR proposent des servomoteurs électriques ? » | Routage sémantique, réponse qualifiée ou clarification réelle | 2 (routage) + 4 (clarification) |
| « famille produit » / « catégorie fabricant » / « CAT_FAB » | Même routage pour les trois formulations | 2 |
| « servomoteur électrique » au singulier | Mêmes résultats que le pluriel | 3 |
| « debimetre » (faute) | Suggestion « vouliez-vous dire débitmètre », zéro invention | 3 |
| Question produit sans correspondance (produit hors catalogue) | Réponse honnête « aucune famille », suggestions éventuelles | 4 |
| Relances marque sur résultat qualifié (PARK, PHOE) | Comportement actuel conservé à zéro token | régression |
| Refus sécurité, hors-scope, comptage FESTO | Déterministe zéro token conservé | régression |

Le NO-GO P5 global du plan directeur reste en vigueur tant que ce tableau n'est pas vert en plus des dix questions de référence du checkpoint P5.

---

## 10. Journal des checkpoints

### CP-C1 — Taxonomie visible

- Date : 2026-07-20
- Commit : `0652f35160c07a048e71c3141d977224f99e20db` (branche `codex/mistral-phase-1b-total`), suivi du commit docs consignant le GO
- Migration/deploy : migrations `20260720115957_ai_product_semantic_taxonomy_pass.sql` (prompt v11) et `20260720153737_ai_product_semantic_terminal_scope_guard.sql` (prompt v12, durcissement après rejeu) appliquées et enregistrées sur le projet lié `rbjtrcorlezvocayluok` ; prompt publié `assistant.referentiels` v12, marqueur unique conservé ; Edge Function `api` v189 → v193 `ACTIVE` ; probes `OPTIONS 200` (origine localhost:3000) et `POST ai.assistant.ask` sans Bearer `401 AUTH_REQUIRED` vertes
- Snapshot actif : `4e216bc4-7d82-4eb7-aa20-2cc8316667cc` (inchangé depuis CP-P5) ; taxonomie mesurée : 326 chemins, 18 033 octets (bornes 400 / 24 Ko respectées)
- Preuve runtime débitmètres : demande `a877753a-f9ab-4c29-952d-eb514be6b699`, `selected_paths = [FLUIDES PROCESS > CONTROLE ET MESURE > DEBIT]`, 3 groupes inspectés / 3 acceptés / 0 exclu, réponse UI `qualified` sans clarification : 25 couples marque + CAT_FAB, 25 libellés, 6 marques (SPIR 9, SIEM 7, SICK 6, BALL 1, CITE 1, PARK 1) = branche DEBIT (23) + label direct PARK « Capteurs/débitmètres » + label direct SIEM « beltscale and solid flowmeter » ; recomptage SQL témoin indépendant identique (25/25/6, mêmes détails par marque) ; captures et réponses brutes dans `frontend/e2e-proof-cp-c1/`
- Régression vérins : demande `9a830cb0-3262-4984-894f-9aabd227b75b`, `selected_paths` = les 3 familles VERINS, 75 couples / 5 marques (FEST 37, PARK 16, AVEN 12, AIGN 7, ASCO 3), identique CP-P5, témoin SQL identique
- Régression variateur : demande `09df3cd3-eeef-49b8-bad4-9c603e4d794e`, 15 inspectés / 13 acceptés / 2 exclus, 308 couples / 6 marques (ROCK 259, FEST 20, SIEM 20, PARK 6, LERO 2, BONF 1), sans PHOE, scope DIVERS jamais accepté ; écart vs CP-P5 (305) : +4 labels « motion products - servo drives » (branche DIVERS, qualifiés individuellement conformément à la règle de portée), −1 label armorstart ; témoin SQL identique (308/308/6)
- Tokens/coût/latence (run final v193) : débitmètres 22 234 entrée / 276 sortie / 0 cache, 0,011531 USD, 14,8 s ; vérins 22 404 entrée (1 472 cache) / 293 sortie, 0,0123775 USD, 13,9 s ; variateur 24 281 entrée (1 920 cache) / 796 sortie, 0,0142945 USD, 28,2 s ; toujours 2 appels provider maximum, aucun `execute_readonly_sql`
- Écarts au plan :
  - Cible budget §5.3 non tenue : ~22-24K tokens d'entrée par question (taxonomie ≈ 4,5-6K tokens présente dans l'historique des deux passes) contre ≤ 10K visés ; coût 0,0115-0,0143 USD (médiane légèrement au-dessus de 0,01) ; latence ≤ 20 s tenue sauf variateur (28 s) — budget réel entériné par le PO le 2026-07-20, §5.3 amendé
  - Deux migrations prompt au lieu d'une : le rejeu a montré le modèle sélectionnant la feuille générique `DIVERS` (retour de PHOE) puis traitant `selected_paths` comme liste d'exclusion (perte FEST) ; v12 ajoute la portée terminale stricte et la règle « wrong_energy seulement si la question impose une énergie »
  - Garde structurelle serveur ajoutée : les chemins sélectionnés à libellé terminal résiduel (`DIVERS`, `AUTRES` — vocabulaire de structure de classification, pas un dictionnaire produit) sont rétrogradés et ne deviennent jamais des scopes ; leurs CAT_FAB restent qualifiables individuellement (test unitaire dédié)
  - Contrat runtime code enrichi d'une règle « selected_paths n'est pas une liste d'exclusion »
  - Variateur 308/6 au lieu de 305/6 : différence intégralement expliquée par des labels servo-drives réels de DIVERS, PHOE toujours absent — validé par le PO le 2026-07-20 comme nouveau total d'ancrage du jeu d'or
  - Quota journalier tokens `assistant.referentiels` relevé temporairement 300K → 500K pendant la preuve (les rejeux du jour dépassaient 300K), restauré à 300K, puis porté durablement à 1 000 000 tokens sur décision PO du 2026-07-20 (~43 questions/jour au coût unitaire mesuré) ; garde-fou coût journalier (15 USD) jamais approché (~0,20 USD consommés sur la journée) et plafond mensuel 20M inchangés
  - MCP Supabase indisponible dans la session : migrations appliquées par script transactionnel direct (SQL + enregistrement `supabase_migrations.schema_migrations`), parité confirmée par `supabase migration list --linked` et `repo:check`
- QA : planificateur 22/22, les cinq suites ciblées (planificateur, routage, contexte conversationnel, outils sémantiques, adaptateur Mistral) 97/97 au total, `qa:back` final vert (438 réussites, 0 échec, 14 intégrations conditionnelles ignorées)
- Décision PO : **GO le 2026-07-20** — variateur 308/6 sans PHOE validé comme nouveau total d'ancrage, budget réel entériné, quota journalier porté à 1M tokens
- [x] Checkpoint validé

### CP-C2 — Routage model-first

- Date : 2026-07-21 (code et gate locale), complété le 2026-07-22 (preuve runtime et audit indépendant)
- Périmètre livré : flag `AI_ASSISTANT_MODEL_ROUTING_ENABLED` (rollback indépendant, défaut `false`) ; carte de domaine compacte versionnée en code (`ASSISTANT_DOMAIN_MAP`, `ASSISTANT_DOMAIN_MAP_VERSION=v1`) ; outil strict `classify_assistant_request` (schéma Zod `assistantClassificationSchema`, `tool_choice` forcé, `mistral-large-2512`) ; passe de routage insérée dans `assistantBroker.ts` pour les seules issues non-routantes du regex (clarification en conserve + repli `general_sql`), dispatch inchangé pour la capacité choisie ; nettoyage legacy `ASSISTANT_MODEL_POLICY`/`selectAssistantModelId` supprimés et `getAssistantStatus` recablé sur la résolution du modèle affecté à la feature
- Fichiers : `backend/functions/api/services/ai/assistantIntentRouting.ts` (+ test), `backend/functions/api/services/ai/assistantBroker.ts`, `backend/functions/api/services/ai/aiAssistantContracts_test.ts`, `backend/functions/api/integration/assistantAccessIdentity_integration_test.ts`, `docs/ASSISTANT_IA/plan-mistral-assistant-transversal.md` (amendement §4.2)
- Commit : non créé (branche `codex/mistral-phase-1b-total`, worktree)
- Deploy : Edge Function `api` redéployée sur le projet lié `rbjtrcorlezvocayluok` (`--use-api --import-map deno.json --no-verify-jwt`) le 2026-07-22 sur autorisation PO explicite ; secret `AI_ASSISTANT_MODEL_ROUTING_ENABLED` posé à `true` pour la preuve puis **remis à `false` + redéploiement** (flag désactivé, comportement actuel intégral restauré en attente du GO PO). `AI_ASSISTANT_SEMANTIC_PLANNER_ENABLED=true` déjà en place. Probes vertes : `OPTIONS 200` (origine `http://localhost:3000`, méthodes `GET, POST, OPTIONS`), `POST ai.assistant.ask` sans Bearer `401 AUTH_REQUIRED`
- Preuve runtime servomoteurs (flag ON) : question exacte « Combien de familles produit à la CIR proposent des servomoteurs électriques ? », demande `55e736d0-79bc-4e7d-9c0b-a3c3b368d05d`, HTTP 200. **Le routage model-first amène la question au planificateur** : `tool_trace = classify_assistant_request → search_product_candidates → submit_product_qualification`, `ai_usage_events.metadata.execution_mode = product_semantic_search`, `routed_intent = product_semantic_search`, `provider_rounds = 3`. Réponse `qualified` : 88 couples marque + CAT_FAB, 88 libellés, 5 marques (ROCK 62, SIEM 15, FEST 5, PARK 4, LERO 2), 16 groupes inspectés / 13 acceptés / 3 exclus. Tokens 25 314 entrée / 906 sortie / 0 cache, coût `0,014016 USD`, latence ~58 s (classify ≈ +1-2K tokens sur la baseline planificateur CP-C1, conforme au budget « +1 appel léger »). Artefacts : `frontend/e2e-proof-cp-c2/servomoteurs-flagon-qualified.json`
- Recomptage SQL témoin indépendant : réplique exacte de `aggregateQualifiedProductGroups` (link_status='complete_valid' sur les scopes seuls, direct labels matchés par `(normalized_cat_fab, cir_path)`, couples sur `cat_fab` brut) sur le snapshot `4e216bc4-7d82-4eb7-aa20-2cc8316667cc` → **88 couples / 5 marques**, mêmes détails par marque : identique à la réponse. Le total qualifié est un comptage base, pas une hallucination
- Stabilité de la qualification : **3 succès `qualified` sur 6 essais (50 %) et 3 erreurs** dans la campagne distante du 2026-07-22. Deux succès retournent 88 couples / 5 marques, un succès retourne 90 / 5 ; les trois échecs sont `AI_RESPONSE_INVALID « La qualification sémantique ne couvre pas exactement les groupes candidats »` (partition incomplète, §1.2.4). Le routage est stable sur les six essais ; l'instabilité se situe après `classify_assistant_request`, dans la recherche/qualification sémantique. La partition incomplète relève du chantier 4 (tour de réparation et clarification ancrée) ; la variation 88/90 doit être caractérisée pendant le chantier 3 avant de l'attribuer entièrement à la tolérance lexicale. Conforme au jeu d'or §9 qui note servomoteurs = « 2 (routage) + 4 (clarification) »
- Mesure du round de routage : 5 essais sur 6 entre 0,9 et 1,2 s ; un outlier à 37,8 s sur la demande finale `55e736d0…`. Les tokens par round ne sont pas persistés séparément, donc le surcoût « +1-2K tokens » reste une estimation par différence de total, pas une mesure directe.
- Fast-paths zéro token vérifiés (flag ON, `frontend/e2e-proof-cp-c2/fastpaths-flagon.json`) : refus sécurité (`6418607b…`) et hors-scope (`9d487f49…`) → réponse déterministe statique, `usage=null`, `cost=null`, `model_id=null`, `tool_trace=[]`, **aucun appel provider** ; comptage FESTO (`e30eb011…`) → `tool_trace=[aggregate_segments]`, 0 token entrée/sortie, coût 0, 673 CAT_FAB. Aucun des trois ne déclenche `classify_assistant_request` : les fast-paths ne partent pas en routage model-first
- Rollback vérifié : flag remis à `false`, la même question servomoteurs retourne la clarification en conserve « FAM ou CAT_FAB ? » (`usage=null`, `tool_trace=[]`, aucun appel provider) — comportement actuel intégral restauré (`frontend/e2e-proof-cp-c2/servomoteurs-flagoff-rollback.json`)
- Fast-paths au niveau contrat : `parseAssistantReferenceIntent` inchangé, matrice de routage verte, nouveaux tests C2 (`needsModelRouting`, carte de domaine, outil strict, `intentFromClassification`, parse) verts
- Dette d'observabilité révélée par l'audit du 2026-07-22 : lors des trois erreurs post-routage, `ai_usage_events.metadata.execution_mode` vaut encore `clarification`, `routed_intent` est absent et la trace persistée ne contient que `classify_assistant_request`. Le routage a pourtant réussi et les trois rounds provider sont présents. Corriger cette attribution au début du chantier 4, ou dans une tranche d'observabilité dédiée sans modifier le comportement, afin de distinguer un échec de routage d'un échec de qualification.
- QA : `qa:back` complet vert le 2026-07-21 — `repo:check` OK, `deno lint` 137 fichiers OK, `deno check` index OK, `deno test` backend **444 réussites / 0 échec / 15 intégrations ignorées** ; suites ciblées AI (routage, planificateur, contexte conversationnel, outils sémantiques, adaptateur Mistral, contrats, phase 6) 136/136
- Contre-vérification Codex du 2026-07-22 : Supabase MCP confirme `api` v197 `ACTIVE`, wrapper `source/supabase/functions/api/index.ts`, import map `source/deno.json` et `verify_jwt=false` ; lecture SQL de `ai_usage_events`/`ai_request_reservations` confirme les six essais, les coûts et les trois erreurs ci-dessus ; tests locaux ciblés routage + planificateur + contrats **63/63**, `deno check` de l'entrypoint et `qa:docs` verts.
- Amendement plan directeur consigné : oui (§4.2, « Amendement du 2026-07-21 — routage model-first (chantier 2, §2.2.1 du plan enfant) »)
- Écarts au plan : (1) réduction du routeur ciblée sur les seules issues non-routantes du regex (clarification en conserve + repli `general_sql`) plutôt que sur « toute autre question » — les capacités déjà correctement détectées gardent leur route regex, ce qui préserve à l'identique les cas d'ancrage CP-C1 (zéro régression) ; écart assumé et consigné §4.2. (2) Clarification en conserve et branche morte neutralisées dans le chemin model-first mais conservées pour le rollback flag OFF (suppression au démantèlement du flag après GO). (3) Preuve runtime obtenue en process/HTTP direct sur la fonction déployée (le secret de déchiffrement de la clé Mistral n'existe pas en local) ; la couche HTTP/tRPC/auth n'est pas touchée par le chantier 2
- Décision PO : GO / NO-GO — **en attente**. Recommandation technique : **GO de checkpoint CP-C2 / NO-GO d'activation** ; passer au chantier 3 avec `AI_ASSISTANT_MODEL_ROUTING_ENABLED=false`, puis exiger CP-C3 et CP-C4 avant réactivation durable.
- [ ] Checkpoint validé (routage prouvé ; validation PO en attente)

### CP-C3 — Tolérance lexicale

- Date : 2026-07-22 (implémentation locale et preuves SQL directes ; déploiement non autorisé/non effectué)
- Commit : non créé (worktree partagé ; modifications dashboard et CP-C2 préservées)
- Périmètre livré localement : folding TS/SQL centralisé à partir de 5 caractères, références alphanumériques et codes courts préservés, motifs ordonnés sur le déterministe et le sémantique, suggestions trigram internes sourcées, réponse locale avec contexte de clarification et un seul round provider
- Preuves singulier/pluriel : contrôle SQL direct sur le snapshot `4e216bc4-7d82-4eb7-aa20-2cc8316667cc` — les deux formulations produisent `servomoteur electrique`, 1 CAT_FAB / 1 ligne déterministe et 1 identité candidate sémantique chacune
- Preuve faute : `debimetre` retourne uniquement `Capteurs/débitmètres`, score `0,615385` ; aucun libellé seulement lié à « débit » ne franchit 0,35. `EXPLAIN ANALYZE` : 147 ms, 6 816 libellés, 0 bloc lu, contre ~125 ms préparatoires
- Preuve orchestration locale : test planificateur avec zéro groupe + suggestion — réponse exacte « Aucune correspondance exacte. Vouliez-vous dire… », aucun fait/total/citation, une seule trace outil et un seul round provider ; zéro groupe sans suggestion conserve le flux à deux passes du chantier 4
- Comptages exacts inchangés : logique d'agrégation non modifiée ; tests FEST/FESTO, modes `any/all`, vérins, variateur, contexte qualifié et contrats IA verts ; tests ciblés CP-C3 36/36, suite ciblée IA 93/93, `deno check` de l'entrypoint et `qa:back` verts (**449 réussites / 0 échec / 14 intégrations ignorées**)
- Déploiement/runtime : aucun ; `AI_ASSISTANT_MODEL_ROUTING_ENABLED=false` reste l'état courant, aucune activation payante. Les probes API, le rejeu UI/runtime et les artefacts `frontend/e2e-proof-cp-c3/` restent conditionnés à une autorisation explicite
- Décision technique : implémentation locale verte ; **NO-GO de fermeture CP-C3** avant preuve sur l'API déployée et décision PO
- Décision PO : GO / NO-GO — en attente
- [ ] Checkpoint validé

### CP-C4 — Clarifications, réparation, présentation

- Date :
- Commit :
- Deploy :
- Preuve clarification ancrée + reprise :
- Preuve réparation tracée :
- Preuve rendu UI :
- Amendement budget d'appels consigné :
- Décision PO : GO / NO-GO
- [ ] Checkpoint validé
