# Audit UI/UX — Gouvernance IA

> **Date :** 2026-08-16
> **Demande PO :** « l'ui/ux et le design de toute cette partie IA est a revoir de 0 »
> **Statut :** audit uniquement. Aucune implémentation, aucun commit, aucun push.
> **Périmètre code :** `frontend/src/components/admin-ai/` monté depuis `frontend/src/components/AdminPanel.tsx` (onglet `ai`). Contrats tRPC et logique backend hors modification.

## 1. Mandat et sources

### 1.1 Périmètre examiné

| Fichier | Rôle |
| --- | --- |
| `AdminPanel.tsx` | Onglet « IA » de la barre Administration Système |
| `AdminAiPanel.tsx` | Conteneur, six sous-onglets |
| `AiOverviewTab.tsx` | Vue d’ensemble |
| `AiModelsTab.tsx` | Fournisseur et modèles |
| `AiAccessTab.tsx` | Accès membres |
| `AiQuotasTab.tsx` | Politiques de quota |
| `AiPromptsTab.tsx` | Templates et cycle de vie |
| `AiPromptEditorDialog.tsx` | Édition / publication d’un prompt |
| `AiPromptLifecycleDialogs.tsx` | Archive / suppression |
| `AiUsageTab.tsx` | Usage et audit |
| `aiAdminUi.tsx` | Libellés de features, métriques, états |

### 1.2 Défauts déjà constatés par le PO (session authentifiée, Chrome, `http://127.0.0.1:3000/admin`)

- l’onglet « IA » n’expose pas de texte accessible : la recherche par accessibilité ne le trouve pas et axe-core signale « Element does not have text that is visible to screen readers » ;
- `@axe-core/react` remonte 11 violations de contraste (ratios 2,15 / 3,05 / 4,33 / 4,41 pour un seuil de 4,5:1), surtout du texte 10 px `#b1ada8` sur `#fbfbf8` ;
- dans `AiModelsTab.tsx`, le champ « Remplacer la clé API » porte encore `name="openrouter_api_key"` alors que la mutation cible `providers[0]`, aujourd’hui Mistral ;
- la description du template `pricing.references.diagnose` affiche « Aucun appel direct, clé globale historique », désormais faux depuis que le vertical `pricing.references.watch.summarize` consomme ce prompt ;
- `AiModelsTab.tsx` sélectionne le fournisseur par `providers[0]` (ordre alphabétique), ce qui rend l’écran dépendant d’un tri implicite.

### 1.3 Preuves de cet audit

| Couche | Preuve |
| --- | --- |
| Code | Lecture des fichiers listés, `shared/schemas/ai.schema.ts`, `frontend/src/services/ai.ts`, `backend/src/services/ai/aiRunContext.ts` |
| Documents | `docs/architecture-cible-cir-cockpit.md` §4.3, §10, §11.5, §15.3 ; `docs/IA_AGENTIQUE/README.md` et `plan-refonte-agentic-first.md` ; `docs/ASSISTANT_IA/plan-mistral-assistant-transversal.md` ; `docs/UI_UX/plan-refonte-ui.md` T5.5 |
| Runtime | Session super-admin Arnaud FERRON, agence CIR Bordeaux, 2026-08-16, Chrome DevTools sur `http://127.0.0.1:3000/admin` |
| Skills | `cir-cockpit-agent-router`, `cir-cockpit-design`, `layers-intro`, `layers-orient` |

Le rejeu navigateur n’a pas modifié de donnée. Les mutations (enregistrer clé, publier prompt, basculer un accès) n’ont pas été exécutées.

### 1.4 Contraintes respectées

