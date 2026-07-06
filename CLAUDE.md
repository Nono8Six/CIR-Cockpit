# CLAUDE.md

@AGENTS.md

## Claude Code

- `AGENTS.md` est la source partagee des regles projet. Ne pas dupliquer ces regles ici.
- Utiliser ce fichier uniquement pour les particularites Claude Code.
- Garder ce fichier court: les procedures longues doivent rester dans les docs ciblees ou les skills.
- Si une instruction semble contradictoire, suivre la plus specifique et signaler l'ecart.
- Skills projet: source unique dans `.agents/skills/`; `.claude/skills/` ne contient que des jonctions Windows vers ces dossiers. Tout nouveau skill repo doit recevoir sa jonction, sinon Claude Code ne le charge pas.
