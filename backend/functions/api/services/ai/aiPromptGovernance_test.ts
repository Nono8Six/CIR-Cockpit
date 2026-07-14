import { assertEquals } from 'std/assert';

import { getPromptTemplateDeletionConflict } from './aiGovernance.ts';

Deno.test('un template actif ou utilise conserve son historique', () => {
  assertEquals(
    getPromptTemplateDeletionConflict(
      { feature: 'pricing.references.diagnose', archived_at: null },
      0
    ),
    'Archivez le template avant de le supprimer.'
  );
  assertEquals(
    getPromptTemplateDeletionConflict(
      {
        feature: 'pricing.references.diagnose.classification',
        archived_at: '2026-07-14T10:00:00Z'
      },
      3
    ),
    'Ce template possede un historique d utilisation et ne peut pas etre supprime definitivement.'
  );
});

Deno.test('seul un template non protege archive et jamais utilise est supprimable', () => {
  assertEquals(
    getPromptTemplateDeletionConflict(
      { feature: 'assistant.referentiels', archived_at: '2026-07-14T10:00:00Z' },
      0
    ),
    'Le template de l assistant actif ne peut pas etre supprime.'
  );
  assertEquals(
    getPromptTemplateDeletionConflict(
      { feature: 'pricing.references.diagnose', archived_at: '2026-07-14T10:00:00Z' },
      0
    ),
    null
  );
});