- AGENTS.md : worktree sale préservé, pas de commit ni push.
- Design : tokens, densité et règles PO (Dialog centré, pas de Sheet, français, vouvoiement, plancher 11 px).
- Contrats tRPC et gouvernance backend (`ai.settings.*`, `ai.prompts.*`, `ai.usage.*`, `ai.access.*`) non modifiés.
- T5.5 du plan UI (`docs/UI_UX/plan-refonte-ui.md`) identifie déjà admin-ai comme jamais passé en design. Cette tâche cosmétique (reformater le JSX, remplacer `<select>` / `<table>`) **ne suffit pas** au mandat PO.

---

## 2. Verdict

La Gouvernance IA n’est pas un produit inachevé : c’est **une console de l’assistant 2026-07 encore montée**, avec le vertical watch recousu dedans.

Le backend sait ce qu’il gouverne : capacité → modèle assigné → fournisseur, prompt versionné, quota (y compris wildcard), réservation, usage. L’UI raconte encore l’ancien monde : *un* fournisseur (`providers[0]`), un « défaut provider », quatre features figées, six sous-onglets qui exposent des tables plutôt que des décisions.

Les données live le prouvent :

- 65 des 66 appels sur 30 jours sont tagués `assistant.referentiels` (chat retiré à l’étape 3) ;
- le seul run utile du jour (watch, 24 277 tokens, 0,0132 USD, 16 août 11:11) est affiché sous la phrase « Aucun appel direct, clé globale historique » ;
- deux modèles se prétendent « Défaut provider » ;
- le quota serré du parcours live (10 USD / mois) n’est pas observable en consommation.

Repeindre les onglets sans figer les objets serait la mauvaise refonte.

---

## 3. Diagnostic Layers

Cadre : Layers of Product Design. L’audit oriente ; il ne tranche pas les décisions de modèle à la place du PO.

| Couche | État | Lecture |
| --- | --- | --- |
| Comportement observé | Faible | Jugement PO + une session authentifiée + axe-core. Pas de traces d’usage admin (qui ouvre quoi, quelle erreur bloque un run). |
| Domaine | Partiel | Le domaine backend est clair. Le vocabulaire écran est périmé (OpenRouter, « clé globale historique », « défaut provider »). |
| Besoins utilisateur | Supposé | Job implicite : le super-admin doit *savoir si l’IA peut tourner*, *qui a le droit*, *combien ça coûte*, *quel prompt est publié*, *pourquoi un appel a échoué*. Jamais écrit. |
| Stratégie produit | Partiel | Architecture §10 et plan agentique sont solides. Cette surface n’a jamais été conçue comme produit ; elle a survécu au cutover étape 3 « gouvernance conservée ». |
| **Modèle conceptuel** | **Faible — goulot** | L’écran et le runtime ne parlent pas des mêmes objets. |
| Structure d’interaction | Faible | Six sous-onglets plats, formulaires inline, `window.confirm`, pas de deep-link, pas de détail d’événement. |
| Surface | Faible | Copie héritée, selects natifs, Prompts seul îlot un peu soigné. Contraste 10 px de la session PO non reproduit à l’identique au rejeu. |

**Goulot : le modèle conceptuel.** Tant que « fournisseur », « modèle par défaut », « feature » et « prompt » ne sont pas les objets que le runtime utilise vraiment, toute refonte visuelle reproduira les défauts déjà constatés — et en créera d’autres dès l’étape 5 (DBOS) et l’étape 6 (chat).

---

## 4. Modèle réel versus modèle affiché

### 4.1 Ce que le runtime résout

`backend/src/services/ai/aiRunContext.ts` :

```text
capacité (feature)
  → affectation persistée (ai_feature_model_assignments)
  → modèle
  → fournisseur + secret
  → prompt publié
  → quota / réservation
  → usage
```

Alias volontaire du vertical live :

```ts
export const REFERENCE_WATCH_FEATURE = "pricing.references.diagnose" as const;
```

Le chemin produit s’appelle `pricing.references.watch.summarize` dans la stack. La feature canonique consommée reste `pricing.references.diagnose`. Inventer une 5ᵉ clé frontend `watch.summarize` serait un mensonge contraire au backend.

### 4.2 Ce que l’UI inverse

