# Audit et proposition — Socle agentique CIR Cockpit

| Élément | Valeur |
| --- | --- |
| Statut | Revue contradictoire historique, intégrée au plan vertical-first le 2026-08-14. Ne décrit plus l'état canonique courant. |
| Date | 2026-08-14, Europe/Paris |
| Périmètre | Lecture seule du corpus `docs/IA_AGENTIQUE/`, de l'architecture cible, du code IA / tRPC / diffs / tâches réellement présents, et des documentations primaires du 14/08/2026 |
| Autorité | `docs/architecture-cible-cir-cockpit.md` reste la source de vérité produit. Le plan actif reste `plan-socle-agentique.md` jusqu'à adoption explicite. |
| Implémentation | **Interdite** par ce document. Aucun code, dépendance, migration, commit ou déploiement n'est autorisé ici. |

Ce fichier rassemble :

1. l'audit du plan SA-0…SA-8 et des ADR 0001–0004 ;
2. la proposition de socle pour un Cockpit vraiment agentic-first, fiable et factuel ;
3. l'ouverture vers le cycle complet : clients, visites, devis, commandes, puis mails Outlook, retranscriptions d'appels et rapports de visite.

> **Résolution :** la direction verticale de cet audit a été retenue, sans
> adopter son `ContextPack` transversal anticipé ni sa renumérotation AF. Le plan
> canonique révisé reste `plan-socle-agentique.md`. Les constats ci-dessous
> décrivent le plan tel qu'il existait avant cette résolution.

---

## 0. Comment lire ce document

| Document | Rôle |
| --- | --- |
| `docs/architecture-cible-cir-cockpit.md` §§10, 11, 13 | Doctrine produit. En cas d'écart, elle prime. |
| `plan-socle-agentique.md` + ADR 0001–0004 | Plan et arbitrages **actuellement canoniques**. |
| **Le présent fichier** | Revue indépendante du 14/08/2026 et cible de socle proposée. |

Décision attendue du PO, au choix :

- **conserver** le plan SA et n'ouvrir SA-1 qu'après amendements listés en §3 ;
- **adopter** la proposition AF (§5–§9) comme prochain plan d'exécution, par décision explicite.

Aucune des deux n'est déclenchée par la simple existence de ce fichier.

---

## 1. Destination produit

CIR Cockpit devient agentic-first lorsque le travail arrive **sur l'objet ouvert** et dans **Ma journée**, à partir de faits déterministes, et non lorsqu'un chat « connaît toute la base ».

Un commercial n'ouvre pas un assistant pour savoir si SKF a bougé ou si la visite d'hier est sans prochain pas. Le produit pose une carte sourcée :

> Snapshot B vs A : 42 remises HA ont changé, 6 sont hautes, 2 grilles manquent. Tâche interne proposée. Sources : `run_id`…

Le chat reste une porte de question. Ce n'est plus le centre.

Trois règles non négociables :

1. **Le modèle ne calcule jamais un fait.** Il ne voit qu'un paquet déjà prouvé.
2. **Une absence reste une absence.** Jamais `0`, jamais « probablement ».
3. **Aucune écriture sans objet métier durable** et sans politique déterministe. Aucun score de confiance auto-attribué par le modèle n'autorise une mutation.

Cible à terme, **sans tout construire aujourd'hui** : organisations / clients, activités et rapports de visite, tâches, opportunités, devis, commandes, puis mails Outlook, retranscriptions d'appels, pièces jointes. Un seul contrat de preuves et une seule inbox. Chaque brique ajoute son paquet ; on n'invente pas un second agent.

---

# Partie I — Audit du plan IA_AGENTIQUE actuel

## 2. Ce qui a été lu et recoupé

### Corpus

- `docs/IA_AGENTIQUE/README.md`
- `docs/IA_AGENTIQUE/plan-socle-agentique.md` (SA-0 à SA-8, décisions SA-D01 à SA-D16)
- ADR 0001 (noyau de capacités), 0002 (runtime Deno), 0003 (multi-provider), 0004 (propositions et autonomie)
- Architecture cible : §§3.1, 4.3, 5, 6, 8.7, 10.1–10.6, 11.1–11.2, 13 Socle 1, journal 2026-08-13 (POC + clôture Brique 3)

