# Écarts avec l'existant, réutilisable, questions ouvertes

**À lire avant d'écrire la moindre ligne de code.** Plusieurs faits du parcours cible
n'ont aujourd'hui **aucun endroit où aller** dans les contrats partagés.

Statut après décision PO du 05/08/2026 : **C7-1 terminé ; GO C7-2 modèle conceptuel
uniquement ; NO-GO design, prototype, contrat et implémentation**. Les écarts
ci-dessous ne justifient pas encore de modifier le backend : ils servent d'abord à séparer
les objets et responsabilités de C7, C8, C9, C11 et C13.

Les constats de ce document ont été vérifiés le 04/08/2026 par lecture directe de
`shared/schemas/configurator/motor.schema.ts` (1 310 lignes) et
`shared/schemas/configurator/common.schema.ts` (138 lignes), pas déduits du plan.

---

## 1. Ce que le contrat accepte aujourd'hui

`motorEquivalentFromSpecInputSchema` — la route utilisée par le parcours :

```
schema_version: 1
snapshot_id?          (résolu côté backend, ne pas envoyer)
mounting              'B3' | 'B5' | 'B14' | 'B34' | 'B35'
electrical            puissance, vitesse, pôles, réseau, fréquence, mode d'alimentation,
                      tension, couplage, courant, couple, classe IE
mechanical            A B C H K · D E F · M N P S T Z  (+ S_thread, bore_type, clearances)
application?          ip_rating, brake_required, vfd_required, cooling_method,
                      duty_service, ambient_temperature, starts_per_hour
tolerances_mm?
cursor?, limit, sort
```

Trois champs sont **obligatoires pour lancer une recherche** :
`electrical.power_kw`, `electrical.frequency_hz`, `electrical.supply_mode`.

Chaque fait porte `origin` + `confirmation` + `evidence` :

| Enum | Valeurs actuelles |
| --- | --- |
| `origin` | `nameplate` · `user_measurement` · `catalog` · `statistical_suggestion` · `calculation` |
| `confirmation` | `unconfirmed` · `confirmed` |
| `evidence.kind` | `source_page` · `measurement` · `sample` · `rule` |

**Bonne nouvelle** : `motorMountingSchema` contient déjà les cinq fixations du parcours cible
(B3, B5, B14, B34, B35). Aucun changement nécessaire de ce côté.

---

## 2. Écarts constatés

### 2.1 La photo n'a nulle part où aller — écart conditionnel, pas blocage du parcours nominal

`evidence.kind` est une union discriminée fermée de quatre variantes, dont **aucune ne
représente une photo client**. `origin` ne distingue pas non plus une valeur lue sur photo
d'une valeur dictée : les deux tomberaient sur `nameplate`.

Conséquence : lorsqu'une photo est demandée au point de blocage ou pour confirmation finale,
le canal « lu sur photo » n'est pas exprimable dans le contrat actuel. La photo n'étant plus
obligatoire en ouverture, cet écart ne bloque pas le chemin nominal sans photo.

Le modèle doit distinguer deux axes :

| Axe | Exemples | Rôle |
| --- | --- | --- |
| **Source sémantique** | plaque, mesure terrain, catalogue, règle | Ce que représente le fait |
| **Canal de preuve** | photo, déclaration téléphonique, mesure, page catalogue | Comment le fait est soutenu |

Direction à étudier en C7-2/C7-7 : conserver `origin: 'nameplate'` pour une valeur de plaque
et représenter séparément que le TCS l'a lue sur une photo reçue par email ou l'a entendue
dans une déclaration. La photo n'est jamais téléversée ni rattachée au configurateur ; seul
le canal de preuve du fait est conservé. Ajouter `nameplate_photo` à `origin` mélangerait la
source et le canal.

### 2.2 Faits du parcours sans champ contractuel