- elle part d’un fournisseur unique `providers[0]` (tri alphabétique : aujourd’hui Mistral avant OpenRouter) ;
- elle édite un « défaut provider » que le runtime n’utilise qu’en *repli* s’il n’y a pas d’affectation ;
- `ai.settings.get` **ne renvoie pas** `ai_feature_model_assignments`, alors que la table existe, que `aiFeatureModelAssignmentSchema` existe, et que le vertical watch s’en sert ;
- le catalogue écran est un `Record` figé dans `aiAdminUi.tsx` : quatre features, dont le sous-titre de `pricing.references.diagnose` nie tout appel direct.

Conséquence : un super-admin peut croire qu’il a configuré le bon modèle / le bon prompt / le bon quota, et le runtime peut en résoudre un autre. C’est plus grave qu’un problème de pixels.

### 4.3 Objets du domaine absents de l’écran

| Objet runtime | Présent en UI | Note |
| --- | --- | --- |
| Fournisseur (N) | Un seul, implicite | `providers[0]` |
| Modèle | Liste + défaut | Deux défauts live |
| Affectation feature → modèle | Non | Hors contrat `get` |
| Prompt template + versions | Oui (meilleur onglet) | Copy de surface fausse |
| Grant (membre / agence / global) | Oui | Pas de retour à l’héritage |
| Quota nommé | Oui | Pas de wildcard, pas de conso |
| Quota wildcard (`feature = null`) | Non | Le runtime l’utilise déjà |
| Réservation / idempotence | Non | Étape 4 close |
| Événement d’usage inspectable | Liste plate | Pas de `request_id`, modèle, prompt, erreur |
| Politique provider / ZDR / classification | Non | Architecture §10.6 |
| Niveau `shadow → supervised → autonomous` | Non | Décision §15.3 |
| Proposition / approbation (DBOS) | Non | Étape 5 suivante |

Le vocabulaire canonique de l’architecture (§6.1) ne nomme pas ces objets de gouvernance. Ils existent pourtant dans le schéma et le runtime.

---

## 5. Audit par surface

Les chiffres ci-dessous sont ceux de la session du 2026-08-16, compte `a.ferron@cir.fr`, super-admin.

### 5.1 Barre Administration — onglet « IA »

Source : `AdminPanel.tsx`. Le trigger contient `<span>IA</span>`.

Rejeu accessibilité :

- l’arbre Chrome expose `tab "IA"` avec nom accessible « IA » ;
- largeur mesurée : 20,9 px, span 12,9 px — label trop court pour une entrée produit ;
- le défaut PO « pas de texte visible aux lecteurs d’écran » **n’a pas été reproduit** sur cet élément au rejeu ;
- Ctrl+K « gouvernance IA » → **aucun résultat** ;
- Ctrl+K « IA » → le client *AQUITAINE ELECTRIQUE…* (sous-chaîne), **pas** la gouvernance.

L’onglet s’appelle « IA », le titre interne « Gouvernance IA ». Ni l’un ni l’autre n’est dans la palette, pourtant entrée préférée du PO pour la navigation globale.

### 5.2 Vue d’ensemble

Données live :

| Métrique | Valeur |
| --- | --- |
| Fournisseur | Mistral · Actif |
| Clé API | Enregistrée ••••VntC · dernier test 16 août 2026, 11:11 |
| Modèle affiché | Mistral Large 3 · `mistral-large-2512` (défaut provider, pas l’affectation) |
| Coût 30 jours | 0,5869 USD · 66 appels |
| Tokens | 1 064 269 · **14 appels en échec** |

Défauts d’interaction :

- les 14 échecs (~21 %) sont un détail sous « Tokens », pas une alerte ;
- la 5ᵉ métrique passe à la ligne : le bloc a l’air incomplet ;
- aucune réponse à « le vertical watch peut-il tourner maintenant ? » (clé + modèle *assigné* + prompt *publié* + quota restant) ;
- « Tester le fournisseur » ne teste pas : il change d’onglet ;
- l’écran additionne `input + output + cached + reasoning`, alors que l’étape 4 a arrêté de les mélanger côté facturation ;
- pas d’alerte budget à 80 % sur cette session (sous le seuil, ou non calculée pour le quota à 10 USD).