### Code réellement présent (14/08/2026)

- Backend unique Deno / Hono / tRPC, Edge Function `api`, `backend/deno.json` **sans** paquet `ai`
- Assistant : `assistantBroker.ts` (`MAX_TOOL_ROUNDS = 12`, `OVERALL_TIMEOUT_MS = 180_000`), `mistralAdapter.ts`, gouvernance, quotas, grants `assistant.referentiels`
- Outils déjà branchés sur les **mêmes** services que tRPC : diffs, imports, anomalies, santé
- SQL transitoire : `execute_readonly_sql` + catalogue / describe / search_schema, sous rôle `authenticated`, READ ONLY, 5 s, 50 lignes
- Diffs référentiels : `computePricingReferenceDiff`, summary / list / aggregate, payload `before` / `after` / `labels` / `source_row_numbers`, sévérité déterministe
- Tâches : `createTask` idempotent via `idempotency_key` = `tasks.id` ; `actor_kind` `user` ou `system` ; **pas** de preview
- `ai_request_reservations` : registre technique (feature, statut, coût, `response`, TTL)
- `pg_cron` déjà utilisé (audit, hardening IA). Aucun `pgmq`, outbox agentique, ni `invokeCapability`

### Sources primaires externes (vérifiées le 14/08/2026)

Voir §12.

## 3. Verdict d'audit

**NO-GO SA-1 tel que rédigé.**

La simplification Deno / monolithe / pas de Workflow SDK / pas de second runtime est la bonne cible. Le premier incrément proposé reste un **noyau d'orchestration trop tôt**.

Contradiction interne du plan :

- la première preuve verticale (§6 du plan) décrit un enchaînement **déterministe puis LLM** : le moteur calcule le diff, le modèle reçoit uniquement ce résultat, puis synthétise ;
- SA-1 et SA-3 décrivent l'inverse : `invokeCapability`, deux appelants branchés, spike AI SDK (boucle d'agent, `inputSchema`, approbations, registre de providers, OpenTelemetry).

Le seam réel existe déjà : tRPC et les outils IA appellent les mêmes fonctions typées (`getPricingReferenceDiffSummary`, `listPricingReferenceDiffs`, `aggregatePricingReferenceDiffs`, `listPricingReferenceImports`, `createTask`). Un `invokeCapability(context, name, input)` ajouterait un localisateur par chaîne, moins sûr que les imports actuels.

**Décision défendable issue de l'audit :** retenir la doctrine (Deno unique, requête / commande, pas de SQL nouveau, proposition dédiée, autonomie déterministe, déclenchement manuel d'abord). Ne pas ouvrir SA-1 tant que le premier incrément n'est pas une tranche verticale `shadow` sur les services existants.

## 4. Conserver, supprimer, modifier (plan actuel)

### Conserver

| Élément | Pourquoi |
| --- | --- |
| Monolithe Deno, pas de second runtime, pas de Docker pour le POC | Aligné avec le backend réel et le cadre 0 € |
| Distinction requête / commande, idempotence, réévaluation à l'exécution | `createTask` est déjà idempotent |
| Interdiction de SQL / MCP au modèle sur le **nouveau** parcours | `execute_readonly_sql` existe et reste trop large |
| Proposition métier ≠ `ai_request_reservations` | Cycles de vie incompatibles |
| Autonomie par matrice déterministe, jamais par score LLM | Doctrine utile ; le reste de CompAI ne l'est pas |
| Déclenchement manuel jusqu'à preuve ; chaîne async plus tard | Correct |
| Gouvernance existante (quotas, grants, coûts, traces) | Ne pas la dupliquer |
| Retrait progressif du SQL après parité | Pas de big bang |

### Retirer du chemin critique SA-1 → SA-4

