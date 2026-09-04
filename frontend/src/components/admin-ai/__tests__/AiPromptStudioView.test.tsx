import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiPromptStudioView } from '@/components/admin-ai/AiPromptStudioView';
import * as ai from '@/services/ai';

vi.mock('@/services/ai');

const templateId = '11111111-1111-4111-8111-111111111111';
const archivedTemplateId = '33333333-3333-4333-8333-333333333333';
const versionId = '22222222-2222-4222-8222-222222222222';

const renderView = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AiPromptStudioView />
    </QueryClientProvider>,
  );

describe('AiPromptStudioView', () => {
  beforeEach(() => {
    const version = {
      id: versionId,
      template_id: templateId,
      version: 1,
      status: 'draft' as const,
      body: 'Prompt initial {{var1}}',
      change_note: null,
      created_by: null,
      published_by: null,
      published_at: null,
      created_at: '2026-07-11T10:00:00Z',
    };
    vi.mocked(ai.listAiPrompts).mockResolvedValue({
      ok: true,
      prompts: [
        {
          id: templateId,
          feature: 'pricing.references.diagnose',
          label: 'Veille tarifaire',
          description: null,
          allowed_variables: ['var1'],
          archived_at: null,
          archived_by: null,
          created_at: '2026-07-11T10:00:00Z',
          updated_at: '2026-07-11T10:00:00Z',
          versions: [version],
          draft_version: version,
          published_version: null,
          usage: {
            calls: 12,
            successful_calls: 11,
            failed_calls: 1,
            calls_last_30_days: 4,
            total_tokens: 2500,
            cost_amount: 0.12,
            currency: 'USD',
            last_used_at: '2026-07-14T08:00:00Z',
          },
        },
        {
          id: archivedTemplateId,
          feature: 'assistant.referentiels',
          label: 'Chat historique',
          description: null,
          allowed_variables: [],
          archived_at: '2026-07-14T09:00:00Z',
          archived_by: null,
          created_at: '2026-07-11T10:00:00Z',
          updated_at: '2026-07-14T09:00:00Z',
          versions: [],
          draft_version: null,
          published_version: null,
          usage: {
            calls: 0,
            successful_calls: 0,
            failed_calls: 0,
            calls_last_30_days: 0,
            total_tokens: 0,
            cost_amount: 0,
            currency: 'USD',
            last_used_at: null,
          },
        },
      ],
    });
    vi.mocked(ai.saveAiPromptDraft).mockResolvedValue({ ok: true, version });
    vi.mocked(ai.deleteAiPromptTemplate).mockResolvedValue({
      ok: true,
      deleted_id: archivedTemplateId,
    });
  });

  it('affiche les libellés de surface corrigés et la ligne de totaux', async () => {
    renderView();

    expect(await screen.findByText('Veille tarifaire')).toBeInTheDocument();
    expect(
      screen.getByText(/Veille des référentiels · Synthèse sourcée d’un run de diff tarifaire/),
    ).toBeInTheDocument();

    const totals = screen.getByTestId('prompt-studio-totals');
    expect(totals).toHaveTextContent('2 templates');
    expect(totals).toHaveTextContent('1 disponible');
    expect(totals).toHaveTextContent('1 archivé');
    expect(totals).toHaveTextContent('12 appels (4 sur 30j)');
  });

  it('affiche le badge Utilisé uniquement si calls_last_30_days > 0', async () => {
    renderView();

    await screen.findByText('Veille tarifaire');
    expect(screen.getByText('Utilisé')).toBeInTheDocument();
  });

  it('filtre par disponibilité et recherche', async () => {
    const user = userEvent.setup();
    renderView();

    await screen.findByText('Veille tarifaire');
    expect(screen.queryByText('Chat historique')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Archivés' }));
    expect(screen.getByText('Chat historique')).toBeInTheDocument();
    expect(screen.queryByText('Veille tarifaire')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tous' }));
    expect(screen.getByText('Veille tarifaire')).toBeInTheDocument();
    expect(screen.getByText('Chat historique')).toBeInTheDocument();

    const searchInput = screen.getByLabelText('Rechercher un template');
    await user.type(searchInput, 'tarifaire');
    expect(screen.getByText('Veille tarifaire')).toBeInTheDocument();
    expect(screen.queryByText('Chat historique')).not.toBeInTheDocument();
  });

  it('ouvre l’éditeur de prompt lors du clic sur une ligne', async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(await screen.findByText('Veille tarifaire'));
    expect(await screen.findByRole('textbox', { name: /Corps du prompt système/ })).toBeInTheDocument();
  });

  it('supprime définitivement un template archivé sans usage après confirmation', async () => {
    const user = userEvent.setup();
    renderView();

    await screen.findByText('Veille tarifaire');
    await user.click(screen.getByRole('button', { name: 'Archivés' }));
    await user.click(screen.getByRole('button', { name: 'Actions pour Chat historique' }));
    await user.click(screen.getByRole('menuitem', { name: 'Supprimer définitivement' }));
    await user.click(screen.getByRole('button', { name: 'Supprimer définitivement' }));

    expect(ai.deleteAiPromptTemplate).toHaveBeenCalledWith(
      { template_id: archivedTemplateId },
      expect.anything(),
    );
  });

  it('enregistre un brouillon sur un dialog ouvert et active la publication sans fermer ni remonter le composant', async () => {
    const user = userEvent.setup();
    const publishedVersion = {
      id: versionId,
      template_id: templateId,
      version: 1,
      status: 'published' as const,
      body: 'Prompt initial {{var1}}',
      change_note: 'Version 1 initiale',
      created_by: null,
      published_by: null,
      published_at: '2026-07-11T10:00:00Z',
      created_at: '2026-07-11T10:00:00Z',
    };

    const draftVersion = {
      id: '22222222-2222-4222-8222-333333333333',
      template_id: templateId,
      version: 2,
      status: 'draft' as const,
      body: 'Prompt initial {{var1}} avec ajout',
      change_note: null,
      created_by: null,
      published_by: null,
      published_at: null,
      created_at: '2026-07-15T12:00:00Z',
    };

    const templateBefore = {
      id: templateId,
      feature: 'pricing.references.diagnose' as const,
      label: 'Veille tarifaire',
      description: null,
      allowed_variables: ['var1'],
      archived_at: null,
      archived_by: null,
      created_at: '2026-07-11T10:00:00Z',
      updated_at: '2026-07-11T10:00:00Z',
      versions: [publishedVersion],
      draft_version: null,
      published_version: publishedVersion,
      usage: {
        calls: 12,
        successful_calls: 11,
        failed_calls: 1,
        calls_last_30_days: 4,
        total_tokens: 2500,
        cost_amount: 0.12,
        currency: 'USD' as const,
        last_used_at: '2026-07-14T08:00:00Z',
      },
    };

    const templateAfter = {
      ...templateBefore,
      versions: [draftVersion, publishedVersion],
      draft_version: draftVersion,
    };

    vi.mocked(ai.listAiPrompts)
      .mockResolvedValueOnce({
        ok: true,
        prompts: [templateBefore],
      })
      .mockResolvedValueOnce({
        ok: true,
        prompts: [templateAfter],
      });

    vi.mocked(ai.saveAiPromptDraft).mockResolvedValueOnce({
      ok: true,
      version: draftVersion,
    });

    renderView();

    await user.click(await screen.findByText('Veille tarifaire'));

    // Avant enregistrement : le bouton Publier est désactivé et aucun badge Brouillon
    const publishButton = screen.getByRole('button', { name: 'Publier le brouillon' });
    expect(publishButton).toBeDisabled();
    expect(screen.queryByText(/Brouillon v2/)).not.toBeInTheDocument();

    // Modification du texte
    const textarea = screen.getByRole('textbox', { name: /Corps du prompt système/ });
    await user.type(textarea, ' avec ajout');

    const saveButton = screen.getByRole('button', { name: 'Enregistrer le brouillon' });
    expect(saveButton).toBeEnabled();

    // Enregistrement du brouillon
    await user.click(saveButton);

    expect(ai.saveAiPromptDraft).toHaveBeenCalledWith(
      {
        template_id: templateId,
        body: 'Prompt initial {{var1}} avec ajout',
        change_note: null,
      },
      expect.anything(),
    );

    // SANS fermeture du Dialog (sans démontage) : "Publier le brouillon" devient actif et le badge s'affiche
    expect(await screen.findByRole('button', { name: 'Publier le brouillon' })).toBeEnabled();
    expect(screen.getByText('Brouillon v2')).toBeInTheDocument();
  });

  it('met à jour l’historique des versions avec le nouveau brouillon après enregistrement sans fermeture', async () => {
    const user = userEvent.setup();
    const v1 = {
      id: 'v1-id',
      template_id: templateId,
      version: 1,
      status: 'published' as const,
      body: 'Prompt v1',
      change_note: 'Version 1 initiale',
      created_by: null,
      published_by: null,
      published_at: '2026-07-11T10:00:00Z',
      created_at: '2026-07-11T10:00:00Z',
    };

    const v2Draft = {
      id: 'v2-draft-id',
      template_id: templateId,
      version: 2,
      status: 'draft' as const,
      body: 'Prompt v2 rédigé',
      change_note: 'Ajustement v2 spécifique',
      created_by: null,
      published_by: null,
      published_at: null,
      created_at: '2026-07-15T12:00:00Z',
    };

    const promptBefore = {
      id: templateId,
      feature: 'pricing.references.diagnose' as const,
      label: 'Veille tarifaire',
      description: null,
      allowed_variables: ['var1'],
      archived_at: null,
      archived_by: null,
      created_at: '2026-07-11T10:00:00Z',
      updated_at: '2026-07-11T10:00:00Z',
      versions: [v1],
      draft_version: null,
      published_version: v1,
      usage: {
        calls: 5,
        successful_calls: 5,
        failed_calls: 0,
        calls_last_30_days: 2,
        total_tokens: 1000,
        cost_amount: 0.05,
        currency: 'USD' as const,
        last_used_at: '2026-07-14T08:00:00Z',
      },
    };

    const promptAfter = {
      ...promptBefore,
      versions: [v2Draft, v1],
      draft_version: v2Draft,
    };

    vi.mocked(ai.listAiPrompts)
      .mockResolvedValueOnce({ ok: true, prompts: [promptBefore] })
      .mockResolvedValueOnce({ ok: true, prompts: [promptAfter] });

    vi.mocked(ai.saveAiPromptDraft).mockResolvedValueOnce({ ok: true, version: v2Draft });

    renderView();

    await user.click(await screen.findByText('Veille tarifaire'));

    // Au départ, seul Version 1 apparaît dans l'historique
    expect(screen.getByText('Version 1')).toBeInTheDocument();
    expect(screen.queryByText('Version 2')).not.toBeInTheDocument();

    const textarea = screen.getByRole('textbox', { name: /Corps du prompt système/ });
    await user.clear(textarea);
    await user.type(textarea, 'Prompt v2 rédigé');

    const noteInput = screen.getByPlaceholderText('Expliquer précisément la modification');
    await user.type(noteInput, 'Ajustement v2 spécifique');

    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));

    // Après enregistrement, l'historique affiche la nouvelle version 2 avec sa note de changement
    expect(await screen.findByText('Version 2')).toBeInTheDocument();
    expect(screen.getByText('Ajustement v2 spécifique')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publier le brouillon' })).toBeEnabled();
  });
});