### 5.3 Fournisseur & modèles

C’est l’écran le plus dangereux.

Deux modèles, **tous les deux** badge « Défaut provider » :

| Modèle | Identifiant | Prix entrée / sortie | Suppression |
| --- | --- | --- | --- |
| Mistral Large 3 | `mistral-large-2512` | 0,5 / 1,5 USD | impossible (grisée) |
| Mistral Small 3.2 24B | `mistralai/mistral-small-3.2-24b-instruct` | 0,075 / 0,2 USD | impossible (grisée) |

Le second identifiant est un slug OpenRouter. Les deux suppressions sont bloquées parce que les deux lignes sont « défaut ». Le runtime, lui, prend l’affectation de capacité puis, à défaut, *un* `is_default`.

| Interaction | Problème |
| --- | --- |
| Choix du fournisseur | Aucun. `providers[0]`. Fallback mutation `'openrouter'`. |
| Champ clé | `name="openrouter_api_key"` confirmé en live. |
| Libellé d’édition | « Identifiant OpenRouter » pour `mistral-large-2512`. |
| Température affichée | `0.20000000298023224` (artefact `toString()` d’un float). |
| Affectation feature → modèle | Inexistante. |
| Édition modèle | Formulaire inline, pas un Dialog centré (règle PO). |
| Suppression | `window.confirm`, et de toute façon désactivée sur les deux lignes. |
| Prix cache / reasoning | Dans le schéma, absents du formulaire. |
| `base_url` | Renvoyé tel quel au save, alors que l’étape 4 a interdit un endpoint Mistral personnalisé. |

On ne peut pas « un peu peaufiner » cet onglet. Il doit devenir : **fournisseurs (N) + modèles de chacun + affectation explicite par capacité**.

### 5.4 Accès membres

Cascade réelle : membre → agence → global → défaut système. L’écran la montre en note de bas de page, pas dans l’interaction.

État live :

- sélecteur par défaut : **Assistant référentiels** (feature morte) ;
- défaut global **bloqué** ;
- seul `a.ferron@cir.fr` autorisé, via override membre, **deux fois** (Bordeaux et Paris) avec la **même** conso 65 appels / 0,5738 USD recopiée ;
- comptes E2E / `*.invalid` dans la liste ;
- rôles en slug (`super_admin`, `tcs`) alors que l’onglet Utilisateurs affiche « Super admin » / « TCS » ;
- deux Switch portent le même nom accessible « Accès de FERRON Arnaud ».

Défauts de modèle :

- le Switch membre **écrit tout de suite** un override ;
- `deleteAiAccess` existe dans `frontend/src/services/ai.ts` et n’est branché nulle part — on ne peut pas *revenir à l’héritage* ;
- `<select>` natif et `<table>` HTML brut (T5.5 jamais exécutée) ;
- overrides agence en chips, membres en table : deux objets de même nature, deux formes.

Presque toute la conso 30 jours est encore taguée `assistant.referentiels`. L’écran de droits s’ouvre sur un passé, pas sur le vertical live.

### 5.5 Quotas

Quatre politiques globales, chiffres non formatés, **aucune consommation en face de la limite** :

| Cible | Feature | Plafond mensuel |
| --- | --- | --- |
| Global | Assistant référentiels | 2 000 appels · 20 000 000 tokens · **300 USD** |
| Global | Diagnostic global (le live) | 1 000 · 4 000 000 · **10 USD** |
| Global | Diagnostic classification | 1 000 · 4 000 000 · 200 USD |
| Global | Diagnostic segments | 1 000 · 4 000 000 · 200 USD |

Le formulaire « Créer » :