- `invokeCapability` comme livrable SA-1
- le protocole d'approbation AI SDK comme enveloppe de la proposition CIR
- OpenTelemetry / `@ai-sdk/otel` comme critère d'adoption
- `createProviderRegistry` comme motif d'adoption
- le double spike SA-5 `pgmq` + cron dès la première veille
- CompAI comme modèle d'implémentation (eve, Docker, Gateway, agent séparé)
- cinq états de proposition figés avant le premier write (`expired` / `executed` peuvent être dérivés)

### Modifier si le plan SA est conservé

- **SA-1** : procédure isolée hors `assistantBroker`, appels typés, zéro SQL, zéro nouvelle table, `shadow` seulement
- **SA-2** : projection « faits pour le modèle » sur le moteur de diff **existant**, pas une réécriture
- **SA-3** : synthèse one-shot d'abord ; spike AI SDK seulement si une boucle s'avère nécessaire **et** que Deno tient
- **SA-4** : table 3 états + clé métier déterministe vers `createTask`
- **SA-7** : le nouveau parcours ne voit jamais `execute_readonly_sql`
- **Contrat IA Brique 3** : aujourd'hui **vide** (journal 2026-08-13). Toute création de tâche par l'agent rouvre ce contrat

## 5. Erreurs factuelles relevées

| Affirmation du corpus actuel | Réalité au 14/08/2026 |
| --- | --- |
| « 7 659 diffs observés le 2026-08-13 » | Introuvable dans le dépôt. Observation hors repo, à recompter. |
| « requête listant les snapshots comparables » | Pas de `snapshots.list`. Il existe imports, resolve de base, resolve de run. |
| « commande prévisualisant une tâche » | `createTask` n'a pas de preview. L'idempotence est un replay de création. |
| AI SDK « demandes d'approbation » | `needsApproval` est déprécié au profit de `toolApproval`. Flux conversationnel (deux appels modèle + messages), pas un objet métier durable. |
| « hooks OpenTelemetry » | En AI SDK 7, télémétrie hors du paquet `ai` : `@ai-sdk/otel` + `registerTelemetry`. Cible documentée Next/Node, pas Deno Edge. |
| Compatibilité Deno d'AI SDK comme simple spike | Aucune page Getting Started Deno. Cibles officielles : Next, Node, Expo, TanStack, Svelte, Vue. |
| « aucun outbox, pgmq, worker » | Vrai pour un runtime agentique. `pg_cron` existe déjà dans les migrations. |
| Timeout assistant implicite compatible Edge Free | Broker à 180 s et 12 tours. Limites Free officielles : **150 s** wall-clock, **150 s** idle, **2 s CPU**, 256 Mo, bundle 20 Mo. |
| CompAI comme confirmation d'architecture | Seule la règle « pas de score de confiance » est transférable. |
| Tracer bullet « list + diff sourcé » comme nouveauté | `pricing.references.diffs.summary` / `.list` / `.aggregate` existent déjà côté tRPC **et** outils. |

Points justes à ne pas relâcher : SQL transitoire contraire à la cible ; réservations ≠ proposition ; `pgmq` ne réveille rien ; ZDR n'est pas un gate global du POC.

## 6. Risques et angles morts avant tout code

1. **CPU Edge 2 s.** Relire ou agréger un gros run **et** appeler Mistral dans la même requête peut tuer l'isolate. L'agent doit **lire un run déjà calculé**, jamais recalculer le diff.
2. **Identité non interactive.** `createTask` exige agence, `created_by`, `actor_kind`. Un cron n'a pas de JWT. Responsable, agence et grant ne sont pas tranchés.
3. **Clé d'idempotence.** Un UUID neuf à chaque retry crée une nouvelle tâche. La clé doit être métier et déterministe.
4. **Contrat IA Brique 3 vide** vs écriture de tâche.
5. **`execute_readonly_sql` reste dans l'assistant actuel.** Le nouvel agent doit être un entrypoint **séparé**.
6. **Bundle unique `api`.** `ai` + `@ai-sdk/mistral` + éventuellement `@ai-sdk/otel` risquent la limite 20 Mo et des APIs Node absentes.
7. **Coût Mistral.** `providerCostAmount` est déjà `null` dans l'adaptateur.
8. **RLS des propositions.** Les réservations sont `service_role` only. Une inbox visible exige RLS agence.
9. **Injection indirecte** via `payload.labels` / `before` / `after` (et, plus tard, corps de mail ou CR de visite).
10. **« Local et interruptible » vs veille.** `pg_cron` + Vault + `pg_net` impliquent un projet hébergé.
11. **Outbox cible (§11.2) vs « pas d'outbox POC ».** À dire clairement : cible produit, pas prérequis du premier parcours.
12. **Briques 4 et 5 non livrées.** Un agent « plein contexte » qui parle devis / commandes aujourd'hui invente. Le paquet doit dire `missing`.

