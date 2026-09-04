# Méthodologie, preuves et limites

## 1. Principe

L’audit part de l’état réel du 4 septembre 2026. Les documents canoniques donnent l’intention ; le code, les processus, le navigateur et Supabase donnent l’état courant. Lorsqu’ils divergent, le dossier décrit la divergence au lieu de choisir silencieusement un récit.

L’analyse fichier par fichier signifie ici qu’aucun fichier suivi n’est absent de l’inventaire et que chacun a reçu au minimum une classification, une vérification structurelle et un verdict. Elle ne signifie pas qu’un lockfile généré, une image PNG, un classeur métier ou 143 migrations immuables doivent être « refactorés » ligne par ligne.

## 2. Sources de preuve

### 2.1 Dépôt

- inventaire Git complet : 1 273 fichiers suivis ;
- statut, branche, commit et historique récent ;
- graphe d’import couvrant 1 041 fichiers TypeScript/TSX et 7 sources/configurations JS, MJS ou CSS, références entrantes, exports et symboles ;
- tailles et fichiers volumineux ;
- empreintes de contenu pour les doublons exacts ;
- scans de code mort, `TODO`, suppressions TypeScript, styles hors tokens, éléments natifs et littéraux UI ;
- lecture sémantique approfondie des frontières auth, données, IA, imports, tâches, annuaires, shell, Pilotage, Référentiels, Paramètres et Administration ;
- revue des migrations sans les modifier, conformément à leur immutabilité.

### 2.2 Validations locales en lecture seule

- contrat tRPC généré : 91 procédures, projection à jour ;
- `repo:check:local` : vert ;
- backend : typecheck vert, 47 fichiers / 342 tests verts ;
- frontend : lint vert, typecheck vert, 170 fichiers / 829 tests verts ;
- audit des dépendances : exécuté séparément pour identifier les avis frontend et backend ;
- aucun E2E métier rejoué : plusieurs scénarios créent, éditent ou suppriment des données distantes.

Un test vert prouve le contrat couvert par ce test. Il ne prouve ni la sécurité du compte de service Windows, ni l’usage réel d’une route distante, ni la vérité d’un écran sur un volume supérieur au jeu courant.

### 2.3 Runtime local

- services Windows `CIR-Cockpit-API` et `CIR-Cockpit` observés en cours d’exécution, démarrage automatique, compte `LocalSystem` ;
- l’API chargeait `backend/src/index.ts` via `tsx` et le frontend chargeait Vite depuis `frontend/node_modules`, dans les deux cas depuis le checkout ;
- ACL de `backend/`, `frontend/`, de leurs fichiers `.env` et des deux descripteurs Servy inspectées sans lire ni exposer les valeurs sensibles ;
- le PO a ensuite confirmé que ces services sont des lanceurs de développement locaux, hors stack finale, et a accepté ce risque hors roadmap produit le 4 septembre 2026 ;
- `/health`, préflight CORS et erreur tRPC non authentifiée sondés ;
- application locale parcourue en session `super_admin`, sans action d’écriture ;
- vues Saisie, Pilotage, Tâches, Clients et Paramètres examinées par DOM/accessibilité et rendu ;
- viewport bureau et mobile contrôlés, puis restaurés.

### 2.4 Supabase distant

- migrations, tables, RLS, advisors sécurité/performance, rôles et Edge Functions lus via le connecteur du projet ;
- contenu de l’Edge `api` consulté en lecture seule ;
- logs des dernières 24 heures agrégés pour distinguer une archive d’un runtime encore utilisé ;
- aucune requête DDL/DML, migration, configuration ou publication distante.

Les données de trafic et compteurs distants sont un instantané daté. Ils prouvent l’activité récente, pas l’identité de chaque consommateur ni sa pérennité.

### 2.5 Références externes actuelles

- [Supabase — rôles PostgreSQL](https://supabase.com/docs/guides/database/postgres/roles), notamment le caractère privilégié des rôles d’administration et le contournement RLS ;
- [Supabase — sécurité des mots de passe](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) ;
- [GitHub Advisory — fflate / ZIP64](https://github.com/advisories/GHSA-px8p-9vwx-vf98) ;
- [Vercel Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md), utilisées comme contrôle secondaire actuel d’accessibilité et de comportement ;
- `PRODUCT.md` et `DESIGN.md` restent prioritaires pour les décisions propres à CIR Cockpit.

## 3. Statuts de preuve

| Statut | Signification |
| --- | --- |
| `CONFIRMÉ — code` | le comportement ou l’écart découle directement du chemin exécuté |
| `CONFIRMÉ — runtime` | le comportement a été observé sans mutation |
| `CONFIRMÉ — distant` | l’état a été lu sur le projet Supabase lié |
| `À MESURER` | la décision dépend d’un volume, d’un plan SQL ou d’une fenêtre de statistiques |
| `À VALIDER` | une décision PO ou une recette volontaire est requise ; l’audit ne la tranche pas |

## 4. Limites assumées

- Un seul rôle a été parcouru dans le navigateur : `super_admin`.
- Les conséquences d’une mutation inter-agence, d’un raccourci caché, d’une suppression utilisateur et d’un changement d’agence avec brouillon n’ont pas été déclenchées.
- Aucun test de charge à 12 000 tiers, plus de 200 activités ou gros classeur réel n’a été lancé.
- Aucun lecteur d’écran NVDA, navigateur Safari, appareil tactile ou connexion dégradée n’a été utilisé.
- Les classeurs et images ont été inventoriés comme sources/artefacts, comparés structurellement et par empreinte ; leur validité métier détaillée relève d’un audit de données distinct.
- Les neuf preuves E2E historiques ont été classées comme historiques, jamais comme preuve actuelle.
- Les avis « index inutilisé » ne sont pas transformés en suppressions sans `pg_stat` et `EXPLAIN` représentatifs.

## 5. Règles de restitution

- Toute recommandation de suppression est une candidature, sauf lorsqu’un graphe de dépendances, une recherche de symboles et les tests convergent.
- Une migration appliquée est conservée, même si son commentaire est périmé.
- Les fichiers générés sont régénérés par leur outil canonique, jamais nettoyés à la main.
- Une refonte proposée doit remplacer une responsabilité ambiguë ; elle ne doit pas ajouter une couche parallèle.
- Les corrections peuvent être réalisées par lots séparés. Ce dossier n’autorise aucune étape suivante par lui-même.