| Fait du parcours cible | Existe ? | Où il devrait aller |
| --- | --- | --- |
| **Position IM** (B3, B6, B7, B8, V1, V3, V5, V6, V15, V18, V19, V36…) | **Non** | Nouveau champ ; `mounting` ne porte que la construction, pas l'orientation |
| **Effort axial et organe qui le reprend** | **Non** | C11 : sens, valeur, machine ou roulements moteur ; nécessaire au contrôle vertical |
| **Machine entraînée + fonction réelle** | **Non** | Obligatoire avant solution techniquement validée ; `application` ne contient que des exigences, pas ce que fait le moteur |
| **Type d'accouplement** (8 types) | **Non** | Nouveau champ — c'est l'entrée des règles R1/R2 |
| **Besoin constant ou variable** | **Non** | C11 ; nécessaire à la détection d'opportunité énergétique |
| **Mode de régulation actuel** | **Non** | C11 : variateur, vanne/registre, bypass, marche/arrêt ou autre |
| **Alerte roulement à vérifier** | **Non** | Éventuelle sortie explicable, seulement si C7-6 valide son périmètre ; aucune prescription automatique n'est acquise |
| Codeur / tachy | **Non** | Extension de `application` |
| 2ᵉ bout d'arbre | **Non** | Extension de `application` |
| Qualification ATEX | **Non** | Objet/branche dédiée : marquage complet, zone site, matière, certificat et qualification spécialisée |
| Position de boîte à bornes | **Non** | Extension de `application` |
| Sens de rotation imposé | **Non** | Extension de `application` |
| Sondes CTP / PT100 | **Non** | Extension de `application` |
| Réchauffage anticondensation | **Non** | Extension de `application` |
| Capot pare-pluie / anti-pluie | **Non** | Extension environnement/options ; présence et compatibilité à confirmer |
| Deux vitesses (Dahlander) | **Non** | Extension de `application` ou `electrical` |
| Distance câble variateur | **Non** | Extension de `application` |
| Profil d'usage (h/an) | **Partiellement** | `energy.compute` a son propre profil ; pas dans le spec de recherche |
| Frein | **Oui** | `application.brake_required` |
| Ventilation forcée | **Oui, indirectement** | `application.cooling_method` |
| IP | **Oui** | `application.ip_rating` |
| Ta > 40 °C | **Oui** | `application.ambient_temperature` |
| Service intermittent | **Oui** | `application.duty_service` |
| Variateur obligatoire | **Oui** | `application.vfd_required` |

La disponibilité, le délai et la référence vendable ne figurent pas dans le catalogue
technique C3 et restent entièrement hors du modèle de décision C7. Une éventuelle source
commerciale extérieure ne peut devenir ni un fait technique ni une preuve de compatibilité.

`motorFactPathSchema` est également une **enum fermée** : tout nouveau fait doit y être
ajouté pour être citable dans `used_facts` et `applied_rules`.

### 2.3 Les règles de déduction n'ont pas de statut

Les 11 règles de `03-regles-metier-et-calculs.md` sont aujourd'hui écrites dans le prototype,
en JavaScript, côté client. Ce n'est pas tenable :

- le dépôt impose que les règles de compatibilité soient **immuables et versionnées**
  (`motor.compatibility.cir`, version 1, cf. C3-1 à C3-6) ;
- une règle affichée au client dans un rapport doit être **traçable** ;
- le frontend ne doit pas être la source de vérité d'une décision technique.

Recommandation : les implémenter comme un **service backend pur** dans
`backend/functions/api/services/configurator/`, sur le modèle de
`motorMechanicalCompatibility.ts` et `motorElectricalApplicationCompatibility.ts` — déterministe,
sans SQL, testé unitairement, produisant des exigences sourcées avec `evidence.kind = 'rule'`.

Une nouvelle version de ruleset sera nécessaire (`ruleset_version: 2`), les schémas figeant
aujourd'hui la version 1 par `z.literal`.

Après audit, cette version 2 n'est **pas encore acquise**. Les anciennes R1–R11 sont des
hypothèses : C7 peut collecter application, transmission et environnement, mais les
prescriptions liées au process relèvent d'une validation métier C11. C7-6 doit distinguer
les alertes (« charge radiale à vérifier ») des prescriptions (« type de roulement requis »).

### 2.4 La simulation d'un moteur terrain n'est pas couverte

`motorEnergyComputeInputSchema` exige un `candidate_operating_point_id` et accepte un
`reference_operating_point_id` catalogue facultatif. Il n'accepte pas une référence terrain
construite depuis une plaque, un rendement déclaré et un profil d'usage.

Conséquences :

- `energy.compute` peut calculer un candidat catalogue, pas établir seul la consommation
  de l'ancien moteur hors catalogue ;
- le prototype calcule cette référence côté client et utilise une efficacité candidat de
  démonstration, ce qui ne peut pas devenir une règle frontend ;
- les kWh, euros, bornes, profils et scénarios terrain relèvent de C13 ;
- le PDF et son identité relèvent de C9.