- s’ouvre **inline**, pas en Dialog ;
- préremplit *Assistant référentiels* ;
- n’offre pas de wildcard (`feature = null`), alors que le runtime partage déjà un verrou entre capacités ;
- n’expose ni plafond quotidien tokens/coût (présents au schéma) ;
- suppression via `window.confirm`.

Le quota à 10 USD du parcours live n’a aucune barre de consommation. L’alerte 80 % de la vue d’ensemble, quand elle apparaît, n’a nulle part où atterrir proprement.

### 5.6 Prompts

Seul onglet qui ressemble à un produit (table, filtres, Dialog centré, cycle de vie). À garder comme *référence de densité*, pas comme modèle métier.

État live des templates disponibles :

| Template | Surface affichée | Appels | 30 j | Dernier usage |
| --- | --- | --- | --- | --- |
| Assistant referentiels CIR | Chat des référentiels tarifaires | 1 242 | 64 | 23 juil. 2026, 06:49 |
| Diagnostic referentiels CIR | **Aucun appel direct, clé globale historique** | 1 | 1 | **16 août 2026, 11:11** |

Archivés :

- Diagnostic Classification CIR — 3 appels, dernier 30 juin 2026 ;
- Diagnostic Segments et Grilles — 2 appels, dernier 28 juin 2026.

KPI d’en-tête (tous templates, y compris archivés) : 2 disponibles, 1 248 appels, 11 105 767 tokens, 4,7833 USD. Ces totaux **depuis toujours** se mélangent aux vues 30 jours des autres onglets.

Dialog *Diagnostic referentiels CIR* (rejeu) :

- sous-titre : « Diagnostic global · Aucun appel direct, clé globale historique » ;
- corps : « Tu es l analyste de veille des referentiels tarifaires CIR… » (version 2 publiée le 16 août 10:35, note « Vertical veille referentiels: sortie citee par fact_id ») ;
- 1 345 caractères, 1 appel, dernier usage 16 août 11:11 ;
- version 1 archivée (27 juin), action « Restaurer en brouillon » sans confirmation ;
- focus du textarea = anneau rouge primaire, lu comme une erreur ;
- « Publier le brouillon » reste le bouton rouge alors qu’il est désactivé.

Autres trous : pas de diff entre versions, pas d’aperçu des `allowed_variables`, pas de lien usage → version servie, badge « Utilisé » identique pour 1 appel et 1 242. Les 4 pastilles d’icônes (document / éclair / loupe pour des tokens) violent la décision déjà prise sur Utilisateurs (T2.3) : plus de pastilles décoratives.

### 5.7 Usage & audit

Synthèse live : 66 appels, 14 échecs, 0,5869 USD, cache 0.

Première ligne utile : **16 août 2026, 11:11 · Diagnostic global · FERRON Arnaud / CIR Bordeaux · `success` · 24 277 tokens · 0,0132 USD**.

Tout le reste visible est *Assistant référentiels* (`success` / `error` / `blocked` en anglais brut). La ligne du 14 août 16:37 (`error`, 48 977 tokens, 0,0272 USD) correspond à la baseline §3.5 du plan agentique (ancien chemin, sortie invalide).

Défauts :

- 100 lignes max, filtrées **côté client**, pas de pagination ;
- lignes non cliquables : pas de `request_id`, modèle, `prompt_version_id`, latence, `error_code` ;
- 3 `<select>` natifs sans `id` ni `name` ;
- filtre membres avec 3 « Duplicate E2E » homonymes ;
- histogramme 31 barres (`<div>` + `title`), sans axe, sans état vide, sans lecture clavier ;
- les membres sont chargés avec la feature **en dur** `assistant.referentiels`.

Pour un écran nommé « Usage & audit », c’est un journal muet.

---

## 6. Accessibilité et contraste — rejeu versus constat PO

