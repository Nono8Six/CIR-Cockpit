# Plan d'exécution — Assistant sémantique : 4 chantiers

- Date de rédaction : 2026-07-20
- Auteur : Claude, sur diagnostic runtime du 2026-07-20 validé par sondes SQL en lecture seule
- Statut : proposé, en attente de validation PO chantier par chantier
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

- Entrée passe 1 : +3 à 4K tokens (taxonomie) ; entrée passe 2 réduite quand les branches remplacent des dizaines de groupes lexicaux bruités. Cible : ≤ 10K tokens entrée par question, coût médian ≤ 0,01 USD, latence ≤ 20 s.
- Toujours 2 appels provider maximum.

### 5.4 Checkpoint CP-C1

- [ ] « Quelles marques proposent des débitmètres ? » retourne les 5 marques de la branche DEBIT plus PARK (label direct), sans clarification bloquante, avec recomptage SQL témoin identique.
- [ ] Les cas d'ancrage vérins pneumatiques et variateur de vitesse restent verts (mêmes totaux que CP-P5 : 75 couples / 5 marques et 305 couples / 6 marques, ou nouvel accord PO si le snapshot actif a bougé).
- [ ] Aucun chemin hors liste accepté par la validation serveur (test unitaire).
- [ ] Budget tokens/coût/latence consigné.
- [ ] Décision PO : GO / NO-GO.

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

### 6.4 Checkpoint CP-C2

- [ ] « Combien de familles produit à la CIR proposent des servomoteurs électriques ? » atteint le planificateur sémantique et aboutit (réponse qualifiée ou clarification réelle vannes/servo-variateurs).
- [ ] Les 15 cas de routage existants restent verts (fast-paths conservés à zéro token, preuve par `ai_usage_events`).
- [ ] Le refus sécurité et le hors-scope restent déterministes sans appel provider.
- [ ] La clarification en conserve et sa branche morte ont disparu du code.
- [ ] Amendement consigné dans le plan directeur.
- [ ] Décision PO : GO / NO-GO.

### 6.5 Prompt de lancement (conversation vierge)

> Lis `docs/ASSISTANT_IA/plan-semantique-4-chantiers.md` (chantier 2), l'amendement §2.2.1 et les sections §4.1-4.3 du plan directeur. Implémente le routage model-first derrière `AI_ASSISTANT_MODEL_ROUTING_ENABLED` : carte de domaine, outil `classify_assistant_request` strict, réduction du routeur regex aux fast-paths listés, dispatch inchangé, nettoyage `ASSISTANT_MODEL_POLICY`. Consigne l'amendement dans le plan directeur. Preuve runtime : la question servomoteurs de bout en bout. Remplis CP-C2.

---

## 7. Chantier 3 — Tolérance lexicale (pluriels, fautes, « vouliez-vous dire »)

**Objectif :** plus aucun échec silencieux pour une différence de pluriel ou une faute de frappe, sur les deux chemins de recherche (sémantique et déterministe).

### 7.1 Travaux

1. **Folding singulier/pluriel** dans la tokenisation partagée : au moment du match, les tokens de longueur ≥ 4 perdent leur `s`/`x` final des deux côtés (motif SQL et normalisation TypeScript restent symétriques, comme l'actuel couple `translate`/`normalizedText`). Appliqué à `referenceProductSemantics.ts` (recherche sémantique) et `referenceImports.ts` (`categoryTermCondition` : tokenisation de la phrase au lieu du LIKE de phrase littérale).
2. **Secours trigram** : quand une recherche retourne zéro groupe, une requête `similarity()` (`pg_trgm` déjà installé) propose jusqu'à 5 libellés proches (seuil 0,35) retournés comme suggestions dans la clarification — jamais comme résultats.
3. **Décision explicite hors périmètre :** pas de FTS `to_tsvector('french', ...)` tant que le jeu d'or ne montre pas un échec que le folding ne couvre pas ; pas d'index trigram (94 ms mesurés sur 9,3K lignes au CP-P5).

### 7.2 Fichiers touchés

- `backend/functions/api/services/pricing/references/referenceSemantics.ts` (+ folding partagé)
- `backend/functions/api/services/pricing/references/referenceProductSemantics.ts`
- `backend/functions/api/services/pricing/references/referenceImports.ts`
- Tests : `assistantSemanticTools_test.ts`, tests référentiels existants

### 7.3 Checkpoint CP-C3

- [ ] « servomoteur électrique » (singulier) matche « SERVOMOTEURS ELECTRIQUES » sur le chemin déterministe et le chemin sémantique.
- [ ] « debimetre » (faute) produit une suggestion « vouliez-vous dire » construite sur les vrais libellés, zéro résultat inventé.
- [ ] Les comptages exacts existants (FESTO, marques distinctes) restent identiques au recomptage SQL.
- [ ] Décision PO : GO / NO-GO.

### 7.4 Prompt de lancement (conversation vierge)

> Lis `docs/ASSISTANT_IA/plan-semantique-4-chantiers.md` (chantier 3). Implémente le folding pluriel symétrique TS/SQL dans la tokenisation partagée, la tokenisation de phrase dans `categoryTermCondition`, et le secours trigram à seuil 0,35 pour les suggestions de clarification. Pas de FTS, pas d'index. Tests ciblés puis `qa:back`. Remplis CP-C3.

---

## 8. Chantier 4 — Clarifications réelles, réparation, présentation

**Objectif :** quand l'assistant hésite, il pose une vraie question construite sur les données ; quand Mistral se trompe de format, on répare au lieu de jeter ; la réponse finale est lisible.

### 8.1 Travaux

1. **Clarifications ancrées** : quand la passe 2 choisit `request_product_clarification`, les options proposées doivent référencer des groupes candidats réels (libellé + chemin + comptes). Le contexte `product_semantic_clarification` porte les sélecteurs des options pour que la réponse utilisateur (« les vannes », « le premier ») se résolve déterministiquement sans nouvelle recherche complète. Zéro option hallucinée : une option sans groupe correspondant invalide la passe.
2. **Cas zéro candidat honnête** : réponse locale « aucune famille ne correspond à X dans ce snapshot » plus les suggestions trigram du chantier 3, au lieu d'une clarification sans matière.
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

- Date :
- Commit :
- Migration/deploy :
- Preuve runtime débitmètres :
- Régression vérins/variateur :
- Tokens/coût/latence :
- Écarts au plan :
- Décision PO : GO / NO-GO
- [ ] Checkpoint validé

### CP-C2 — Routage model-first

- Date :
- Commit :
- Deploy :
- Preuve runtime servomoteurs :
- Fast-paths zéro token vérifiés :
- Amendement plan directeur consigné :
- Décision PO : GO / NO-GO
- [ ] Checkpoint validé

### CP-C3 — Tolérance lexicale

- Date :
- Commit :
- Preuves singulier/pluriel et faute :
- Comptages exacts inchangés :
- Décision PO : GO / NO-GO
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