La phrase « aucun changement backend nécessaire pour le rapport énergétique » est donc
fausse. Le flux nominal de recherche C7 reste réutilisable ; la vision énergétique attend C13.

---

## 3. Ce qui est réutilisable tel quel

La refonte est **une recomposition, pas une reconstruction**. Existant à conserver :

### Frontend

| Fichier | Usage dans le parcours cible |
| --- | --- |
| `components/configurator/MotorSchematic.tsx` | Schémas cotés avec surlignage — base des visuels de cotes |
| `components/configurator/MotorVisualExplorer.tsx` | Vue réaliste quatre angles |
| `components/configurator/motorMountingDimensions.ts` | Cotes par montage, `polesFromPlateSpeed`, `synchronousSpeedRpm` |
| `components/configurator/buildMotorSpecFromNameplate.ts` | Construction du payload depuis le relevé — à étendre |
| `components/configurator/VerdictBadge.tsx`, `VerdictMosaic.tsx`, `CriteriaTable.tsx` | Briques de verdict réutilisables ; la composition doit distinguer recherche préliminaire, candidat technique et solution techniquement validée |
| `components/configurator/EvidenceDialog.tsx`, `EvidenceList.tsx`, `ProvenanceChip.tsx` | Preuves et provenance |
| `components/configurator/MissingFactsPanel.tsx`, `RemainingQuestionsPanel.tsx` | Faits manquants |
| `components/configurator/ConfiguratorPageShell.tsx` | Coquille, fil d'Ariane |
| `hooks/configurator/useMotorEquivalents.ts` | Appel tRPC + seuil d'attente longue |
| États C5 | Chargement, attente longue réelle, vide, partiel, erreur, conflit de snapshot |

### Backend — réutilisable pour la recherche nominale C7

Les sept routes tRPC de C3-7 sont en place et déployées (`api` v199) :
`catalog.list/get`, `equivalents.fromMotor/fromSpec`, `advice.build`, `energy.compute`, `compare`.

`energy.compute` et les données chargées restent réutilisables pour comparer des points de
fonctionnement catalogue dans leur contrat actuel. Ils ne remplacent pas le modèle de
référence terrain C13.

### Décisions d'implémentation à reprendre en C7-7/C7-8

| Fichier | Hypothèse actuelle |
| --- | --- |
| `components/configurator/MotorReferencePicker.tsx` | Ne doit pas redevenir l'entrée principale ; réutilisation éventuelle à décider |
| `MotorNameplateForm.tsx` (forme actuelle) | Sa composition dense est rejetée ; ses fonctions peuvent rester réutilisables |
| `MotorReplacementPage.tsx` (forme actuelle) | Sa surface doit être recomposée après validation du breadboard |

Attention : `equivalents.fromMotor` reste une route backend valide et testée — c'est
**l'entrée UI** qui disparaît, pas la procédure.

---

## 4. Questions ouvertes — décisions PO nécessaires

| # | Question | Impact si non tranchée |
| --- | --- | --- |
| 1 | **Modèle source/canal de preuve** : `origin=nameplate` + preuves photo/déclaration, à confirmer | Bloque le modèle de provenance du tour 6 |
| 2 | **Reprise après photo reçue par email** : revenir à la question interrompue et consigner le canal sans téléverser la photo | Ne bloque pas le chemin sans photo ; à structurer en C7-3 et à éprouver en C7-5 |
| 3 | **Taxonomie d'applications** : les 8 familles / 28 cas disposent d'une matrice de questions de co-conception, mais leurs libellés, contrôles et limites restent à valider avec les experts CIR | L'application et sa fonction sont obligatoires avant solution techniquement validée |
| 4 | **Alertes vs prescriptions** : valider ce que C7 peut signaler et ce qui attend C11 ; ruleset v2 non acquis | Bloque toute recommandation technique nouvelle |
| 5 | **Profondeur du remplacement** : ordre adaptatif, risques et informations manquantes | P > 11 kW déclenche seulement l'invitation énergétique ; il ne rend pas les questions avancées obligatoires |
| 6 | **Listes de valeurs des détails d'options** : tensions de frein usuelles, types de sondes, zones ATEX — à confirmer métier | Choix fermés potentiellement incomplets |
| 7 | **Rapport client** : dossier C8, gabarit/PDF C9 et simulation C13 ; définir seulement la continuité future en C7 | Livrable volontairement hors C7 |
| 8 | **Mode expert** : garder en plus un formulaire dense pour les TCS aguerris ? GOV.UK documente la fatigue du clic-par-question chez les utilisateurs fréquents | Décision d'architecture d'écran |
| 9 | **ATEX — décision de parcours** : sortie du remplacement standard, relevé conservé et qualification spécialisée requise ; aucune validation standard sans qualification ATEX fondée | Reste à définir le contrat, les rôles de validation et les pièces exigées |
| 10 | **Granularité énergie C13** : profil de charge, besoin variable, régulation existante, mesures, tarif et investissement | Requis pour comparer loyalement moteur, variateur et évolution de process |
| 11 | **Compteur de candidats restants** pendant le relevé : très motivant, mais exigerait une route backend de dénombrement rapide | Fonctionnalité optionnelle |
| 12 | **Reconnaissance automatique de plaque par IA** sur la photo — tentante, mais le happy path doit être livré d'abord | Hors périmètre proposé |