| Constat initial (session PO) | Rejeu 2026-08-16 |
| --- | --- |
| Onglet « IA » sans nom accessible | **Non reproduit** sur le trigger. L’arbre a `tab "IA"`. Label trop court, introuvable sous le nom métier. |
| 11 contrastes (2,15 / 3,05 / 4,33 / 4,41), texte 10 px `#b1ada8` sur `#fbfbf8` | **Non reproduit sur `admin-ai`.** `text-muted-foreground` mesuré `rgb(117, 110, 102)`, ratio **4,85:1**. Aucun `text-[10px]` dans le panneau. |
| Recherche | Ctrl+K « gouvernance IA » → 0 résultat. « IA » tombe sur un client. |
| axe-core | 1 issue console : *A form field element should have an id or name attribute (count: 11)*. Les 3 `<select>` d’Usage n’ont ni `id` ni `name`. `axe.run` ciblé sur le panneau : 0 violation WCAG au moment du rejeu. |

Le constat PO reste une preuve de session. Le rejeu montre que le trigger a un nom, mais que **personne ne peut trouver la gouvernance par la palette**, et que les 11 contrastes 10 px ne sont plus (ou pas uniquement) dans ce panneau. Une passe contraste seule ne traite pas le mandat.

---

## 7. Futurs déjà décidés que l’UI ignore

Sources : architecture §10 / §15.3, `docs/IA_AGENTIQUE/plan-refonte-agentic-first.md`, plan Mistral.

| Décision déjà prise | Ce que la gouvernance devra montrer | État UI |
| --- | --- | --- |
| Étape 5 — DBOS `approve → createTask` | Proposition, approbation, tentative d’effet, reprise | Absent |
| Étape 6 — chat agentique | `assistant.referentiels` redevient live (accès, quota, prompt, modèle) | Traité comme si le chat existait encore, sans le dire |
| Runtime multi-provider | Choisir un fournisseur, pas le premier du tableau | `providers[0]` |
| Affectation `feature → modèle` | Une ligne d’affectation par capacité | Table absente du contrat `get` et de l’écran |
| Contrat IA par brique | Chaque brique = feature + décision d’exposition (y compris « aucun outil ») | Enum figé à 4 clés, dont 2 diagnostics archivés |
| `shadow → supervised → autonomous` | Niveau d’autonomie par capacité | Absent |
| Politique provider visible (POC) | Classification, destination des données, ZDR optionnel | Absent |
| Rétention 7 j prompts/réponses, 30 j traces | Ce qui est encore consultable vs déjà expurgé | Absent |
| Coût proportionnel, déterministe sans LLM | Séparer appels modèle / cache / déterministe | Tokens mélangés |
| Preuves et `request_id` | Relier un run à son événement, son prompt, son modèle | Usage non cliquable |

Si on refait l’UI pour *aujourd’hui seulement* (un provider, un prompt watch, quatre features), on devra la refaire à l’étape 5 puis à l’étape 6. Le modèle d’écran doit déjà parler **capacité**, pas « onglet modèles / onglet prompts ».

---

## 8. Ce qu’il ne faut pas faire

1. **Exécuter T5.5 tel quel** (prettier + Select + Table). Cosmétique sur un modèle faux.
2. **Conserver six sous-onglets « parce qu’ils existent ».** La découpe actuelle est une découpe de *tables SQL*, pas de jobs. Un super-admin pense : « est-ce que watch peut tourner ? » puis « qui a le droit ? » puis « quel texte est publié ? » puis « qu’est-ce qui a coûté 0,013 $ ? »
3. **Toucher aux contrats tRPC pour « arranger » l’UI** sans arbitrage. L’affectation n’est pas dans `ai.settings.get` : c’est un trou de contrat, pas un oubli de bouton.
4. **Sheets.** Règle PO : détail = Dialog centré. Prompts le fait déjà.
5. **Inventer des features** (`watch.summarize` comme 5ᵉ clé) dans le frontend alors que le backend a volontairement aliasé sur `pricing.references.diagnose`. La vérité à afficher : *cette capacité sert le vertical watch*.

