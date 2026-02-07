<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# CIR Cockpit

App multi-agence pour TCS et admins, avec backend Supabase et audit.

## Lancer en local
**Prérequis :** Node.js

1. Aller dans le frontend :
   `cd frontend`
2. Installer les dépendances :
   `npm install`
3. Définir les variables dans `frontend/.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
4. Lancer l'app :
   `npm run dev`

## Supabase backend

- Migrations : `backend/migrations`
- Edge Functions : `backend/functions`
- Docs : `docs/supabase.md`, `docs/supabase_bootstrap.md`

## Sécurité (règles clés)
- Pas de localStorage : données 100% Supabase
- Aucune donnée mockée/hardcodée
- Création de compte par admin uniquement (pas d'inscription publique)