---

## 5. Gates de reprise C7

La reprise n'est plus organisée en lots de code tant que le parcours n'est pas fondé.

| Gate | Contenu | Décision de sortie |
| --- | --- | --- |
| **C7-0 — recadrage** | Statuts corrigés, prototype reclassé, frontières C7/C8/C9/C11/C13 | Terminé ; GO découverte uniquement |
| **C7-1 — découverte du parcours** | Cinq scénarios joués par le PO en posture de TCS ; questions naturelles, oublis et besoins d'assistance consolidés | Terminé le 05/08/2026 ; GO modèle conceptuel C7-2 uniquement |
| **C7-2 — modèle conceptuel** | Moteur installé, application/fonction, fait/source/preuve, candidat technique, réserve et quatre niveaux de qualification technique | GO flux si objets et vocabulaire validés |
| **C7-3 — structure** | Flux nominal sans photo, assistance photo conditionnelle, reprise, cas sensible et arrêt expert | GO prototype si embranchements compréhensibles |
| **C7-4 — prototype** | Basse fidélité d'abord, puis visuels fonctionnels spécialisés | GO test utilisateur, jamais GO code direct |
| **C7-5 — recette PO du parcours** | Scénarios rejoués sur le parcours testable, corrections, reprise après interruption, clavier et accessibilité conceptuelle | GO règles/contrats ou retour C7-3 |
| **C7-6 — expertise métier** | Taxonomies et alertes validées ; prescriptions C11 séparées | GO ruleset seulement si nécessaire |
| **C7-7 — contrats** | Extensions minimales de provenance et faits, stratégie C8 compatible | GO implémentation explicite |
| **C7-8 — implémentation** | Frontend/backend autorisés, sans C9/C11/C13 implicites | GO recette |
| **C7-9 — recette** | QA, parcours réels, erreurs, responsive et preuves runtime | Décision de sortie C7 |

La prochaine action autorisée est **C7-2 modèle conceptuel uniquement**. Aucun design,
prototype, composant de production, contrat partagé, ruleset, téléversement photo, rapport
ou calcul énergétique n'est autorisé par cette décision.

---

## 6. Rappels de conformité dépôt

Extraits d'`AGENTS.md` qui s'appliquent directement à ce chantier :

- **Zod** : source unique dans `shared/schemas`, payloads API en `.strict()`, `safeParse` aux
  frontières, messages de validation en français.
- **Erreurs** : `createAppError()` / mappers / `reportError()` / `notifyError()`. Pas de
  `throw new Error()`, `console.error()` ou `toast.error()` directs.
- **Zéro donnée mockée** dans le code livré. Le prototype de ce dossier est une maquette,
  pas une source à copier.
- **Design** : thème clair unique, plancher typographique 11 px, dialogs centrés — jamais de
  sheets latérales, tokens de `frontend/src/index.css`.
- **Skills obligatoires** avant d'écrire du code : `cir-cockpit-design`, `cir-cockpit-api-contracts`,
  `vercel-react-best-practices`, `vitest`, `cir-error-handling` selon le lot.
- **QA par impact** : `qa:front` pour un lot frontend, `qa` complet avant livraison/PR/deploy.
- **Plan** : `docs/CONFIGURATEURS/plan-execution.md` est le point d'entrée obligatoire ;
  cocher une case exige une preuve nommée, et chaque changement de statut ajoute une ligne
  au changelog.
- **Migrations Supabase** : convention MCP-first, `apply_migration` après autorisation PO
  explicite, puis reprise du SQL distant dans `backend/migrations/`.