---

## 9. Ordre recommandé

Pas une maquette d’abord. Trois décisions, dans cet ordre.

### 9.1 Objets et vocabulaire

Une **capacité** a un état (exposable / live / retirée), un modèle assigné, un prompt publié, des grants, une politique de quota, éventuellement un niveau d’autonomie.

Un fournisseur n’est pas « l’écran ». Un modèle n’est pas « le défaut ». Une feature morte ne doit pas être le défaut de tous les sélecteurs.

Vocabulaire français à figer (proposition, non tranché) :

| Terme écran actuel | Terme à décider |
| --- | --- |
| IA | Gouvernance IA |
| Fournisseur & modèles | Fournisseurs, modèles, affectations |
| Défaut provider | Modèle de repli / modèle assigné à la capacité |
| Fonctionnalité | Capacité |
| Assistant référentiels | Capacité retirée jusqu’à l’étape 6, ou « Chat (retiré) » |
| Diagnostic global | Veille référentiels (vertical watch) |
| Aucun appel direct… | Surface réelle : synthèse de veille d’un run de diff |

### 9.2 Places et flux

Une page Gouvernance avec une **situation opérationnelle** en tête (peut-on servir le vertical live ?), puis des Dialogs pour éditer fournisseur, modèle, affectation, prompt, quota, grant, événement.

Exigences d’interaction :

- deep-linkable (sous-vue dans l’URL ou la palette) ;
- confirmation sur publish / delete / révocation ;
- retour à l’héritage pour un grant ;
- conso affichée contre chaque quota ;
- événement d’usage inspectable (`request_id`, modèle, version de prompt, erreur).

### 9.3 Surface

Tokens CIR, plancher 11 px, plus de `10px`, plus de `<select>` natif, contraste 4,5:1, libellé d’onglet accessible et trouvable dans Ctrl+K, densité alignée sur Utilisateurs (T2.3). Les cinq défauts déjà constatés par le PO tombent naturellement ici et en 9.1. Ils ne justifient pas à eux seuls une refonte.

Prochaine technique utile : `/layers-conceptual-model` — objets, états, vocabulaire — avant toute maquette.

---

## 10. Décisions à trancher avant implémentation

1. **Contrat.** Cette refonte a-t-elle le droit de *demander* un enrichissement (exposer les affectations dans `ai.settings.get`, ou une procédure dédiée), ou reste-t-on strictement dans le contrat actuel et on documente les trous ?
2. **Découpe.** Garde-t-on six sous-onglets, ou une situation opérationnelle + Dialogs par objet ?
3. **Features mortes.** Comment l’écran parle-t-il d’`assistant.referentiels` et des deux diagnostics archivés jusqu’à l’étape 6 ? Masqués, marqués « retirés », ou encore éditables ?
4. **Affectation.** Qui choisit le modèle d’une capacité : l’écran Gouvernance (après extension de contrat), ou un défaut unique tant que le contrat n’expose pas la table ?

Aucune de ces décisions n’autorise code, migration, commit ou push.

---

## 11. Périmètre, preuves, non-exécuté

| | |
| --- | --- |
| Périmètre | Audit UI/UX de `frontend/src/components/admin-ai/` et de son montage Admin. |
| Preuves exécutées | Lecture code + documents canoniques. Rejeu Chrome authentifié, six sous-onglets, Dialog prompt, Ctrl+K, mesures de contraste et d’arbre d’accessibilité. |
| Validations non exécutées | `cir-cockpit-qa-validation` / `qa:front` : hors sujet, aucun code livré. Playwright : non demandé. MCP Supabase : non connecté, non nécessaire à l’audit UI. |
| État local | Worktree déjà sale en début de session. Ce fichier est un ajout documentaire demandé. |
| État distant | Non modifié. |
| Runtime | Observé en lecture seule sur `http://127.0.0.1:3000/admin`. |