---

# Partie II — Proposition de socle

## 7. Ce que « agentic first » veut dire ici

Pas un chatbot unique qui connaît la base. Trois présences, partout où il y a un objet CIR :

1. **Sur la fiche** — le contexte de page est l'objet ouvert + les lectures autorisées, jamais le CRM entier.
2. **Dans Ma journée** — cartes poussées, chacune disant **pourquoi** elle est là (déjà dans l'archi §8.7).
3. **Dans l'action** — l'IA prépare, l'humain confirme. Jamais d'écriture silencieuse sur un devis, une commande, un mail sortant.

« Tout le contexte » n'est **pas** un dump. C'est l'assemblage à la demande du **graphe utile**, sourcé et borné.

```text
Organisation
  ├─ rôles, compte, contacts, profil métier
  ├─ Activités (visites, appels, comptes rendus)
  ├─ Tâches
  ├─ Opportunités (facultatives)
  ├─ Devis → Commandes
  └─ conditions / historique tarifaire utile
     + plus tard : fils Outlook, retranscriptions, pièces
```

Quand on est sur **la visite d'hier chez Dupont**, le paquet n'est pas « tout Dupont depuis 2012 ». C'est :

| Couche | Contenu | Règle |
| --- | --- | --- |
| Ancre | activité + contact + organisation | objet ouvert |
| Mémoire utile | 3–5 dernières activités, tâches ouvertes | ne pas redemander |
| Enjeu | opportunités ouvertes, devis en cours, dernière commande | aider en profondeur |
| Offre | familles / marques **citées ou liées** seulement | pas le catalogue |
| Canaux (plus tard) | extraits mail / appel **liés à cet objet** | pas la boîte entière |
| Trous | champs manquants, contradictoires, périmés | les dire, ne pas les remplir |

Chaque morceau est une **requête typée** de la brique propriétaire, avec preuve. Si le devis n'existe pas encore dans le produit, le paquet dit `missing`. C'est le contrat IA par brique (§10.2) : une brique sans usage réel reste vide ; une brique livrée **ajoute son paquet**, elle ne réécrit pas l'agent.

## 8. Architecture du socle

```text
Événement métier            Moteur déterministe             Paquet de faits
(import, snapshot,          (diffs, tâches, RLS,            Fact | Missing | Ambiguous
visite, mail lié,           agrégats, plus tard             + sources + limites
devis échu)                 devis / commande)                       │
        │                           │                               │
        └───────────────────────────┴───────────────┬───────────────┘
                                                    ▼
                                       Synthèse structurée (1 tour)
                                       résumé sourcé + priorités
                                       + proposition typée
                                       ou « preuve insuffisante »
                                                    │
                         ┌──────────────────────────┼──────────────────────────┐
                         ▼                          ▼                          ▼
                      shadow                   supervised                 autonomous
                 rien n'est écrit          proposition persistée        politique dit OUI
                                           inbox humaine                1 commande interne
                                           approve → createTask         déjà éprouvée
```

Deux surfaces, un seul contrat de faits :

- **Inbox agent** (Ma journée) : cartes à traiter.
- **Chat** : les mêmes lectures, jamais de SQL, jamais d'écriture directe.

L'assistant actuel (`assistantBroker`, 12 tours, 180 s, SQL) **reste**. Le nouvel agent est un entrypoint isolé. On ne greffe rien dans le broker.

### Primitive de fiabilité (2026)

La primitive moderne à prendre n'est pas une boucle d'outils ni un moteur de workflow. C'est la **sortie structurée** : schéma Zod → JSON validé (côté Mistral : `response_format` / tool forcé, déjà utilisé pour `classify_assistant_request` ; côté AI SDK 7 : `Output.object`, plus tard et seulement si Deno tient).

### Ce que le socle n'adopte pas

| Techno au 14/08/2026 | Motif |
| --- | --- |
| AI SDK `WorkflowAgent` / Workflow DevKit | Runtime Vercel (`'use workflow'`, `start()`, `getWritable()`). Incompatible avec l'Edge Function Deno unique et le cadre sans nouvel hébergement. |
| Mistral Agents API comme plan de contrôle | Connecteurs, mémoire et MCP côté fournisseur. Perte de contrôle des preuves et des données. |
| MCP comme bus interne | Adaptateur externe possible plus tard. Dangereux comme accès base. |
| `invokeCapability` dès le jour 1 | Troisième chemin d'appel, moins typé. Extraire un registre seulement au 2ᵉ commande réelle. |
| `toolApproval` / `needsApproval` comme gouvernance métier | Protocole conversationnel, pas une proposition Postgres. |
| `@ai-sdk/otel` | Cible Node/Next. CIR a déjà réservations, coûts, traces. |
| Temporal, Restate, LangGraph, Mastra, eve / CompAI runtime | Second runtime avant le premier parcours prouvé. |
| `pgmq` dès la première veille | Queue passive. Le réveil est `pg_cron` + `pg_net`. |

AI SDK Core (`ai` + `@ai-sdk/mistral`) n'est **pas** un prérequis. Spike local seulement : `deno check` dans `api` + un scénario `Output.object`. Adopté uniquement s'il **supprime** du plumbing. L'adaptateur Mistral reste la référence.

## 9. Contrat transversal du paquet (le vrai socle)

À figer **avant** le premier code, dans `shared/` le jour où l'implémentation sera autorisée.

```ts
type EvidenceKind = "fact" | "missing" | "ambiguous"

type Source = {
  object:
    | "pricing_reference_diff"
    | "import"
    | "snapshot"
    | "organization"
    | "activity"
    | "task"
    | "opportunity"
    | "quote"
    | "order"
    | "mail_thread"      // futur, brique Canaux
    | "call_transcript"  // futur, brique Canaux
    | "visit_report"
  id: string
  observed_at: string
  run_id?: string
  snapshot_id?: string
}

type Evidence = {
  kind: EvidenceKind
  field: string
  value?: unknown
  candidates?: unknown[]
  source: Source
}

type ContextPack = {
  anchor: { type: string; id: string }
  memory: Evidence[]
  stakes: Evidence[]
  offer: Evidence[]
  channels: Evidence[]
  gaps: Evidence[]
}
```

Règles du paquet :

- toute phrase du modèle doit citer un `source` ;
- `missing` et `ambiguous` sont des résultats valides, pas des échecs ;
- budgets de lignes / octets / tokens par couche, jamais un graphe illimité ;
- les champs sensibles (marges, BFA, données personnelles, corps de mail) sont classifiés **avant** assemblage ;
- une brique non livrée produit `missing`, jamais une valeur inventée.

## 10. Plan d'exécution proposé (AF)

Remplace SA-1…SA-8 **seulement après GO PO**. Les numéros AF évitent la confusion avec SA.

### AF-0 — Verrous produit (décision, pas de code)

- Rouvrir le **contrat IA Brique 3** : l'agent peut *proposer* une tâche interne, pas une tâche Tier, pas un mail, pas une activité, pas un devis.
- Acteur : en manuel = l'utilisateur ; en cron = `actor_kind: system` + responsable d'agence configurable.
- Données POC personnelles OK ; production = gate provider à part (SA-D14 / décisions 16–20 de l'architecture restent valides).
- Adopter le contrat `Evidence` / `ContextPack` comme règle d'archi, y compris pour les briques futures.

Sans AF-0, on code un produit interdit par le journal du 13/08.

### AF-1 — Paquet de faits (premier vertical qui existe)

Pas un noyau d'orchestration. Une **projection** sur le moteur de diff déjà là.

Livrable : `buildReferenceWatchFacts(runSelector)` qui s'appuie sur `before` / `after` / `labels` / `source_row_numbers` / `skipped_file_kinds`. Elle borne le volume (top N par sévérité + totaux), n'invente rien, distingue fichier sauté, objet absent, valeur nulle.

Tests d'abord : corpus simple, ambigu, incomplet, volumineux. **Recompter** les diffs du run réel ; ne plus citer 7 659 sans preuve.

**GO** quand un humain relit le JSON et retrace chaque phrase sans le modèle.

### AF-2 — Agent `shadow` isolé

Nouvelle procédure hors broker, par exemple `ai.watch.references` :

1. charge le paquet AF-1 (run **déjà calculé**) ;
2. un seul appel Mistral, sortie Zod (`summary` sourcé, `priorities`, `proposed_task | null`, `unresolved`) ;
3. refuse toute citation sans source ;
4. zéro INSERT métier ; réservation IA uniquement (retry sans double paiement).

UI minimale : panneau Référentiels + carte en lecture sur Ma journée.

Bornes : timeout ≪ 150 s, 1–2 tours max, hors `execute_readonly_sql`.

**GO** quand : retry = même synthèse ; aucune mutation ; 0 hallucination sur le jeu d'éval (dont cas hostiles : consigne cachée dans un libellé) ; CPU / durée sous limites Free.

### AF-3 — Inbox supervisée

Table courte, pas un ledger :

- type, payload borné, `evidence`, clé métier, états `proposed` | `approved` | `rejected`
- `expires_at` en colonne, pas un état
- `task_id` quand exécuté, pas un état `executed`

Clé d'idempotence = UUID déterministe de  
`(watch.references, base, target, object_key, action)`.

Commandes tRPC distinctes `approve` / `reject`. À l'approve : réévaluer droits, agence, fraîcheur du run, puis `createTask`.

**GO** quand double-clic, crash avant/après insert, et concurrence = une seule tâche.

### AF-4 — Veille courte

Pas de worker. Pas de `pgmq` au premier jet.

1. Déclencheur : import activé / snapshot cible (événement déjà prévu dans l'archi).
2. Réveil : `pg_cron` → `pg_net` → Edge, secret dans Vault.
3. L'Edge relit le dernier run, rejoue AF-2/AF-3, s'arrête.
4. Fallback manuel conservé.

`pgmq` seulement après pertes ou recouvrements observés. Database Webhooks (`pg_net` sur trigger) est une alternative plus simple pour `snapshot_activated`.

### AF-5 — Autonomie limitée, gagnée

Matrice **code**, pas prompt :

| Condition | Mode |
| --- | --- |
| Preuve incomplète ou ambiguë | supervised |
| Impact = tâche interne + sévérité haute + run frais | autonomous possible |
| Tâche Tier, mail sortant, devis, commande, action externe | interdit |
| Score / « je suis sûr » du modèle | ignoré |

Autonomie = appeler `createTask` déjà éprouvé, avec la même clé. Rien d'autre.

**GO** après mesure : faux positifs, coût, refus, qualité sur le corpus AF-1.

### AF-6 — Convergence chat

Le chat Référentiels consomme AF-1. L'outil SQL meurt après parité mesurée, pas avant. On n'étend pas le broker ; on le réduit.

### AF-7 — Runtime durable (peut-être jamais)

Seulement si un cas réel exige attente longue, multi-étapes externes, ou reprise au milieu d'un appel modèle. Alors comparer Workflow SDK / Temporal / `pgmq` **sur mesures**. Pas avant.

### Première semaine après GO AF-1

1. Clore AF-0.
2. Compter les diffs du run actuel.
3. Schéma `Evidence` + 4 fixtures.
4. `buildReferenceWatchFacts` + tests, sans LLM.
5. Procédure `shadow` + 1 tour Mistral JSON + panneau lecture.
6. Jeu d'éval : ≥ 10 cas dont 3 hostiles.

Pas de nouvelle dépendance. Pas de migration avant AF-3. Pas de modification de `assistantBroker.ts`.

---

# Partie III — Comment le socle porte toute la suite

## 11. Aide profonde par objet (cible, pas le sprint 1)

Le socle AF-1…AF-3 ne livre pas ces paquets. Il livre le **format** qui permet de les ajouter sans nouvel orchestrateur.

| Objet | Paquet | L'agent prépare | L'agent n'écrit jamais seul |
| --- | --- | --- | --- |
| Organisation / client | brief : qui, dernières visites, ouvertures, trous | fiche avant appel, tâches internes | changement de rôle, fusion de fiches |
| Activité / rapport de visite | visite + 3–5 échanges + enjeux ouverts | CR structuré (faits / besoins / prochain pas), tâche de relance | transformation visite → devis |
| Tâche | pourquoi elle existe, source, retard, doublon | création / report internes | clôture furtive d'une tâche Tier |
| Opportunité (Brique 4) | historique **de ce besoin** | résumé, alerte visite sans prochain pas | changement d'étape engageant |
| Devis (Brique 5) | lignes, statut, écart vs dernière commande | relance, explication ; prix via le **moteur tarifaire** | recalcul de prix par le modèle, envoi client |
| Commande (Brique 5) | engagement, écart vs devis | relance interne | écriture ERP inventée |
| Référentiels / prix | diffs sourcés du run | carte « ça a bougé pour tes clients SKF » | activation de snapshot |
| Mail Outlook (futur) | fils **liés** à l'organisation / contact | brouillon de réponse, création d'activité, tâche | envoi, suppression, lecture de toute la boîte |
| Retranscription d'appel (futur) | extrait lié à l'activité | structuration du CR, prochain pas | fait commercial non dit dans l'audio |
| Ma journée (Brique 6) | fusion des cartes sourcées | priorisation explicable | score magique non sourcé |

Partout la même sortie : faits cités, absences, ambiguïtés, proposition ou « preuve insuffisante ».

## 12. Canaux futurs (Outlook, appels, visites) — règles dès maintenant

Ces briques n'existent pas. Le socle doit **réserver leur place** pour ne pas se faire exploser plus tard.

### Ingestion ≠ raisonnement

- Outlook, téléphonie, fichiers audio, PDF de visite : pipelines **déterministes** (sync, RLS, déduplication, rétention, lien à l'organisation / contact / activité).
- L'agent ne « lit pas Outlook ». Il reçoit un **extrait déjà lié et borné** dans `channels[]`.
- Une retranscription est une **source**, pas une vérité métier. Un chiffre entendu dans l'appel reste `ambiguous` jusqu'à un devis ou une commande.

### Classification avant assemblage

Mails et appels portent des données personnelles et parfois des secrets. Ils ne rejoignent le paquet que si la politique de la catégorie le permet (déjà dans l'archi §10.6 : minimisation, pas de ZDR global aveugle). Production = gate provider par catégorie.

### Pas de second cerveau

On n'ajoute pas un « agent mail » et un « agent visite ». On ajoute :

- des lectures typées (`listLinkedThreads`, `getTranscriptExcerpt`, `getVisitReport`) ;
- des propositions du même type (`create_activity_from_mail`, `draft_visit_report`) ;
- les mêmes états d'inbox et la même matrice d'autonomie.

Envoi de mail, écriture dans Outlook, ou création de devis restent **interdits** jusqu'à une décision PO distincte, après preuve des lectures.

### Ordre d'arrivée recommandé

```text
Socle AF (preuves + inbox + 1 vertical qui existe)
    → Activités / rapports de visite (objet déjà dans le modèle, saisie livrée)
    → Tiers / brief client (objets livrés, contrat IA aujourd'hui vide)
    → Brique 4 Opportunités puis Brique 5 Devis / commandes
    → Canaux (Outlook, appels) quand l'identité et l'activité savent accueillir le lien
    → Brique 6 Ma journée = fusion, pas un nouveau modèle
```

On n'attend pas Outlook pour poser le socle. On **interdit** de simuler un fil mail ou un devis tant que la brique n'existe pas.

## 13. Pourquoi ce socle est plus solide que SA-1…SA-8

| Plan actuel | Proposition |
| --- | --- |
| Commence par un dispatcher nommé | Commence par un contrat de faits et une preuve produit |
| Compare des primitives de framework (AI SDK, OTel, registry) | Mesure des phrases fausses et des doublons de tâche |
| Un tracer référentiels, puis « on verra » | Le même paquet sert clients, visites, devis, mails plus tard |
| Chat comme voie principale | Inbox + fiche + chat sur le même contrat |
| SQL retiré tard (SA-7) | Le nouvel agent ne l'a jamais ; l'ancien le perd après parité |
| Risque de tout précharger « pour le contexte » | Graphe composé, `missing` de premier ordre |

Le coût d'un extrait de registre plus tard (2ᵉ commande) est un déplacement d'imports. Le coût d'un dispatcher et d'un framework trop tôt est un second orchestrateur à côté de services qui marchent déjà.

---

## 14. Sources primaires

### Dépôt

- Plan et ADR : `docs/IA_AGENTIQUE/`
- Architecture : §§4.3, 5, 8.7, 10, 11.1–11.2, 13 Socle 1, journal 2026-08-13
- Assistant : `assistantTools.ts`, `assistantSqlTools.ts`, `assistantBroker.ts`, `mistralAdapter.ts`
- Diffs : `referenceDiffs.ts`, `referenceDiffAggregates.ts`, `shared/schemas/pricing/references.schema.ts`
- Tâches : `taskService.createTask`
- Réservations : `backend/drizzle/schema.ts` → `ai_request_reservations`
- tRPC : `pricing.references.diffs.*`, `tasks.create`, `ai.assistant.ask`
- Runtime : `backend/deno.json`

### Externes, vérifiées le 2026-08-14

- [Limites Supabase Edge Functions](https://supabase.com/docs/guides/functions/limits) — 150 s Free, 2 s CPU, 256 Mo, 20 Mo bundle
- [Planifier une Edge Function](https://supabase.com/docs/guides/functions/schedule-functions) — `pg_cron` + `pg_net` + Vault
- [Supabase Queues / pgmq](https://supabase.com/docs/guides/queues)
- [AI SDK 7 — tools et `toolApproval`](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)
- [AI SDK 7 — `Output.object`](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data)
- [AI SDK 7 — `WorkflowAgent`](https://ai-sdk.dev/docs/agents/workflow-agent) — lié au runtime Workflow Vercel
- [AI SDK 7 — télémétrie / `@ai-sdk/otel`](https://ai-sdk.dev/docs/ai-sdk-core/telemetry)
- [Provider registry](https://ai-sdk.dev/docs/reference/ai-sdk-core/provider-registry)
- [CompAI CRM — doctrine de preuve](https://github.com/trycompai/crm#what-this-is)
- [OWASP — excessive agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)

---

## 15. Décision demandée

Rien dans ce fichier n'ouvre AF-1 ni SA-1.

Options PO :

1. **Amender SA** selon §4 puis `GO SA-1` amendé.
2. **Adopter AF-0…AF-7** comme plan d'exécution successeur, puis `GO AF-1` après clôture AF-0.
3. **Rester en documentation** : corpus à jour, code inchangé.

Recommandation de l'audit : **option 2**, parce que le premier livrable utile est un paquet de faits + une synthèse `shadow`, pas un noyau de capacités.

Journal :

| Date | Décision ou preuve | Sortie |
| --- | --- | --- |
| 2026-08-14 | Audit contradictoire du plan SA et des ADR, recoupé au code et aux docs primaires. Proposition AF rédigée. | Présent document. Implémentation non commencée. |
